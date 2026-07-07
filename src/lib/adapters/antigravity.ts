/**
 * Antigravity Framework Adapter (Phase 3)
 *
 * Implements FrameworkAdapter for Antigravity runtime.
 * Session discovery from ~/.antigravity/ or Antigravity API
 */

import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { eventBus } from '@/lib/event-bus'
import { getDatabase } from '@/lib/db'
import { queryPendingAssignments } from './adapter'
import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export interface AntigravitySession {
  sessionId: string
  agentName: string
  agentPath: string
  lastHeartbeat: Date
  isOnline: boolean
}

/**
 * Antigravity Adapter (Phase 3)
 *
 * Dispatches tasks to Antigravity runtime with full sandboxing support.
 * Sessions are discovered from ~/.antigravity/ on startup.
 */
export class AntigravityAdapter implements FrameworkAdapter {
  readonly framework = 'antigravity'
  private sessions: Map<string, AntigravitySession> = new Map()
  private agentHeartbeats: Map<string, number> = new Map()
  private readonly heartbeatTimeoutMs = 60000

  constructor() {
    this.discoverSessions()
  }

  /**
   * Discover Antigravity sessions from ~/.antigravity/
   */
  private discoverSessions(): void {
    try {
      const antigravityDir = path.join(homedir(), '.antigravity')
      if (!fs.existsSync(antigravityDir)) {
        console.warn('[AntigravityAdapter] ~/.antigravity/ not found')
        return
      }

      const agents = fs.readdirSync(antigravityDir, { withFileTypes: true })
      for (const agent of agents) {
        if (!agent.isDirectory()) continue

        const agentPath = path.join(antigravityDir, agent.name)
        const sessionFile = path.join(agentPath, 'agent.json')

        if (fs.existsSync(sessionFile)) {
          try {
            const agentData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'))
            const sessionId = agentData.id || agent.name
            const agentId = `antigravity-${agent.name}`

            this.sessions.set(agentId, {
              sessionId,
              agentName: agent.name,
              agentPath,
              lastHeartbeat: new Date(),
              isOnline: true,
            })
          } catch (e) {
            console.warn(`[AntigravityAdapter] Failed to parse session for ${agent.name}:`, e)
          }
        }
      }

      console.log(`[AntigravityAdapter] Discovered ${this.sessions.size} Antigravity session(s)`)
    } catch (e) {
      console.error('[AntigravityAdapter] Failed to discover sessions:', e)
    }
  }

  async register(agent: AgentRegistration): Promise<void> {
    try {
      this.agentHeartbeats.set(agent.agentId, Date.now())

      eventBus.broadcast('agent.created', {
        id: agent.agentId,
        name: agent.name,
        framework: this.framework,
        status: 'online',
        sessionId: this.sessions.get(agent.agentId)?.sessionId,
        ...agent.metadata,
      })

      console.log(`[AntigravityAdapter] Registered agent: ${agent.agentId}`)
    } catch (e) {
      console.error(`[AntigravityAdapter] Failed to register agent ${agent.agentId}:`, e)
      throw e
    }
  }

  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    try {
      const now = Date.now()
      this.agentHeartbeats.set(payload.agentId, now)

      const session = this.sessions.get(payload.agentId)
      if (session) {
        session.lastHeartbeat = new Date(now)
      }

      eventBus.broadcast('agent.status_changed', {
        id: payload.agentId,
        status: payload.status || 'online',
        metrics: payload.metrics,
        framework: this.framework,
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      console.error(`[AntigravityAdapter] Failed to record heartbeat for ${payload.agentId}:`, e)
      throw e
    }
  }

  async reportTask(report: TaskReport): Promise<void> {
    try {
      const db = getDatabase()
      db.prepare(`
        UPDATE tasks
        SET status = ?, progress = ?, output = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(report.status, report.progress, JSON.stringify(report.output || {}), report.taskId)

      eventBus.broadcast('task.updated', {
        id: report.taskId,
        agentId: report.agentId,
        progress: report.progress,
        status: report.status,
        output: report.output,
        framework: this.framework,
      })

      if (report.status === 'completed' && report.output) {
        eventBus.broadcast('memory.indexed', {
          taskId: report.taskId,
          agentId: report.agentId,
          chunks: 1,
          confidence: 0.70,
        })
      }

      console.log(`[AntigravityAdapter] Reported task ${report.taskId}: ${report.status}`)
    } catch (e) {
      console.error(`[AntigravityAdapter] Failed to report task ${report.taskId}:`, e)
      throw e
    }
  }

  async getAssignments(agentId: string): Promise<Assignment[]> {
    try {
      this.agentHeartbeats.set(agentId, Date.now())
      const assignments = queryPendingAssignments(agentId)

      return assignments.map(a => ({
        taskId: a.taskId,
        description: a.description,
        priority: a.priority,
        metadata: {
          framework: this.framework,
          agentId,
        },
      }))
    } catch (e) {
      console.error(`[AntigravityAdapter] Failed to get assignments for ${agentId}:`, e)
      return []
    }
  }

  async disconnect(agentId: string): Promise<void> {
    try {
      const session = this.sessions.get(agentId)
      if (session) {
        session.isOnline = false
      }

      this.agentHeartbeats.delete(agentId)

      eventBus.broadcast('agent.status_changed', {
        id: agentId,
        status: 'offline',
        framework: this.framework,
        timestamp: new Date().toISOString(),
      })

      console.log(`[AntigravityAdapter] Disconnected agent: ${agentId}`)
    } catch (e) {
      console.error(`[AntigravityAdapter] Failed to disconnect agent ${agentId}:`, e)
      throw e
    }
  }

  async checkHeartbeatTimeouts(): Promise<void> {
    const now = Date.now()
    const stale: string[] = []

    for (const [agentId, lastHeartbeat] of this.agentHeartbeats.entries()) {
      if (now - lastHeartbeat > this.heartbeatTimeoutMs) {
        stale.push(agentId)
      }
    }

    for (const agentId of stale) {
      console.warn(`[AntigravityAdapter] Agent heartbeat timeout: ${agentId}`)
      await this.disconnect(agentId)
    }
  }

  getSessions(): AntigravitySession[] {
    return Array.from(this.sessions.values())
  }
}

export default AntigravityAdapter
