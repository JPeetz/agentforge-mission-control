/**
 * Gemini CLI Framework Adapter
 * 
 * Implements FrameworkAdapter for Gemini CLI runtime.
 * Handles task dispatch via subprocess, session discovery from ~/.gemini-cli/
 */

import { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export interface GeminiCliSession {
  sessionId: string
  projectName: string
  lastHeartbeat: Date
  isOnline: boolean
}

/**
 * Gemini CLI Adapter (Phase 2 Stub)
 * 
 * Dispatches tasks to Gemini CLI with sandboxing:
 * - Tool allowlist enforcement
 * - Budget cap enforcement
 * - Workspace isolation
 * - Timeout protection
 */
export class GeminiCliAdapter implements FrameworkAdapter {
  readonly framework = 'gemini-cli'
  private sessions: Map<string, GeminiCliSession> = new Map()

  async register(agent: AgentRegistration): Promise<void> {
    // Phase 2: Stub
    // Implement session discovery from ~/.gemini-cli/
    console.log(`[GeminiCliAdapter] register: ${agent.agentId}`)
    throw new Error('Not implemented yet (Phase 2)')
  }

  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    // Phase 2: Stub
    console.log(`[GeminiCliAdapter] heartbeat: ${payload.agentId}`)
    throw new Error('Not implemented yet (Phase 2)')
  }

  async reportTask(report: TaskReport): Promise<void> {
    // Phase 2: Stub
    console.log(`[GeminiCliAdapter] reportTask: ${report.taskId}`)
    throw new Error('Not implemented yet (Phase 2)')
  }

  async getAssignments(agentId: string): Promise<Assignment[]> {
    // Phase 2: Stub
    console.log(`[GeminiCliAdapter] getAssignments: ${agentId}`)
    throw new Error('Not implemented yet (Phase 2)')
  }

  async disconnect(agentId: string): Promise<void> {
    // Phase 2: Stub
    console.log(`[GeminiCliAdapter] disconnect: ${agentId}`)
    throw new Error('Not implemented yet (Phase 2)')
  }
}

export default GeminiCliAdapter
