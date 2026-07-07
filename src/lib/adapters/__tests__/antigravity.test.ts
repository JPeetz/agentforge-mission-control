import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AntigravityAdapter } from '../antigravity'
import { eventBus } from '@/lib/event-bus'

vi.mock('@/lib/event-bus')
vi.mock('@/lib/db')
vi.mock('../adapter', () => ({
  queryPendingAssignments: vi.fn(() => [
    {
      taskId: 'task-1',
      description: 'Antigravity task',
      priority: 1,
    },
  ]),
}))

describe('AntigravityAdapter', () => {
  let adapter: AntigravityAdapter
  const mockEventBus = eventBus as any

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new AntigravityAdapter()
  })

  it('should register agent and broadcast event', async () => {
    const agent = {
      agentId: 'antigravity-1',
      name: 'Antigravity Agent',
      framework: 'antigravity',
    }

    await adapter.register(agent)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.created', expect.any(Object))
  })

  it('should handle heartbeat', async () => {
    const payload = {
      agentId: 'antigravity-1',
      status: 'online',
    }

    await adapter.heartbeat(payload)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.status_changed', expect.any(Object))
  })

  it('should report task completion', async () => {
    const report = {
      taskId: 'task-1',
      agentId: 'antigravity-1',
      progress: 100,
      status: 'completed',
      output: { result: 'success' },
    }

    await adapter.reportTask(report)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('task.updated', expect.any(Object))
  })

  it('should get assignments', async () => {
    const assignments = await adapter.getAssignments('antigravity-1')

    expect(Array.isArray(assignments)).toBe(true)
  })

  it('should disconnect agent', async () => {
    await adapter.register({
      agentId: 'antigravity-1',
      name: 'Agent',
      framework: 'antigravity',
    })

    await adapter.disconnect('antigravity-1')

    expect(mockEventBus.broadcast).toHaveBeenCalled()
  })

  it('should have correct framework identifier', () => {
    expect(adapter.framework).toBe('antigravity')
  })
})
