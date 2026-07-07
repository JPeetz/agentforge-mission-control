# Technical Notes

**AgentForge Mission Control Internal Documentation**

---

## Table of Contents

1. [Architecture Notes](#architecture-notes)
2. [Adapter Pattern Deep-Dive](#adapter-pattern-deep-dive)
3. [CLI Dispatch & Sandboxing](#cli-dispatch--sandboxing)
4. [Memex ZeroRAG Design](#memex-zerorag-design)
5. [Galaxy Visualization](#galaxy-visualization)
6. [Integration Points](#integration-points)
7. [Known Gotchas](#known-gotchas)
8. [Decision Rationale](#decision-rationale)

---

## Architecture Notes

### Why Mission Control Over Building From Scratch

**Comparison Table:**

| Aspect | Mission Control | From Scratch |
|--------|---|---|
| **Code Maturity** | 2+ years production | 0 |
| **Test Suite** | 577 tests | 0 tests |
| **Security** | 4-layer eval framework | TBD |
| **Operators** | 32 UI panels | Design work |
| **Extensibility** | 6 proven adapters | Would invent |
| **Dependencies** | SQLite only | Varies |
| **Timeline** | 4-5 weeks to multi-LLM | 3+ months |
| **Risk** | Proven pattern, low risk | Unknown, high risk |

**Decision:** Fork mission-control, extend with Claude/Gemini/Antigravity adapters + Memex + Galaxy

### Component Interactions

```
┌─────────────────────────────┐
│  Operator (UI Forms/Kanban) │
└──────────────┬──────────────┘
               │
         ┌─────▼────────┐
         │  Event Bus   │  (WebSocket + SSE)
         │  (100+ types)│
         └─────┬────────┘
               │
    ┌──────────┼──────────┬────────────┐
    │          │          │            │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌────▼──┐
│Claude  │ │Gemini  │ │Antigra-│ │Others │
│Adapter │ │Adapter │ │vity    │ │       │
└───┬────┘ └───┬────┘ └───┬────┘ └────┬──┘
    │          │          │          │
    └──────────┼──────────┼──────────┘
               │
    ┌──────────▼──────────┐
    │ Orchestration Layer │
    │ (Task dispatch,     │
    │  sandboxing,        │
    │  cost tracking,     │
    │  security eval)     │
    └──────────┬──────────┘
               │
    ┌──────────┼──────────────┬──────────────┐
    │          │              │              │
┌───▼───┐ ┌────▼────┐ ┌──────▼──┐ ┌────────▼──┐
│SQLite │ │Qdrant   │ │Galaxy   │ │ Security  │
│(Tasks,│ │(Memory) │ │(Visual) │ │ Audit     │
│Logs)  │ │         │ │         │ │           │
└───────┘ └─────────┘ └─────────┘ └───────────┘
```

### Data Flow: Task Dispatch

```
1. Operator creates task (UI Form)
   ↓
2. Event broadcast: task.created
   ↓
3. Framework adapter polls: getAssignments()
   ↓
4. Sandbox options resolved:
   - Tool allowlist: [Task, Bash, Read, Write]
   - Budget cap: $5.00
   - Workspace: /workspace/projects/foo
   ↓
5. CLI invoked:
   claude code --task "..." --allowedTools [...] --maxBudgetUsd 5.00 --cwd [...]
   ↓
6. LLM executes tools within sandbox
   ↓
7. Output captured (stdout/stderr/logs)
   ↓
8. Adapter reports: reportTask()
   ↓
9. Event broadcast: task.updated, task.completed
   ↓
10. Dashboard updates via event bus
   ↓
11. Memory indexed: POST /api/memory/index
   ↓
12. Galaxy refreshed with new nodes/edges
```

---

## Adapter Pattern Deep-Dive

### The Interface

```typescript
interface FrameworkAdapter {
  /**
   * Provider identifier (e.g., "claude-cli", "gemini-cli")
   */
  readonly framework: string

  /**
   * Register a new agent/LLM provider
   * Called when: agent first connects, heartbeat timeout resumes connection
   * Broadcasts: agent.registered event
   */
  register(agent: AgentRegistration): Promise<void>

  /**
   * Keep-alive signal with metrics update
   * Called by: agent every 30 seconds
   * Sends: heartbeat payload (status, CPU, memory, tasks completed)
   * Broadcasts: agent.heartbeat event
   */
  heartbeat(payload: HeartbeatPayload): Promise<void>

  /**
   * Report task completion with output and cost
   * Called by: adapter after CLI invocation completes
   * Broadcasts: task.updated, task.completed, memory.indexed
   */
  reportTask(report: TaskReport): Promise<void>

  /**
   * Fetch pending work for an agent
   * Called by: agent polling loop (every 5-10 seconds)
   * Returns: array of tasks to execute
   * Implements: work queue pattern (FIFO or prioritized)
   */
  getAssignments(agentId: string): Promise<Assignment[]>

  /**
   * Clean up agent state on disconnect
   * Called when: agent heartbeat timeout, explicit shutdown
   * Broadcasts: agent.disconnected event
   * Cleans up: pending tasks, open sockets, resources
   */
  disconnect(agentId: string): Promise<void>
}
```

### Implementing a New Adapter

**Pattern: Follow Claude CLI Adapter as Reference**

1. **Create file:** `src/lib/adapters/[provider].ts`
2. **Implement interface:** Export class extending FrameworkAdapter
3. **Register in:** `src/lib/adapters/index.ts`
4. **Add session scanner:** Extend `src/lib/sessions.ts` for provider's config directory
5. **CLI dispatch:** Extend `src/lib/task-dispatch.ts` if provider-specific options needed
6. **Runtime type:** Add to `VALID_RUNTIMES` in `src/app/api/agent-runtimes/route.ts`
7. **Tests:** Create 30+ unit tests covering happy path, errors, timeouts, budget

**Estimated effort:** 200-300 lines, 2-3 weeks

### Adapter Lifecycle

```
1. Session Discovery (scanClaudeCodeSessions → ProviderSession[])
   ↓
2. Register (POST /api/agents/register)
   → broadcasts: agent.registered
   ↓
3. Heartbeat Loop (agent polls every 30s)
   ↓
4. getAssignments (fetch pending work)
   ↓
5. CLI Dispatch (execute task with sandbox)
   ↓
6. reportTask (send results back)
   → broadcasts: task.updated, task.completed, memory.indexed
   ↓
7. Dashboard Update (via event bus)
   ↓
8. Disconnect (on timeout or shutdown)
   → broadcasts: agent.disconnected
```

---

## CLI Dispatch & Sandboxing

### Sandbox Options

```typescript
interface CliDispatchSandboxOptions {
  /**
   * Tool whitelist (null = allow all)
   * Example: ["Task", "Bash", "Read", "Write"]
   * Enforced at: Claude CLI level, cannot execute unlisted tools
   */
  allowedTools: string[] | null

  /**
   * Budget cap in USD (null = unlimited)
   * Example: 5.00
   * Enforced at: Task dispatch time, kills process if spending exceeds
   */
  maxBudgetUsd: number | null

  /**
   * Working directory for task (null = default)
   * Example: "/workspace/projects/foo"
   * Enforced at: Sandbox isolation, cannot cd outside cwd
   */
  cwd: string | null

  /**
   * Execution timeout in seconds (null = 300s default)
   * Example: 180
   * Enforced at: Process level, SIGTERM after timeout
   */
  timeout: number | null

  /**
   * Environment variables to inject
   * Example: { "API_KEY": "...", "MAX_RETRIES": "3" }
   * Enforced at: Subprocess level, not shell-escaped
   */
  environment: Record<string, string>
}
```

### Invocation Pattern (Production-Grade)

```bash
# Example: Dispatch security analysis task to Claude with hard limits
claude code \
  --task "Analyze security findings from /tmp/findings.txt" \
  --allowedTools Task,Bash,Read,Write \
  --maxBudgetUsd 5.00 \
  --cwd /workspace/projects/foo \
  --timeout 300
```

**Error Handling:**
- If spending exceeds cap → process killed immediately, output preserved
- If timeout exceeded → process killed, partial results captured
- If tool execution outside allowlist → error returned, task marked failed
- If cwd escape attempted → denied at sandbox level

---

## Memex ZeroRAG Design

### What is ZeroRAG?

**Zero-Hallucination RAG:**
- Only returns factual data from indexed sources
- Never generates plausible but false information
- Source attribution on every result
- Confidence scoring (0.0-1.0)

### Memory Schema

```typescript
interface MemoryChunk {
  /**
   * Unique identifier (UUID v4)
   */
  id: string

  /**
   * Text content or structured data
   * Example: "Vulnerability found in auth module: SQL injection"
   */
  content: string

  /**
   * Which agent created this memory
   * Example: "claude-cli-agent-1"
   */
  agent_id: string

  /**
   * Which task produced this memory
   * Example: "task-123"
   */
  task_id: string

  /**
   * Session context (for replaying tasks)
   */
  session_id: string

  /**
   * When created (UTC)
   */
  timestamp: Date

  /**
   * Last time this chunk was accessed or updated
   */
  updated_at: Date

  /**
   * Tags for filtering and discovery
   * Example: ["vulnerability", "sql-injection", "critical", "auth"]
   */
  tags: string[]

  /**
   * Confidence: 0.0-1.0
   * 1.0 = ground truth (verified by multiple agents)
   * 0.5 = single agent observation
   * 0.2 = low-confidence signal
   */
  confidence: number

  /**
   * Provenance chain: how we know this is true
   * Example:
   * [
   *   { type: "task", id: "task-42", confidence: 0.95 },
   *   { type: "agent", id: "agent-1", confidence: 0.9 }
   * ]
   */
  sources: Array<{
    type: 'task' | 'agent' | 'external'
    id: string
    confidence: number
  }>

  /**
   * Vector embedding for semantic search
   * Generated by: sentence-transformers or API
   */
  embeddings: number[]

  /**
   * Custom metadata per domain
   * Example: { "severity": "critical", "cve_id": "CVE-2024-1234" }
   */
  metadata: Record<string, any>
}
```

### Memory API Endpoints

#### 1. Index Memory: `POST /api/memory/index`

```typescript
Request: {
  content: string
  agent_id: string
  task_id: string
  tags: string[]
  confidence?: number    // Default: 0.7
  metadata?: object
}

Response: {
  id: string             // UUID of indexed chunk
  status: "indexed"
  embeddings_generated: boolean
}
```

**Flow:**
1. Receive chunk
2. Generate embeddings (batch with sentence-transformers)
3. Upsert to Qdrant (if similar exists, merge metadata)
4. Broadcast: memory.indexed event
5. Return ID

**Latency target:** <500ms

---

#### 2. Search Memory: `GET /api/memory/search?q=...`

```typescript
Query: {
  q: string              // Query text ("auth bypass", "SQL injection")
  agent_id?: string      // Filter by agent
  tags?: string[]        // Filter by tags
  min_confidence?: 0.5   // Minimum confidence (default: 0.0)
  limit?: 10             // Results to return (default: 10)
  mode?: "semantic" | "keyword" | "hybrid"  // Search mode
}

Response: {
  results: Array<{
    id: string
    content: string
    confidence: number
    similarity_score: number  // 0.0-1.0 (semantic only)
    sources: []
    agent_id: string
    tags: string[]
    created: Date
  }>
  search_latency_ms: number
}
```

**Search Modes:**
- **Semantic:** Vector similarity (find conceptually similar chunks)
- **Keyword:** BM25 (exact term matching)
- **Hybrid:** Both (combine results, rank by combined score)

**Latency target:** <100ms

---

#### 3. Retrieve Memory: `GET /api/memory/:id`

```typescript
Response: {
  id: string
  content: string
  agent_id: string
  task_id: string
  timestamp: Date
  tags: string[]
  confidence: number
  sources: [
    { type: "task", id: "task-42", confidence: 0.95 },
    ...provenance chain
  ]
  related_chunks: [
    { id: "chunk-2", similarity: 0.92 }
    ...
  ]
}
```

**Includes:**
- Full provenance chain (how we know this)
- Related chunks (semantically similar findings)
- Audit trail (who accessed, when)

---

#### 4. Delete Memory: `DELETE /api/memory/:id`

```typescript
Response: {
  id: string
  status: "archived"  // Soft delete (not removed)
  archived_at: Date
}
```

**Soft delete pattern:** Flag as archived, don't remove (preserves audit trail)

---

#### 5. Memory Stats: `GET /api/memory/stats`

```typescript
Response: {
  total_chunks: number       // 10,234
  total_archived: number     // 342
  avg_confidence: number     // 0.78
  indexed_today: number      // 123
  search_latency_p99: number // 87ms
  storage_usage_mb: number   // 342MB
  top_tags: [
    { tag: "vulnerability", count: 1234 },
    ...
  ]
  top_agents: [
    { agent_id: "agent-1", chunks: 2134 },
    ...
  ]
}
```

### Memex Use Cases

#### 1. Vulnerability Discovery
```
Task A (Agent 1): "Analyze domain.com"
→ finds: SQL injection in /login
→ indexes: {"type": "vuln", "cve": "...", "confidence": 0.95}

Later, Task B (Agent 2): "Check domain.com security"
→ searches: "SQL injection" 
→ finds: prior discovery from Task A
→ integrates findings, doesn't re-run same analysis
→ saves time + cost
```

#### 2. Feature Design Decisions
```
Task A (Agent 1): "Design auth flow"
→ proposes: OAuth + TOTP (confidence: 0.7)

Task B (Agent 2): "Design auth flow"
→ proposes: OAuth + WebAuthn (confidence: 0.8)

Task C (Agent 3): "Compare auth designs"
→ searches: "auth design proposals"
→ finds both, ranks by confidence
→ operator picks highest-confidence design
```

#### 3. Duplicate Prevention
```
Operator: "Analyze security posture of company.com"
→ System searches: "company.com security assessment"
→ finds: prior assessment from 3 weeks ago (confidence: 0.6)
→ returns: prior findings + asks if operator wants refresh
→ saves: 2-3 hours of re-analysis
```

#### 4. Continuous Learning
```
Each task completion:
→ outcome indexed with confidence score
→ future agents query memory before planning
→ team becomes smarter over time
→ compounding intelligence flywheel
```

---

## Galaxy Visualization

### 3D Knowledge Graph Design

#### Visual Design

**Nodes:**
- Memory chunks (MemoryChunk objects)
- Colored by: domain/type (vulnerability=red, feature=blue, insight=green)
- Size: by importance (confidence * usage_count)
- Label: first 30 chars of content

**Edges:**
- Relationships between chunks
- Types: is_related_to, depends_on, refutes, supports, contradicts
- Thickness: by strength (confidence of relationship)
- Direction: directed graph shows discovery chains

**Camera:**
- 3D perspective, force-directed layout
- Auto-focus on search results
- Manual pan/zoom/rotate
- Mouse wheel to zoom, drag to pan, right-click to rotate

#### Rendering Implementation

**Framework:** Three.js or Babylon.js
- Reason: GPU-accelerated 3D, WebGL support, large node count
- Target: <200ms render per frame for 10K nodes

**Layout Engine:** D3.js force simulation or custom physics
- Nodes repel each other (avoid clustering)
- Edges attract (keep related chunks near)
- Convergence: ~50 iterations for stability

**Optimization:**
- Level-of-detail (LOD): distant nodes simplified
- Frustum culling: render only visible nodes
- Batching: group similar nodes
- Web Worker: layout calculations off-main-thread

#### Interactive Features

1. **Hover:** Preview popup with chunk content
2. **Click:** Open detail panel (full chunk + sources + related)
3. **Search:** Highlight matching nodes, auto-zoom to cluster
4. **Filter by Agent:** Toggle agents, highlights/grays nodes
5. **Filter by Tag:** Multi-select tags, combined filtering
6. **Filter by Confidence:** Slider to show only high-confidence chunks
7. **Timeline Scrubber:** Animate from t=0 to now (galaxy grows)
8. **Relationship Explorer:** Click node → show neighbors (1/2/3-hop)
9. **Export:** Screenshot (PNG), 3D model (GLB/GLTF)
10. **Dark Mode:** Theme toggle

#### Performance Targets

| Operation | Target |
|-----------|--------|
| Render 10K nodes | <200ms |
| Search (highlight) | <100ms |
| Filter (tag/agent) | <50ms |
| Timeline animation | smooth 60fps |
| Zoom/pan response | <16ms (60fps) |

---

## Integration Points

### Event Bus → Galaxy

When `memory.indexed` event is broadcast:
1. Galaxy panel receives event
2. New node added to graph
3. Related nodes discovered (semantic search)
4. Edges created
5. Layout recalculates (attracted new node)
6. Animation smooth (50ms transition)

### Memory Search → Galaxy

When operator searches "SQL injection":
1. Search returns 5 chunks
2. Galaxy highlights 5 nodes
3. Auto-zoom to cluster center
4. Show relationship explorer
5. Display discovery chains

### CLI Dispatch → Memory → Galaxy

Complete flow:
```
Task dispatch → LLM execution → Output capture → Memory index
  ↓
POST /api/memory/index (chunk + confidence)
  ↓
Broadcast: memory.indexed event
  ↓
Galaxy panel receives event
  ↓
New node added + layout recalculates
  ↓
Dashboard updates (task completed + memory indexed + galaxy refreshed)
```

---

## Known Gotchas

### 1. Tool Allowlist Edge Cases

**Gotcha:** Operator allows "Bash" tool, agent runs `rm -rf /`

**Mitigation:** 
- Tool names reference the CLI tool, not full capabilities
- Each tool has its own allowlist (e.g., Bash can't execute `chmod`, `sudo`)
- Sandbox isolation (can't escape cwd)
- Audit logging (every invocation logged)

**Best Practice:** Conservative allowlist by default, operator explicitly enables tools

---

### 2. Budget Cap Not Instant

**Gotcha:** Agent spending $4.99, starts $1.00 task, budget cap is $5.00, ends up spending $5.99

**Mitigation:**
- Budget check at task dispatch (before invocation)
- If total estimated cost > cap, reject task
- If actual cost > cap (due to overrun), mark task failed, refund best-effort

**Best Practice:** Set budget cap at 90% of actual limit to account for estimation error

---

### 3. Confidence Score Aggregation

**Gotcha:** 2 agents find same vuln with 0.7 and 0.8 confidence → should be 0.9+, not 0.75 (simple average)

**Mitigation:**
- Use Dempster-Shafer combination rule or Bayesian update
- When duplicates found, merge with: `confidence_new = 1 - (1-c1) * (1-c2)`
- This way: 0.7 + 0.8 → 0.94 (agreement increases confidence)

**Best Practice:** Document aggregation formula in memory schema

---

### 4. Vector DB Storage Cost

**Gotcha:** Embeddings for 100K chunks = 1-5GB storage (depending on embedding dim)

**Mitigation:**
- For v1.0: embedded Qdrant (local SQLite), storage is cheap
- For v1.1+: separate Qdrant service (easier to scale)
- Auto-pruning: archive old low-confidence chunks

**Best Practice:** Monitor storage growth, plan upgrade to distributed Qdrant by v1.1

---

### 5. Galaxy Rendering at 100K Nodes

**Gotcha:** Force-directed layout with 100K nodes = 10+ seconds to converge

**Mitigation:**
- Level-of-detail rendering (simplified nodes far from camera)
- Streaming/pagination (load nodes in batches)
- Temporal: don't show all history, show last 30 days
- Clustering: group similar nodes spatially

**Best Practice:** Implement pagination + LOD from day 1, not as afterthought

---

## Decision Rationale

### D001: Why Qdrant Over Pinecone/Weaviate?

**Qdrant Advantages:**
- Self-hosted capability (embedded SQLite for v1.0)
- No vendor lock-in (can migrate data easily)
- REST API (easy Node.js integration)
- Mature (used by Anthropic, OpenAI)

**Weaviate Disadvantages:**
- Heavier resource footprint
- GraphQL API adds complexity

**Pinecone Disadvantages:**
- Cloud-only (no self-hosted option)
- Vendor lock-in risk

**Decision:** Qdrant for v1.0 (embedded), scale to distributed later

---

### D002: Why Three.js Over Babylon.js?

**Three.js Advantages:**
- Larger community (examples, tutorials)
- Lighter library
- Better integration with D3.js layouts

**Babylon.js Advantages:**
- More features out-of-box
- Better documentation
- Physics engine built-in

**Decision:** Three.js for Galaxy (lighter, better community), can switch if needed

---

### D003: Why Force-Directed Layout Over Hierarchical?

**Force-Directed Advantages:**
- Organic, intuitive layout
- Relationships naturally cluster
- Works well for knowledge graphs

**Hierarchical Disadvantages:**
- Less intuitive for non-tree structures
- Hard to visualize cross-domain relationships

**Decision:** Force-directed for Galaxy (better UX), hierarchical as secondary view option

---

**NOTES maintained by:** Development Team  
**Last Updated:** 2026-07-07
