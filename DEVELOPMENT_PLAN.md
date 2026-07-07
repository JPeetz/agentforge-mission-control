# AgentForge Mission Control — Development Plan

**Version:** 1.0 (Planning Phase)  
**Created:** 2026-07-07  
**Status:** Ready for Phase 1 (Fork & Execute)  
**Timeline:** 10 weeks (parallel work)  
**Team:** Joerg (architect, 60%), 3 engineers (100% each), QA optional (50%)

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [What is AgentForge Mission Control](#what-is-agentforge-mission-control)
3. [Architecture Overview](#architecture-overview)
4. [Core Components](#core-components)
5. [Phased Implementation (Weeks 1-10)](#phased-implementation-weeks-1-10)
6. [Integration Strategy](#integration-strategy)
7. [Technical Decisions](#technical-decisions)
8. [Success Criteria & Go/No-Go Checkpoints](#success-criteria--gono-go-checkpoints)
9. [Risk Mitigation](#risk-mitigation)
10. [Team Structure & Responsibilities](#team-structure--responsibilities)
11. [Dependencies & Prerequisites](#dependencies--prerequisites)

---

## Vision & Goals

**Mission:** Build a production-grade, provider-agnostic AI agent orchestration platform that unifies multiple LLM providers (Claude, Gemini, Antigravity, OpenClaw) under a single pane of glass, with shared memory (Memex ZeroRAG) and intuitive knowledge visualization (Galaxy Obsidian).

**Goals:**
- ✅ Support 5+ LLM providers via pluggable adapter pattern
- ✅ Zero-hallucination retrieval via Memex ZeroRAG with source attribution
- ✅ Intuitive knowledge graph visualization (Galaxy-style) for agent memory
- ✅ Operator-grade RBAC, cost tracking, and audit trails
- ✅ Production hardening: 500+ unit tests, CI/CD, security scanning
- ✅ Trivial onboarding for new LLM providers (2-3 weeks per adapter)

**Alignment:** 8/10 with Julian Goldie's Agent OS pattern (Goal Mode, Kanban orchestration, shared memory, multi-agent coordination)

---

## What is AgentForge Mission Control

### The Problem
Current agent orchestration dashboards are:
- **Vendor-locked** — tied to one LLM provider
- **Fragmented** — no shared memory across agents
- **Silent** — no visibility into agent coordination
- **Expensive** — redundant processing across isolated agents

### The Solution
AgentForge Mission Control is a **unified orchestration hub** that:

1. **Coordinates multiple AI agents** across different LLM providers (Claude CLI, Gemini CLI, Antigravity, OpenClaw, CrewAI, LangGraph, AutoGen)
2. **Shares memory** via Memex ZeroRAG — all agents index and search the same knowledge base with source attribution
3. **Visualizes coordination** via Galaxy Obsidian — interactive knowledge graph showing agent activity, memory relationships, and team dynamics
4. **Enforces operator control** via RBAC, sandboxing, cost limits, and audit trails
5. **Reduces cost** by letting agents learn from each other's work instead of re-running the same analyses

### Who Is It For?
- **Security operators** running red-team agents (T3MP3ST-style orchestration)
- **Research teams** coordinating multi-LLM analysis (Claude + Gemini + custom models)
- **DevOps/SRE teams** automating incident response with shared learnings
- **Product teams** running multi-LLM content pipelines (SEO, marketing, analysis)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (32 UI Panels)                 │
│            Next.js 16 / React 19 / TypeScript 5                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │   Event Bus    │
         │  (WebSocket/   │
         │     SSE)       │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┬──────────────┬──────────────┐
    │            │            │              │              │
┌───▼────┐ ┌─────▼───┐ ┌──────▼────┐ ┌─────▼───┐ ┌────────▼───┐
│ Claude │ │ Gemini  │ │Antigravity│ │OpenClaw │ │  CrewAI/   │
│  CLI   │ │  CLI    │ │  Adapter  │ │ Gateway │ │ LangGraph  │
│Adapter │ │Adapter  │ │           │ │         │ │ Adapters   │
└──┬─────┘ └────┬────┘ └──────┬────┘ └────┬────┘ └────────┬───┘
   │            │             │           │               │
   └────────────┼─────────────┼───────────┼───────────────┘
                │
    ┌───────────▼────────────┐
    │  Framework Adapters    │
    │  (Common Interface)    │
    └───────────┬────────────┘
                │
    ┌───────────▼─────────────┐
    │   Multi-Gateway Orchestration Layer  │
    │  (Task dispatch, cost tracking,     │
    │   audit, security eval)             │
    └───────────┬─────────────┘
                │
    ┌───────────┼─────────────────────┬──────────────┐
    │           │                     │              │
┌───▼────┐ ┌───▼──────┐  ┌───────────▼────┐  ┌────▼──────┐
│  SQLite │ │Memex ZR  │  │ Galaxy Obsidian│  │ Security  │
│   DB    │ │(Qdrant)  │  │   (Vis Layer)  │  │  Audit    │
└─────────┘ └──────────┘  └────────────────┘  └───────────┘
```

### Data Flow

```
Operator Input
    ↓
UI Form → Event Bus
    ↓
Framework Adapter → CLI Dispatch / API Call
    ↓
LLM Provider (Claude/Gemini/etc.)
    ↓
Tool Execution → Sandbox (allowlist, budget, cwd)
    ↓
Output → Memory Indexing (Memex)
    ↓
Dashboard Update via Event Bus
    ↓
Galaxy Visualization (knowledge graph update)
```

### Component Interactions

**CLI Dispatch Loop (per agent, per task):**
```
1. Operator creates/assigns task via Kanban
2. getAssignments() polls for work
3. Sandbox options resolved (tools, budget, cwd)
4. CLI invoked: claude code --task "..." --allowedTools [...] --maxBudgetUsd [...] --cwd [...]
5. Output captured (stdout/stderr/logs)
6. reportTask() sends results back
7. Dashboard updates via event bus
8. Memory indexed (Memex)
9. Galaxy refreshes (new nodes/edges)
```

---

## Core Components

### 1. Framework Adapters (Provider-Agnostic Interface)

**Purpose:** Normalize all LLM providers to a common interface.

**Interface:**
```typescript
interface FrameworkAdapter {
  readonly framework: string
  
  // Register new agent/provider
  register(agent: AgentRegistration): Promise<void>
  
  // Keep-alive signal + metrics
  heartbeat(payload: HeartbeatPayload): Promise<void>
  
  // Report task completion + output
  reportTask(report: TaskReport): Promise<void>
  
  // Fetch pending work from Mission Control
  getAssignments(agentId: string): Promise<Assignment[]>
  
  // Cleanup on disconnect
  disconnect(agentId: string): Promise<void>
}
```

**Implementations (Phase 1-2):**
- ✅ OpenClaw (reference impl, 50 lines)
- ✅ CrewAI (framework integration)
- ✅ LangGraph (graph-based agents)
- ✅ AutoGen (multi-agent conversations)
- 🔄 Claude CLI Adapter (local CLI dispatch)
- 🔄 Gemini CLI Adapter (local CLI dispatch)
- 🔄 Antigravity Adapter (local runtime)
- ⭕ Generic Fallback (REST polling)

**Key Pattern:**
Adding a new adapter = 200-300 lines of code (2-3 weeks engineering).

### 2. CLI Tool Integration (Sandboxing & Dispatch)

**Purpose:** Execute AI work in isolated environments with hard resource limits.

**Sandbox Options:**
```typescript
interface CliDispatchSandboxOptions {
  allowedTools: string[] | null        // whitelist (Task, Bash, Read, etc.)
  maxBudgetUsd: number | null          // per-task budget ceiling
  cwd: string | null                   // workspace isolation
  timeout: number | null               // execution timeout (seconds)
  environment: Record<string, string>  // env vars to pass
}
```

**Invocation Pattern (Production-Grade):**
```bash
claude code --task "Analyze security findings" \
  --allowedTools Task,Bash,Read \
  --maxBudgetUsd 5.00 \
  --cwd /workspace/projects/foo \
  --timeout 300
```

**Implementation Details:**
- File: `src/lib/task-dispatch.ts` (500 lines, battle-tested)
- Features:
  - Tool allowlisting (whitelist by name)
  - Budget enforcement (stops execution if cost exceeds limit)
  - Workspace isolation (tasks only access designated cwd)
  - Timeout protection (kills process after X seconds)
  - Output capture (stdout/stderr piped to Mission Control DB)
  - Error recovery (reportTask marks failures, judge can re-plan)

### 3. Multi-Runtime Session Discovery

**Purpose:** Auto-detect agent runtimes from local filesystem without manual registration.

**Scanner Pattern:**
```typescript
function scanClaudeCodeSessions(): ProviderSession[] {
  const configPath = `${homedir()}/.claude/projects/`
  // Parse session state files
  // Return normalized sessions array
  // Each session auto-registers on first heartbeat
}
```

**Supported Runtimes:**
- `~/.claude/projects/` → Claude Code sessions
- `~/.codex/agents/` → Codex CLI sessions
- `~/.hermes/profiles/` → Hermes agent profiles
- `~/.opencode/` → OpenCode runtime
- `~/.gemini-cli/` → Gemini CLI (Phase 2)
- `~/.antigravity/` → Antigravity (Phase 2)
- OpenClaw Gateway (API-driven)

**Implementation:** `src/lib/sessions.ts` (400 lines, pluggable)

### 4. Real-Time Event Bus

**Purpose:** Broadcast live updates to all dashboard clients via WebSocket/SSE.

**Event Types (100+):**
```
agent.registered
agent.heartbeat
agent.status_changed     → drives agent panel refresh
agent.disconnected

task.created
task.assigned
task.started
task.updated             → drives Kanban board refresh
task.completed
task.failed
task.escalated           → drives alert system

memory.indexed           → drives Galaxy refresh
memory.queried
memory.relationship_discovered

cost.accumulated
cost.threshold_exceeded  → alerts operator
```

**Implementation:**
- File: `src/lib/event-bus.ts`
- Transport: WebSocket (primary, persistent), SSE (fallback)
- Subscribers: Dashboard panels, logging, audit trail, analytics

### 5. Memex ZeroRAG (Shared Memory & Retrieval)

**Purpose:** All agents write their work to a common knowledge base, eliminating duplicate effort and enabling continuous learning.

**What is ZeroRAG?**
- **Zero-hallucination:** Only returns factual information from indexed sources
- **Source attribution:** Every answer includes: "source: task_id #42, confidence: 0.95"
- **Confidence scoring:** 0.0-1.0 scale (1.0 = ground truth from multiple agents, 0.5 = single agent observation, 0.2 = low signal)

**Memory Schema:**
```typescript
interface MemoryChunk {
  id: string                           // UUID
  content: string                      // Text or structured data
  
  agent_id: string                     // Which agent created this
  task_id: string                      // Which task produced it
  session_id: string                   // Session context
  
  timestamp: Date                      // When created
  updated_at: Date                     // Last refresh
  
  tags: string[]                       // [agent_type, task_type, domain, ...]
  confidence: number                   // 0.0-1.0
  sources: Array<{                     // Provenance chain
    type: 'task' | 'agent' | 'external'
    id: string
    confidence: number
  }>
  
  embeddings: number[]                 // Vector for semantic search
  metadata: Record<string, any>        // Custom per-domain
}
```

**API Endpoints:**
```
POST   /api/memory/index               # Index new memory chunk
GET    /api/memory/search?q=...        # Semantic + keyword search
GET    /api/memory/:id                 # Retrieve chunk + provenance
DELETE /api/memory/:id                 # Archive memory (soft delete)
GET    /api/memory/stats               # Memory health dashboard
```

**Backend:** Qdrant vector DB (embedded SQLite for v1.0, can scale to separate service)

**Use Cases (Phase 1):**
1. **Vulnerability Discovery:** Agents find vuln X → index. Next agent searches "auth bypass" → finds X was already found, skips redundant work.
2. **Feature Design:** Multiple agents propose solutions → index with confidence scores → operator picks highest-confidence design.
3. **Duplicate Prevention:** Agents query "did we already analyze domain.com?" → finds prior assessment, integrates findings.
4. **Continuous Learning:** Each task outcome becomes training data for future tasks.

### 6. Galaxy Obsidian (Knowledge Visualization)

**Purpose:** Intuitive visualization of agent memory clusters, relationships, and activity timelines.

**Visualization Layers:**

**Layer 1: Galaxy View (3D Knowledge Graph)**
- Nodes: Memory chunks (colored by domain/type)
- Edges: Relationships (cross-references, dependencies)
- Camera: Force-directed layout (repulsion + attraction)
- Interaction: Hover for preview, click for detail panel
- Performance: <200ms for 10K+ nodes via level-of-detail culling

**Layer 2: Agent Filter**
- Toggles per agent
- Highlights nodes created by selected agents
- Grays out other nodes (optional transparency)
- Use case: "Show me everything Claude found about this domain"

**Layer 3: Tag Filter**
- Multi-select tags (vulnerability, exploit, architecture, etc.)
- Combines with agent filter
- Use case: "Show me high-confidence vulns found by security agents in last 7 days"

**Layer 4: Timeline Scrubber**
- Slider from project start to now
- Galaxy animates to show memory growth over time
- Use case: "When did we discover this vulnerability?"

**Layer 5: Relationship Explorer**
- Click a node → show its neighbors (1-hop, 2-hop, 3-hop)
- Query: "Which vulns lead to this RCE?"
- Shows the discovery chain

**Implementation:**
- Framework: Three.js or Babylon.js (3D rendering)
- Layout: D3.js force-directed or custom physics
- File: `src/components/GalaxyPanel.tsx` (1000-1500 lines)
- Data source: `/api/memory/graph` (returns nodes + edges in D3 format)

---

## Phased Implementation (Weeks 1-10)

### Phase 1: Foundation & Adapter Scaffolds (Weeks 1-2)

**Owner:** Engineer A + Joerg  
**Deliverables:**
- [x] Fork builderz-labs/mission-control → agentforge/mission-control
- [ ] Update branding (package.json, README, docs)
- [ ] Set up CI/CD (GitHub Actions, lint/test/build/deploy)
- [ ] Extend runtime types (add `gemini`, `antigravity`, `claude-cli`)
- [ ] Create adapter stubs (empty implementations, tests that fail)
- [ ] Design sessions scanner extension points
- [ ] Document adapter pattern (architecture guide)

**Acceptance Criteria:**
- Repo builds and tests pass (existing tests)
- New adapters compile (stubs return errors, caught by tests)
- CI/CD pipeline runs on every PR
- Architecture guide reviewed by Joerg

**Estimated Effort:** 2 weeks (Engineer A + Joerg)

---

### Phase 2: Claude CLI & Gemini CLI Adapters (Weeks 2-4)

**Owner:** Engineer A  
**Deliverables:**

**Claude CLI Adapter:**
- [ ] `src/lib/adapters/claude-cli.ts` (200-300 lines)
- [ ] Session scanner: `src/lib/sessions.ts` (extend for `~/.claude/projects/`)
- [ ] CLI dispatch: `src/lib/task-dispatch.ts` (extend for Claude-specific tool sandboxing)
- [ ] Runtime type: Add `claude-cli` to `VALID_RUNTIMES`
- [ ] Tests: 30+ unit tests covering happy path, errors, timeouts, budget enforcement
- [ ] Integration test: E2E flow from task creation to result in dashboard

**Gemini CLI Adapter:**
- [ ] `src/lib/adapters/gemini-cli.ts` (200-300 lines, follow Claude pattern)
- [ ] Session scanner: `~/.gemini-cli/` support
- [ ] CLI dispatch: Tool allowlist + budget (Gemini-specific options)
- [ ] Runtime type: Add `gemini-cli` to `VALID_RUNTIMES`
- [ ] Tests: 30+ unit tests
- [ ] Integration test: E2E flow

**Acceptance Criteria:**
- Both adapters pass all 60+ tests
- E2E test: Create task via dashboard → dispatched to CLI → result appears in dashboard
- Cost tracking works for both providers
- Kanban board updates in real-time as agent works

**Estimated Effort:** 3 weeks (Engineer A full-time)

---

### Phase 3: Antigravity Adapter & Multi-Gateway Orchestration (Weeks 3-5)

**Owner:** Engineer A  
**Deliverables:**
- [ ] `src/lib/adapters/antigravity.ts` (200-300 lines)
- [ ] Session scanner: `~/.antigravity/` support
- [ ] Multi-gateway orchestration: Load balancing across Claude/Gemini/Antigravity
- [ ] Cost attribution per provider (dashboard breakdown)
- [ ] Provider health monitoring (heartbeat timeouts, retry logic)
- [ ] Fallback strategy (if Gemini unavailable, retry on Claude)
- [ ] Tests: 40+ multi-provider coordination tests

**Acceptance Criteria:**
- 3-adapter coordination E2E test (one task per provider, all complete successfully)
- Cost dashboard shows per-provider breakdown
- Failover works (if one adapter offline, others continue)
- Load balancing distributes tasks evenly

**Estimated Effort:** 2-3 weeks (overlaps with Phase 2)

---

### Phase 4: Enhanced CLI Integration & Security (Weeks 4-6)

**Owner:** Engineer A (weeks 4-5), Engineer B (weeks 5-6)  
**Deliverables:**
- [ ] Tool allowlist expansion (support all 20+ Claude Code tools)
- [ ] Budget enforcement hardening (prevent spending cap bypass)
- [ ] Workspace isolation: Verify tasks cannot escape sandbox
- [ ] Timeout handling: Graceful shutdown, output capture on timeout
- [ ] Environment variable injection (allow safe env vars per task)
- [ ] Audit logging: Every CLI invocation logged to SQLite
- [ ] Security scanning: Static analysis of tasks before dispatch
- [ ] Tests: 50+ security-focused tests

**Acceptance Criteria:**
- 100% tool allowlist coverage
- Negative tests pass: tasks cannot escape sandbox
- Timeout test: long-running task killed at limit, output preserved
- Audit log contains: task_id, agent_id, tool_names, budget_usd, status, output_summary

**Estimated Effort:** 2 weeks (overlaps with Phase 3)

---

### Phase 5: Cost Tracking & Operator Dashboard (Weeks 5-7)

**Owner:** Engineer B  
**Deliverables:**
- [ ] Cost model per provider (tokens → USD)
- [ ] Real-time cost aggregation
- [ ] Dashboard panel: Cost breakdown by provider/agent/task/domain
- [ ] Alerts: Budget exceeded, anomalous spending
- [ ] Export: CSV of costs for billing/chargeback
- [ ] Trend analysis: Cost per task over time (is optimization working?)
- [ ] Tests: 30+ cost calculation tests

**Acceptance Criteria:**
- Cost dashboard populated with real data (CI/CD runs tasks, costs tracked)
- Alert triggers when spend exceeds threshold
- CSV export is parseable and complete
- Cost trends show over 4-week window

**Estimated Effort:** 2 weeks (overlaps with Phase 4)

---

### Phase 6: UI Enhancements & Operator Experience (Weeks 6-8)

**Owner:** Engineer C  
**Deliverables:**
- [ ] Kanban board: Drag-and-drop tasks between columns
- [ ] Agent panel: Live status, recent tasks, performance metrics
- [ ] Task detail panel: Full task context, cost, output, tool usage
- [ ] Memory search panel: Semantic + keyword search with confidence scores
- [ ] Cost dashboard: Charts and trends (Chart.js / D3)
- [ ] Responsive design: Mobile-friendly operator interface
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Dark mode: Theme toggle persistence
- [ ] Tests: 40+ UI integration tests (React Testing Library)

**Acceptance Criteria:**
- Kanban board works (drag-drop, auto-updates)
- Agent panel shows live data from event bus
- Cost dashboard renders 4-week trend
- Mobile viewport: <1024px renders correctly
- Keyboard navigation works (tab, enter, arrow keys)

**Estimated Effort:** 2-3 weeks (overlaps with Phase 5)

---

### Phase 7: Testing & Security Audit (Weeks 7-8)

**Owner:** Engineer A + Engineer B + QA  
**Deliverables:**
- [ ] Unit tests: 200+ (target 80%+ coverage on adapters, dispatch, event bus)
- [ ] Integration tests: 50+ (multi-adapter flows, E2E scenarios)
- [ ] Security tests: 30+ (sandbox escape, budget bypass, injection)
- [ ] Performance tests: 10+ (memory leaks, event bus throughput, query latency)
- [ ] Load tests: Simulate 10+ concurrent agents
- [ ] Security audit: Static analysis (ESLint security plugins, npm audit)
- [ ] Dependency review: Audit all 50+ dependencies for vulnerabilities
- [ ] Documentation review: APIs match implementation

**Acceptance Criteria:**
- Test suite runs in <5 min
- Coverage >80% on mission-critical paths
- Security audit: 0 high/critical findings
- Load test: 10 agents, 1000 tasks/hour, <500ms p99 latency

**Estimated Effort:** 1-2 weeks (overlaps with Phase 6)

---

### Phase 8: Memex ZeroRAG Integration (Weeks 7-9, Parallel)

**Owner:** Engineer B  
**Deliverables:**

**Week 7: Architecture & Lifecycle**
- [ ] Design Memex integration API (index, search, retrieve, delete)
- [ ] Qdrant setup: Embedded SQLite for v1.0 (can upgrade to separate service)
- [ ] Memory schema: MemoryChunk type with embeddings, confidence, sources
- [ ] Task lifecycle hooks: `onTaskComplete` → auto-index memory
- [ ] Agent integration: Agents can query memory before planning
- [ ] Tests: 20+ memory schema tests

**Week 8: Integration Endpoints & Search**
- [ ] `POST /api/memory/index` — Index memory chunk (embedding generation)
- [ ] `GET /api/memory/search?q=...` — Semantic + keyword search
- [ ] `GET /api/memory/:id` — Retrieve chunk + provenance chain
- [ ] `DELETE /api/memory/:id` — Soft delete (archive)
- [ ] `GET /api/memory/stats` — Health dashboard (total chunks, search latency, coverage)
- [ ] Embedding generation: Use local model (sentence-transformers) or API
- [ ] Tests: 40+ endpoint tests, mock queries

**Week 9: Memory E2E & Optimization**
- [ ] E2E test: Task completes → output indexed → search finds it
- [ ] Deduplication: If similar chunk exists, merge metadata (confidence voting)
- [ ] Pruning: Soft-delete stale chunks (<0.2 confidence, >90 days old)
- [ ] Performance optimization: Index latency <500ms, search <100ms
- [ ] Dashboard: Memory stats panel (total indexed, search accuracy, trending tags)
- [ ] Tests: 30+ E2E + performance tests

**Acceptance Criteria:**
- Memory index grows as tasks complete
- Search returns relevant results with confidence >0.7
- Provenance chain is complete and accurate
- Index latency <500ms, search latency <100ms for 10K chunks
- Dashboard shows real memory growth

**Estimated Effort:** 3 weeks (Engineer B, overlaps with UI work)

---

### Phase 9: Galaxy Obsidian Visualization (Weeks 8-10, Parallel)

**Owner:** Engineer C  
**Deliverables:**

**Weeks 8-9: Galaxy Panel & Clustering**
- [ ] 3D galaxy rendering: Three.js or Babylon.js
- [ ] Force-directed layout: Nodes repel/attract based on similarity
- [ ] Node coloring: By domain, type, agent, confidence
- [ ] Edge drawing: Relationships (is_related_to, depends_on, refutes, etc.)
- [ ] Performance: Level-of-detail culling, <200ms render for 10K nodes
- [ ] Interaction: Hover (preview), click (detail panel), drag (explore)
- [ ] Agent filter: Toggle agents, highlights/grays nodes
- [ ] Tag filter: Multi-select tags, combined filtering
- [ ] Tests: 30+ rendering + interaction tests (Playwright visual regression)

**Week 9-10: Timeline, Explorer & Polish**
- [ ] Timeline scrubber: Animate galaxy from t=0 to now
- [ ] Relationship explorer: Click node → show 1/2/3-hop neighbors
- [ ] Search integration: Highlight search results in galaxy
- [ ] Export: Screenshot, 3D model (GLB format)
- [ ] Mobile: Simplified 2D graph view
- [ ] Performance: Streaming large graphs (paginated loading)
- [ ] UX polish: Tooltips, legend, keyboard shortcuts
- [ ] Tests: 20+ UX + performance tests

**Acceptance Criteria:**
- Galaxy renders 10K nodes smoothly (<200ms)
- Filtering works (agent, tag, search)
- Timeline animation is smooth and intuitive
- Relationship explorer reveals discovery chains
- Mobile view is usable (2D layout)

**Estimated Effort:** 3 weeks (Engineer C, overlaps with CLI work)

---

### Phase 10: Final Polish & v1.0.0 Release (Week 10)

**Owner:** Entire team  
**Deliverables:**
- [ ] Release notes: Feature summary, breaking changes, migration guide
- [ ] Deployment guide: Self-hosted on Docker/K8s
- [ ] Operations manual: Monitoring, scaling, backup/restore
- [ ] Known issues & roadmap: v1.1 preview
- [ ] Blog post: Launch announcement (Julian Goldie alignment, multi-LLM story)
- [ ] Video tutorial: 5-min walkthrough of key features
- [ ] Final security audit: Pen test of dashboard, CLI dispatch
- [ ] Production hardening: Error handling, graceful degradation
- [ ] Performance tuning: Profiling, optimization
- [ ] Team retrospective: What went well, what to improve

**Acceptance Criteria:**
- All tests pass on main branch
- 0 high/critical security findings
- Documentation complete and reviewed
- Team agrees "ready for production"
- v1.0.0 tag created, released on GitHub

**Estimated Effort:** 1 week (final sprint)

---

## Integration Strategy

### Memex ↔ Mission Control
- **On task completion:** `reportTask()` → trigger `POST /api/memory/index`
- **Before task planning:** Agent queries `GET /api/memory/search?q=<goal>` → uses prior findings
- **Result:** Compounding intelligence — each task makes future tasks cheaper

### Galaxy ↔ Memex
- **Live dashboard:** `/api/memory/graph` endpoint returns nodes + edges
- **Galaxy panel:** Subscribes to `memory.indexed` events → incremental updates
- **Filter integration:** Tag/agent filters apply to both memory search and galaxy visualization
- **Result:** Operator has complete visibility into what agents know and how knowledge connects

### Event Bus ↔ All Components
- **CLI dispatch:** Task dispatch → broadcast `task.updated` → Kanban + Galaxy refresh
- **Memory indexing:** Chunk indexed → broadcast `memory.indexed` → Galaxy adds node
- **Agent registration:** New agent online → broadcast `agent.registered` → agent panel updates
- **Result:** Real-time coordination, no polling

### CLI Dispatch ↔ Security Audit
- **Pre-dispatch:** Security scanner evaluates task (static analysis)
- **During dispatch:** Tool allowlist enforced, budget capped, workspace isolated
- **Post-dispatch:** Output scanned for sensitive data before storage
- **Audit logging:** Every invocation recorded for compliance

---

## Technical Decisions

### 1. Why Fork Mission Control Instead of Building From Scratch?

**Decision:** Fork builderz-labs/mission-control as foundation

**Rationale:**
| Aspect | Mission Control | From Scratch |
|--------|---|---|
| Battle-tested code | 577 tests, 2+ years production | 0 tests |
| Security architecture | Four-layer eval framework | TBD |
| Operator UX | 32 panels, fully designed | Design work needed |
| Provider extensibility | Adapter pattern, proven | Would need to invent |
| Team velocity | 4-5 weeks to multi-LLM | 3+ months |
| Dependencies | SQLite only (zero external) | Varies |
| Production use | Builderz + MUTX | None |

**Risk:** Coupling to Mission Control's architecture (mitigated by clean adapter interface)

**Upside:** Get from PoC to production in 10 weeks instead of 6+ months

---

### 2. Why Memex ZeroRAG Over Traditional RAG?

**Decision:** Zero-hallucination retrieval with source attribution + confidence scoring

**Rationale:**
- **Zero-hallucination:** Operators need facts, not plausible-sounding guesses. Memex only returns indexed data.
- **Source attribution:** "This vuln was found by Agent X in task #42 with 95% confidence" → operator can audit and verify
- **Confidence voting:** Multiple agents assess the same thing → Memex aggregates findings (1 agent = 0.5 confidence, 3 agents agree = 0.95 confidence)
- **Reduces redundant work:** Agents query before planning — "has anyone else analyzed this domain?" — yes, here's what we found

**Risk:** Requires careful indexing (garbage in = garbage out). Mitigated by confidence thresholds and operator review.

**Upside:** Compound intelligence — each agent makes future agents smarter.

---

### 3. Why Galaxy Visualization Over Matrix/Spreadsheet?

**Decision:** 3D force-directed knowledge graph visualization

**Rationale:**
- **Intuitive:** Operators can see clusters of related findings at a glance
- **Scalable:** Works for 100-100K memory chunks (unlike tables that max at 1K visible rows)
- **Pattern discovery:** Humans are visual — clusters reveal connections faster than queries
- **Audit trail:** Timeline shows evolution of knowledge over time
- **Operational awareness:** "What has the team learned?" → galaxy tells the story

**Risk:** Requires GPU/WebGL (mitigated by fallback 2D view on older browsers)

**Upside:** Makes shared memory *discoverable*, not just searchable.

---

### 4. Why Qdrant for Vector Storage?

**Decision:** Qdrant vector DB (embedded SQLite for v1.0, scale to separate service later)

**Rationale:**
- **Embedded deployment:** v1.0 is self-contained (single binary, no external services)
- **Production-ready:** Qdrant is battle-tested, used by OpenAI, Anthropic, others
- **Semantic search:** Native support for similarity search over embeddings
- **REST API:** Easy to integrate with Node.js dashboard
- **Scalability:** Can upgrade from embedded to distributed cluster when needed (no code changes)

**Risk:** Embedded SQLite will slow down at >100K chunks (mitigated by Week 2 roadmap: split to separate Qdrant service)

**Upside:** Zero external dependencies for v1.0 launch.

---

### 5. Why Adapter Pattern for LLM Providers?

**Decision:** Common FrameworkAdapter interface for all providers (Claude, Gemini, Antigravity, OpenClaw, etc.)

**Rationale:**
- **Extensibility:** Adding a new provider = implement 5 methods, write tests, done
- **Decoupling:** Each adapter is independent; one failing doesn't break others
- **Testing:** Mock adapters for unit tests, real adapters for integration tests
- **Cost tracking:** Consistent cost reporting across all providers

**Risk:** If providers diverge too much, adapter layer becomes complex. Mitigated by starting with similar providers (Claude CLI, Gemini CLI).

**Upside:** Trivial onboarding for new providers (2-3 weeks per adapter, not 3 months).

---

### 6. Why SQLite for Audit/Task Storage?

**Decision:** SQLite as primary DB (zero external dependencies, ACID guarantees)

**Rationale:**
- **Zero ops:** No database server to run/monitor/patch
- **ACID guarantees:** Transactions, consistency, durability
- **Scalability:** SQLite handles 10K+ concurrent connections fine (verified in Mission Control tests)
- **Backup:** Simple file copy for backup/restore
- **Compliance:** Audit logs immutable (append-only)

**Risk:** SQLite doesn't scale beyond single-machine concurrency (mitigated by Week 3 roadmap: optional PostgreSQL swap)

**Upside:** Self-hosted on any machine, zero cloud dependencies, operator has complete control.

---

## Success Criteria & Go/No-Go Checkpoints

### Week 4 Checkpoint: Claude CLI Adapter Working End-to-End

**Must-Haves:**
- [ ] Fork complete, CI/CD pipeline green
- [ ] Claude CLI adapter passes 40+ tests
- [ ] E2E: Create task → dispatch to Claude CLI → result in dashboard
- [ ] Cost tracking works (task shows USD amount)
- [ ] Kanban updates in real-time as task progresses

**Go/No-Go Decision:**
- **GO:** If all above pass → proceed to Gemini + Antigravity adapters
- **NO-GO:** If any above fails → pause Phase 2, fix root issues (ask for 1 week)

**Owner:** Joerg (decision)

---

### Week 7 Checkpoint: 3 Adapters + Memex Planning Complete

**Must-Haves:**
- [ ] Claude, Gemini, Antigravity adapters all pass 80+ tests
- [ ] Multi-provider orchestration working (tasks assigned intelligently)
- [ ] Cost dashboard shows per-provider breakdown
- [ ] Memex architecture reviewed + approved
- [ ] Galaxy mockups approved by Joerg + team

**Go/No-Go Decision:**
- **GO:** If all above pass → full sprint on Memex + Galaxy
- **NO-GO:** If Memex/Galaxy design feedback is major → pause Phase 8-9, redesign (1 week)

**Owner:** Joerg (decision)

---

### Week 10 Checkpoint: v1.0.0 Ready for Production

**Must-Haves:**
- [ ] All tests pass (200+ unit + 50+ integration)
- [ ] Security audit: 0 high/critical findings
- [ ] Performance: <500ms for all endpoints (p99)
- [ ] Memex: 10K+ chunks indexed, search latency <100ms
- [ ] Galaxy: Renders 10K nodes smoothly, <200ms per frame
- [ ] Documentation complete (README, user guide, ops manual)
- [ ] Team retrospective complete, v1.0.0 released

**Go/No-Go Decision:**
- **GO:** Release to GitHub + announce publicly
- **NO-GO:** If critical bugs found → 1-week bugfix sprint, re-checkpoint

**Owner:** Joerg (final approval)

---

## Risk Mitigation

### Risk 1: Adapter Integration Complexity
**Risk:** New adapters (Gemini, Antigravity) require custom logic for each provider, Phase 2 overruns.

**Mitigation:**
- Start with Claude CLI (simplest provider, gives us reference impl)
- Document adapter pattern exhaustively (examples, tests, checklist)
- Week 2.5 checkpoint: CLI dispatch proven before Gemini starts

**Owner:** Engineer A

---

### Risk 2: Memex Performance Degrades at Scale
**Risk:** Qdrant embedded SQLite becomes bottleneck at 100K+ chunks.

**Mitigation:**
- Build with upgrade path in mind (Qdrant client library is DB-agnostic)
- v1.0 cap at 50K chunks (auto-archive old findings)
- v1.1 roadmap: Split Qdrant to separate service (no code changes needed)
- Monitor: Week 8 performance test with 20K chunks

**Owner:** Engineer B

---

### Risk 3: Galaxy Rendering Lags With Large Graphs
**Risk:** 10K+ nodes → <200ms render time unachievable with naive implementation.

**Mitigation:**
- Implement level-of-detail rendering (full detail near camera, simplified far away)
- Use WebWorker for layout calculations (off-main-thread)
- Streaming large graphs (paginated loading of nodes)
- Week 9 performance test with 10K nodes, optimize before release

**Owner:** Engineer C

---

### Risk 4: Team Turnover Mid-Project
**Risk:** Engineer A leaves after Phase 3 → Gemini/Antigravity adapters stall.

**Mitigation:**
- Document adapter pattern in code + architecture guide
- Pair programming on Phase 2 (Engineer A + Joerg) for knowledge transfer
- Onboard replacement engineer on adapter pattern in Week 2
- Build adapter tests exhaustively (replacement can follow test-driven pattern)

**Owner:** Joerg (oversight)

---

### Risk 5: Mission Control Upstream Changes Break Fork
**Risk:** builderz-labs merges breaking changes → agentforge fork becomes stale.

**Mitigation:**
- Plan for quarterly rebase cycles (cherry-pick upstream fixes)
- Mark divergence points in code (comments for adapter interface, event bus)
- Stay in communication with upstream (GitHub discussions)
- Test regularly against new Mission Control releases (Week 8 checkpoint)

**Owner:** Engineer A

---

### Risk 6: Security Audit Reveals Vulnerabilities
**Risk:** Phase 7 security audit finds critical issues → slips release.

**Mitigation:**
- Use proven security practices from Mission Control (reference impl)
- Security tests throughout (not just Week 7) — Phase 4 security focus
- Early pen test (Week 5, before full feature set)
- Bug bounty plan (v1.0 release) to catch edge cases

**Owner:** Engineer B (with security consultant)

---

## Team Structure & Responsibilities

### Joerg (Architect, 60% allocation)
**Responsibility:** Strategic direction, design decisions, code review, team coordination

**Weekly Activities:**
- Mon: Architecture standup (Gemini/Antigravity design, blockers)
- Wed: Code review (adapters, CLI integration, memory API)
- Fri: Retrospective + planning (next week priorities)
- On-demand: Go/no-go checkpoints, design decisions, escalations

**Deliverables:**
- Adapter architecture guide (Week 1)
- Memex integration design (Week 7)
- Galaxy visualization requirements (Week 8)
- Go/no-go decisions (Weeks 4, 7, 10)

---

### Engineer A (Adapter Specialist, 100% allocation)
**Responsibility:** Framework adapters, CLI dispatch, multi-gateway orchestration

**Phase 1-2:** Claude CLI + Gemini CLI adapters  
**Phase 3:** Antigravity adapter + multi-gateway logic  
**Phase 4-5:** CLI security hardening + cost tracking  
**Phase 7:** Testing + security audit  
**Phase 8-10:** Support Memex/Galaxy as needed

**Key Deliverables:**
- Adapter pattern reference impl (Week 1-2)
- Claude CLI adapter (Week 2-3)
- Gemini CLI adapter (Week 3-4)
- Antigravity adapter (Week 4-5)
- 80+ adapter tests passing (Week 4)
- Cost tracking dashboard (Week 5)

---

### Engineer B (Memory & Security, 100% allocation)
**Responsibility:** Memex ZeroRAG, security hardening, cost tracking, testing

**Phase 4-5:** Security hardening, cost tracking (support Engineer A)  
**Phase 7:** Testing lead, security audit  
**Phase 8-9:** Memex ZeroRAG implementation (primary owner)  
**Phase 10:** Final testing, production hardening

**Key Deliverables:**
- Cost model implementation (Week 5)
- Memex architecture design (Week 7)
- Memory indexing API (Week 8)
- Memory search + retrieval (Week 8-9)
- 50+ memory tests passing (Week 9)
- Security audit results (Week 7)

---

### Engineer C (UI & Visualization, 100% allocation)
**Responsibility:** Operator dashboard, Galaxy visualization, UX/accessibility

**Phase 5-6:** Kanban board, cost dashboard, agent panel  
**Phase 7:** Testing, accessibility audit  
**Phase 8-10:** Galaxy visualization (primary owner)  
**Phase 10:** Final UX polish, mobile responsiveness

**Key Deliverables:**
- Enhanced dashboard panels (Week 5-6)
- Responsive design, dark mode (Week 6)
- Galaxy rendering (Week 8-9)
- Filtering + timeline (Week 9)
- 40+ UI tests passing (Week 9)
- Mobile view (Week 10)

---

### QA / Security (50% allocation, optional)
**Responsibility:** Test planning, security testing, performance testing

**Activities:**
- Week 5: Test strategy review
- Week 7: Full security audit (pen test, static analysis)
- Week 8-9: Load testing, performance profiling
- Week 10: Final release validation

**Recommended if:** Budget allows, or previous security incidents require extra diligence

---

## Dependencies & Prerequisites

### External Dependencies (Before Fork)

**GitHub Setup:**
- [ ] Create `agentforge` GitHub organization (or use personal account)
- [ ] Set up branch protection rules (require tests + code review)
- [ ] Configure GitHub Actions (CI/CD pipeline)

**Infrastructure:**
- [ ] Provision staging server (for CI/CD deployments)
- [ ] Set up monitoring (Prometheus/Grafana optional, helpful for performance tracking)
- [ ] Backup strategy defined (SQLite snapshots)

**Team:**
- [ ] 3 engineers assigned (confirmed for 10 weeks)
- [ ] QA (optional) available Week 5-10
- [ ] Joerg available 60% for architecture/reviews

**Knowledge:**
- [ ] Team familiar with TypeScript + Next.js (or willing to learn)
- [ ] One engineer familiar with CLI tools (Claude, Gemini) — typically the adapter specialist
- [ ] Understanding of vector DBs helpful but not required (Qdrant docs sufficient)

### Software Dependencies

**Runtime:**
- Node.js 20+ LTS
- npm or pnpm
- Claude CLI (for testing Claude adapter)
- Gemini CLI (for testing Gemini adapter)
- Antigravity CLI (for testing Antigravity adapter)

**Development:**
- TypeScript 5+
- Jest (testing)
- React Testing Library (UI tests)
- Playwright (E2E tests, visual regression)
- ESLint + Prettier (code quality)

**Libraries (from Mission Control baseline):**
- Next.js 16
- React 19
- Zustand (state management)
- Tailwind CSS (styling)
- Qdrant Client (vector DB)
- Zod (validation)
- Three.js or Babylon.js (3D rendering, added for Galaxy)
- D3.js (force-directed layout, added for Galaxy)

**All dependencies managed in package.json — see README for full list**

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| **Adapter** | Implementation of FrameworkAdapter interface for a specific LLM provider (Claude, Gemini, etc.) |
| **Agent** | Autonomous AI system powered by an LLM, registered in Mission Control |
| **Memex** | Shared knowledge base indexed by all agents; zero-hallucination retrieval with source attribution |
| **Galaxy** | 3D knowledge graph visualization showing agent memory clusters and relationships |
| **Task** | Unit of work assigned to an agent (e.g., "Analyze security findings") |
| **Kanban** | Visual workflow board showing tasks in stages (Triage → Outline → Draft → Visuals → Review → Publish) |
| **ZeroRAG** | Retrieval-augmented generation that only returns factual data from indexed sources, no hallucination |
| **CLI Dispatch** | Subprocess invocation of Claude/Gemini/etc. CLI with sandboxing (tool allowlist, budget caps) |
| **Event Bus** | Real-time message broker (WebSocket/SSE) for dashboard updates |
| **Sandbox** | Isolated execution environment with tool allowlist, budget limit, workspace isolation |
| **Confidence** | 0.0-1.0 score indicating reliability of a memory chunk (1.0 = ground truth, 0.5 = single agent, 0.2 = low signal) |
| **RBAC** | Role-based access control (viewer/operator/admin roles) |
| **Qdrant** | Open-source vector database for semantic search over embeddings |

---

## Version History

- **v0.0.0** — Project inception, planning phase complete
- **v1.0.0** — Target release Week 10 (all phases complete)
- **v1.1.0** — Post-launch enhancements (split Memex to separate service, more providers, advanced features)

---

**Document prepared by:** Claude Code + Joerg  
**Last updated:** 2026-07-07  
**Next review:** 2026-07-14 (after Phase 1 completion)
