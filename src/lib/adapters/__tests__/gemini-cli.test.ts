import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GeminiCliAdapter } from '../gemini-cli'
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
      description: 'Gemini task',
      priority: 1,
    },
  ]),
}))

describe('GeminiCliAdapter', () => {
  let adapter: GeminiCliAdapter
  const mockEventBus = eventBus as any

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new GeminiCliAdapter()
  })

  it('should register agent and broadcast event', async () => {
    const agent = {
      agentId: 'gemini-cli-1',
      name: 'Gemini Agent',
      framework: 'gemini-cli',
    }

    await adapter.register(agent)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.created', expect.any(Object))
  })

  it('should handle heartbeat', async () => {
    const payload = {
      agentId: 'gemini-cli-1',
      status: 'online',
    }

    await adapter.heartbeat(payload)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('agent.status_changed', expect.any(Object))
  })

  it('should report task completion', async () => {
    const report = {
      taskId: 'task-1',
      agentId: 'gemini-cli-1',
      progress: 100,
      status: 'completed',
      output: { result: 'success' },
    }

    await adapter.reportTask(report)

    expect(mockEventBus.broadcast).toHaveBeenCalledWith('task.updated', expect.any(Object))
  })

  it('should get assignments', async () => {
    const assignments = await adapter.getAssignments('gemini-cli-1')

    expect(Array.isArray(assignments)).toBe(true)
  })

  it('should disconnect agent', async () => {
    await adapter.register({
      agentId: 'gemini-cli-1',
      name: 'Agent',
      framework: 'gemini-cli',
    })

    await adapter.disconnect('gemini-cli-1')

    expect(mockEventBus.broadcast).toHaveBeenCalled()
  })

  it('should have correct framework identifier', () => {
    expect(adapter.framework).toBe('gemini-cli')
  })
})
