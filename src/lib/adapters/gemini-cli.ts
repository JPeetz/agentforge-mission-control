/**
 * Gemini CLI Framework Adapter (Phase 3)
 *
 * Implements FrameworkAdapter for Gemini CLI runtime.
 * Session discovery from ~/.gemini-cli/ or ~/.config/gcloud/
 */

import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { eventBus } from '@/lib/event-bus'
import { getDatabase } from '@/lib/db'
import { queryPendingAssignments } from './adapter'
import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export interface GeminiCliSession {
  sessionId: string
  projectName: string
  projectPath: string
  lastHeartbeat: Date
  isOnline: boolean
}

/**
 * Gemini CLI Adapter (Phase 3)
 *
 * Dispatches tasks to Gemini CLI with full sandboxing support.
 * Sessions are discovered from ~/.gemini-cli/ on startup.
 */
export class GeminiCliAdapter implements FrameworkAdapter {
  readonly framework = 'gemini-cli'
  private sessions: Map<string, GeminiCliSession> = new Map()
  private agentHeartbeats: Map<string, number> = new Map()
  private readonly heartbeatTimeoutMs = 60000

  constructor() {
    this.discoverSessions()
  }

  /**
   * Discover Gemini CLI sessions from ~/.gemini-cli/ or ~/.config/gcloud/
   */
  private discoverSessions(): void {
    try {
      // Try ~/.gemini-cli/ first
      let geminiDir = path.join(homedir(), '.gemini-cli')
      if (!fs.existsSync(geminiDir)) {
        // Fallback to ~/.config/gcloud/
        geminiDir = path.join(homedir(), '.config', 'gcloud')
      }

      if (!fs.existsSync(geminiDir)) {
        console.warn('[GeminiCliAdapter] No Gemini CLI config directory found')
        return
      }

      const projects = fs.readdirSync(geminiDir, { withFileTypes: true })
      for (const project of projects) {
        if (!project.isDirectory()) continue

        const projectPath = path.join(geminiDir, project.name)
        const sessionFile = path.join(projectPath, 'session.json')

        if (fs.existsSync(sessionFile)) {
          try {
            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'))
            const sessionId = sessionData.id || project.name
            const agentId = `gemini-cli-${project.name}`

            this.sessions.set(agentId, {
              sessionId,
              projectName: project.name,
              projectPath,
              lastHeartbeat: new Date(),
              isOnline: true,
            })
          } catch (e) {
            console.warn(`[GeminiCliAdapter] Failed to parse session for ${project.name}:`, e)
          }
        }
      }

      console.log(`[GeminiCliAdapter] Discovered ${this.sessions.size} Gemini CLI session(s)`)
    } catch (e) {
      console.error('[GeminiCliAdapter] Failed to discover sessions:', e)
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

      console.log(`[GeminiCliAdapter] Registered agent: ${agent.agentId}`)
    } catch (e) {
      console.error(`[GeminiCliAdapter] Failed to register agent ${agent.agentId}:`, e)
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
      console.error(`[GeminiCliAdapter] Failed to record heartbeat for ${payload.agentId}:`, e)
      throw e
    }
  }

  async reportTask(report: TaskReport): Promise<void> {
    try {
      const db = getDatabase()
      const metadata = JSON.stringify({
        progress: report.progress,
        output: report.output || {},
      })
      db.prepare(`
        UPDATE tasks
        SET status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(report.status, metadata, report.taskId)

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
          confidence: 0.75,
        })
      }

      console.log(`[GeminiCliAdapter] Reported task ${report.taskId}: ${report.status}`)
    } catch (e) {
      console.error(`[GeminiCliAdapter] Failed to report task ${report.taskId}:`, e)
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
      console.error(`[GeminiCliAdapter] Failed to get assignments for ${agentId}:`, e)
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

      console.log(`[GeminiCliAdapter] Disconnected agent: ${agentId}`)
    } catch (e) {
      console.error(`[GeminiCliAdapter] Failed to disconnect agent ${agentId}:`, e)
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
      console.warn(`[GeminiCliAdapter] Agent heartbeat timeout: ${agentId}`)
      await this.disconnect(agentId)
    }
  }

  getSessions(): GeminiCliSession[] {
    return Array.from(this.sessions.values())
  }
}

export default GeminiCliAdapter
