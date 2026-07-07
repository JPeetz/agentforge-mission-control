/**
 * Antigravity Framework Adapter
 * 
 * Implements FrameworkAdapter for Antigravity runtime.
 * Handles task dispatch, session discovery from ~/.antigravity/
 */

import { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export interface AntigravitySession {
  sessionId: string
  agentName: string
  lastHeartbeat: Date
  isOnline: boolean
}

/**
 * Antigravity Adapter (Phase 3 Stub)
 * 
 * Dispatches tasks to Antigravity runtime with sandboxing:
 * - Tool allowlist enforcement
 * - Budget cap enforcement
 * - Workspace isolation
 * - Timeout protection
 */
export class AntigravityAdapter implements FrameworkAdapter {
  readonly framework = 'antigravity'
  private sessions: Map<string, AntigravitySession> = new Map()

  async register(agent: AgentRegistration): Promise<void> {
    // Phase 3: Stub
    // Implement session discovery from ~/.antigravity/
    console.log(`[AntigravityAdapter] register: ${agent.agentId}`)
    throw new Error('Not implemented yet (Phase 3)')
  }

  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    // Phase 3: Stub
    console.log(`[AntigravityAdapter] heartbeat: ${payload.agentId}`)
    throw new Error('Not implemented yet (Phase 3)')
  }

  async reportTask(report: TaskReport): Promise<void> {
    // Phase 3: Stub
    console.log(`[AntigravityAdapter] reportTask: ${report.taskId}`)
    throw new Error('Not implemented yet (Phase 3)')
  }

  async getAssignments(agentId: string): Promise<Assignment[]> {
    // Phase 3: Stub
    console.log(`[AntigravityAdapter] getAssignments: ${agentId}`)
    throw new Error('Not implemented yet (Phase 3)')
  }

  async disconnect(agentId: string): Promise<void> {
    // Phase 3: Stub
    console.log(`[AntigravityAdapter] disconnect: ${agentId}`)
    throw new Error('Not implemented yet (Phase 3)')
  }
}

export default AntigravityAdapter
