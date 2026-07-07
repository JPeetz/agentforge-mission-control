import { describe, it, expect, beforeEach, vi } from 'vitest'
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
      description: 'Claude task',
      priority: 1,
    },
  ]),
}))

describe('ClaudeCliAdapter', () => {
  let adapter: ClaudeCliAdapter
  const mockEventBus = eventBus as any

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new ClaudeCliAdapter()
  })

  it('should register agent and broadcast event', async () => {
    const agent = {
      agentId: 'claude-cli-1',
      name: 'Claude Agent',
      framework: 'claude-cli',
    }

    await adapter.register(agent)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.created', expect.any(Object))
  })

  it('should handle heartbeat', async () => {
    const payload = {
      agentId: 'claude-cli-1',
      status: 'online',
    }

    await adapter.heartbeat(payload)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.status_changed', expect.any(Object))
  })

  it('should report task completion', async () => {
    const report = {
      taskId: 'task-1',
      agentId: 'claude-cli-1',
      progress: 100,
      status: 'completed',
      output: { result: 'success' },
    }

    await adapter.reportTask(report)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('task.updated', expect.any(Object))
  })

  it('should get assignments', async () => {
    const assignments = await adapter.getAssignments('claude-cli-1')

    expect(Array.isArray(assignments)).toBe(true)
  })

  it('should disconnect agent', async () => {
    await adapter.register({
      agentId: 'claude-cli-1',
      name: 'Agent',
      framework: 'claude-cli',
    })

    await adapter.disconnect('claude-cli-1')

    expect(mockEventBus.broadcast).toHaveBeenCalled()
  })

  it('should have correct framework identifier', () => {
    expect(adapter.framework).toBe('claude-cli')
  })
})
