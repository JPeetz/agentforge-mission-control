import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClaudeCliAdapter } from '../claude-cli'
import { eventBus } from '@/lib/event-bus'

vi.mock('@/lib/event-bus')
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: vi.fn(),
    })),
  })),
}))
vi.mock('../adapter', () => ({
  queryPendingAssignments: vi.fn(() => [
    {
      taskId: 'task-1',
      description: 'Test task',
      priority: 1,
    },
  ]),
}))

describe('ClaudeCliAdapter Integration Tests', () => {
  let adapter: ClaudeCliAdapter

  beforeEach(() => {
    adapter = new ClaudeCliAdapter()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('end-to-end task flow', () => {
    it('should handle complete task lifecycle', async () => {
      // 1. Register agent
      await adapter.register({
        agentId: 'claude-cli-test',
        name: 'Test Agent',
        framework: 'claude-cli',
      })

      // 2. Agent sends heartbeat
      await adapter.heartbeat({
        agentId: 'claude-cli-test',
        status: 'online',
        metrics: { cpu: 30, memory: 256 },
      })

      // 3. Agent polls for assignments
      const assignments = await adapter.getAssignments('claude-cli-test')
      expect(Array.isArray(assignments)).toBe(true)

      // 4. Agent reports task completion
      await adapter.reportTask({
        taskId: 'task-1',
        agentId: 'claude-cli-test',
        progress: 100,
        status: 'completed',
        output: {
          result: 'Task completed successfully',
          timestamp: new Date().toISOString(),
        },
      })

      // 5. Agent disconnects
      await adapter.disconnect('claude-cli-test')
    })

    it('should handle multiple concurrent agents', async () => {
      const agents = ['agent-1', 'agent-2', 'agent-3']

      // Register all agents
      for (const agentId of agents) {
        await adapter.register({
          agentId: `claude-cli-${agentId}`,
          name: `Agent ${agentId}`,
          framework: 'claude-cli',
        })
      }

      // All agents send heartbeat
      for (const agentId of agents) {
        await adapter.heartbeat({
          agentId: `claude-cli-${agentId}`,
          status: 'online',
        })
      }

      // All agents get assignments
      const results = await Promise.all(
        agents.map(id => adapter.getAssignments(`claude-cli-${id}`))
      )

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should handle failed task reports', async () => {
      await adapter.register({
        agentId: 'claude-cli-test',
        name: 'Test Agent',
        framework: 'claude-cli',
      })

      const report = {
        taskId: 'task-2',
        agentId: 'claude-cli-test',
        progress: 50,
        status: 'failed',
        output: {
          error: 'Task execution failed',
          reason: 'Resource exhausted',
        },
      }

      await expect(adapter.reportTask(report)).resolves.not.toThrow()
    })
  })

  describe('session management', () => {
    it('should discover sessions on initialization', () => {
      const sessions = adapter.getSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should track session heartbeats', async () => {
      const before = adapter.getSessions()

      await adapter.register({
        agentId: 'claude-cli-test',
        name: 'Test Agent',
        framework: 'claude-cli',
      })

      await adapter.heartbeat({
        agentId: 'claude-cli-test',
        status: 'online',
      })

      // Sessions should still be tracked
      const after = adapter.getSessions()
      expect(Array.isArray(after)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should gracefully handle registration errors', async () => {
      const badAgent = {
        agentId: '',
        name: '',
        framework: 'claude-cli',
      }

      // Should not throw
      await expect(adapter.register(badAgent)).resolves.not.toThrow()
    })

    it('should gracefully handle heartbeat errors', async () => {
      const badPayload = {
        agentId: 'nonexistent',
        status: 'online',
      }

      // Should not throw
      await expect(adapter.heartbeat(badPayload)).resolves.not.toThrow()
    })

    it('should gracefully handle disconnect errors', async () => {
      // Should not throw
      await expect(adapter.disconnect('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('event broadcasting', () => {
    it('should broadcast events with correct structure', async () => {
      const broadcastSpy = vi.spyOn(eventBus, 'broadcast')

      await adapter.register({
        agentId: 'claude-cli-test',
        name: 'Test Agent',
        framework: 'claude-cli',
      })

      expect(broadcastSpy).toHaveBeenCalledWith('agent.created', expect.any(Object))
    })
  })
})
