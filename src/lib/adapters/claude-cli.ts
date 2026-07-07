/**
 * Claude CLI Framework Adapter
 * 
 * Implements FrameworkAdapter for Claude Code CLI runtime.
 * Handles task dispatch via subprocess, session discovery from ~/.claude/projects/
 */

import { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export interface ClaudeCliSession {
  sessionId: string
  projectName: string
  lastHeartbeat: Date
  isOnline: boolean
}

/**
 * Claude CLI Adapter (Phase 1 Stub)
 * 
 * Dispatches tasks to Claude Code CLI with sandboxing:
 * - Tool allowlist enforcement
 * - Budget cap enforcement
 * - Workspace isolation
 * - Timeout protection
 */
export class ClaudeCliAdapter implements FrameworkAdapter {
  readonly framework = 'claude-cli'
  private sessions: Map<string, ClaudeCliSession> = new Map()

  async register(agent: AgentRegistration): Promise<void> {
    // Phase 1: Stub
    // Phase 2: Implement session discovery from ~/.claude/projects/
    console.log(`[ClaudeCliAdapter] register: ${agent.agentId}`)
    throw new Error('Not implemented in Phase 1')
  }

  async heartbeat(payload: HeartbeatPayload): Promise<void> {
    // Phase 1: Stub
    // Phase 2: Implement heartbeat signal + metrics update
    console.log(`[ClaudeCliAdapter] heartbeat: ${payload.agentId}`)
    throw new Error('Not implemented in Phase 1')
  }

  async reportTask(report: TaskReport): Promise<void> {
    // Phase 1: Stub
    // Phase 2: Implement task result reporting
    console.log(`[ClaudeCliAdapter] reportTask: ${report.taskId}`)
    throw new Error('Not implemented in Phase 1')
  }

  async getAssignments(agentId: string): Promise<Assignment[]> {
    // Phase 1: Stub
    // Phase 2: Implement task queue polling
    console.log(`[ClaudeCliAdapter] getAssignments: ${agentId}`)
    throw new Error('Not implemented in Phase 1')
  }

  async disconnect(agentId: string): Promise<void> {
    // Phase 1: Stub
    // Phase 2: Implement cleanup on disconnect
    console.log(`[ClaudeCliAdapter] disconnect: ${agentId}`)
    throw new Error('Not implemented in Phase 1')
  }
}

export default ClaudeCliAdapter
