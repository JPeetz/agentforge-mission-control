# AgentForge Mission Control

**Provider-agnostic AI agent orchestration platform with shared memory and knowledge visualization.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Planning-orange.svg)](#status)
[![Tests](https://img.shields.io/badge/Tests-577+-brightgreen.svg)](package.json)

---

## What Is Mission Control?

AgentForge Mission Control is a **unified orchestration hub** for coordinating multiple AI agents across different LLM providers (Claude, Gemini, Antigravity, OpenClaw, and more).

### The Problem
- **Vendor lock-in** — tied to one LLM provider
- **Memory silos** — agents can't learn from each other's work
- **Invisible coordination** — no visibility into multi-agent workflows
- **Expensive redundancy** — agents re-run analyses others already completed

### The Solution
1. **Multi-LLM Orchestration** — Route tasks to Claude, Gemini, Antigravity, or any provider
2. **Shared Memory (Memex)** — All agents index and search the same knowledge base
3. **Knowledge Visualization (Galaxy)** — Interactive 3D graph showing memory relationships
4. **Operator Control** — RBAC, cost tracking, sandboxing, and audit trails
5. **Continuous Learning** — Each task outcome makes future tasks cheaper and smarter

---

## Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm or pnpm
- Claude CLI (for testing)

### Installation
```bash
git clone https://github.com/agentforge/mission-control.git
cd mission-control
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

---

## Key Features

### 🔌 Provider-Agnostic Adapters
- Claude CLI, Gemini CLI, Antigravity, OpenClaw, CrewAI, LangGraph, AutoGen
- Add a new provider in 2-3 weeks via FrameworkAdapter interface

### 📋 Kanban Orchestration
- Stages: Triage → Outline → Draft → Visuals → Review → Publish
- Auto-advance tasks, visible blockages

### 💾 Memex ZeroRAG (Shared Memory)
- Zero-hallucination retrieval with source attribution
- Confidence scoring (0.0-1.0)
- Semantic search + keyword matching
- Compounding intelligence

### 🌌 Galaxy Visualization
- 3D force-directed knowledge graph
- Agent/tag/confidence filtering
- Timeline scrubber
- Relationship explorer
- Renders 10K+ nodes smoothly

### 🔒 Operator Infrastructure
- RBAC (Viewer/Operator/Admin)
- Cost tracking (per-provider breakdown)
- Tool sandboxing + workspace isolation
- Complete audit logging
- Security evaluation framework

### 📊 Real-Time Dashboards
- 32 UI panels
- WebSocket + SSE event bus
- Live task progress, costs, team activity
- Mobile-responsive, dark mode

---

## Configuration

### Environment Variables
```bash
DATABASE_URL=sqlite:./mission-control.db
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Cost tracking per provider
CLAUDE_COST_PER_1K_INPUT_TOKENS=0.003
CLAUDE_COST_PER_1K_OUTPUT_TOKENS=0.015
GEMINI_COST_PER_1K_TOKENS=0.00025

# Security
MAX_BUDGET_USD_PER_TASK=100
MAX_TASK_TIMEOUT_SECONDS=300
ALLOWED_TOOLS=Task,Bash,Read,Write,Edit
```

---

## Documentation

- **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** — Full 10-week roadmap
- **[DEVLOG.md](./DEVLOG.md)** — Development session notes
- **[CHANGELOG.md](./CHANGELOG.md)** — Version history
- **[NOTES.md](./NOTES.md)** — Technical deep-dives
- **[USER_GUIDE.md](./docs/USER_GUIDE.md)** — How to use Mission Control
- **[FAQ.md](./docs/FAQ.md)** — Common questions

---

## Architecture

### Adapter Pattern
```typescript
interface FrameworkAdapter {
  register(agent): Promise<void>
  heartbeat(payload): Promise<void>
  reportTask(report): Promise<void>
  getAssignments(agentId): Promise<Assignment[]>
  disconnect(agentId): Promise<void>
}
```

Adding a new provider = 200-300 lines (2-3 weeks)

### Component Stack
- **UI:** Next.js 16 + React 19 + Tailwind CSS (32 panels)
- **Events:** WebSocket + SSE (100+ types)
- **Adapters:** Provider implementations
- **Orchestration:** Task dispatch, cost tracking, security
- **Storage:** SQLite (tasks) + Qdrant (memory vectors)
- **Visualization:** Three.js (Galaxy) + D3.js (layouts)

---

## Status

### Current Phase: Planning (July 2026)
- ✅ Architecture design complete
- ✅ Fork ready to execute
- ⏳ Phase 1: Foundation (Weeks 1-2)
- ⏳ Phase 2-10: Adapters, Memex, Galaxy (Weeks 2-10)

### Timeline
- **v0.0.0** — Planning (NOW)
- **v0.1.0** — Early access with Claude CLI (Week 4)
- **v0.5.0** — Multi-LLM support (Week 7)
- **v1.0.0** — Full release (Week 10)

---

## Team

- **Joerg** — Architect (60%)
- **Engineer A** — Adapters & CLI (100%)
- **Engineer B** — Memory & Security (100%)
- **Engineer C** — UI & Visualization (100%)
- **QA** — Testing (50%, optional)

---

## Security

### Design Principles
- **Defense in depth** — Multiple layers
- **Least privilege** — Minimal permissions
- **Transparency** — Complete audit trail
- **Local-first** — All data stays local (SQLite)

### Threat Mitigation
| Threat | Mitigation |
|--------|-----------|
| Malicious task | Security scanner + review |
| Tool abuse | Allowlist enforced at CLI |
| Budget overrun | Hard cap at dispatch |
| Workspace escape | Sandbox isolation |
| Audit tampering | Append-only logs |

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Task dispatch latency | <500ms |
| Dashboard update | <100ms |
| Memory search | <100ms |
| Galaxy render (10K nodes) | <200ms |
| API endpoints (p99) | <50ms |

---

## Support

- **[FAQ](./docs/FAQ.md)** — Common questions
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** — Debug issues
- **[GitHub Issues](https://github.com/agentforge/mission-control/issues)** — Bug reports

---

## Roadmap

### v1.0 (Week 10)
- Multi-LLM orchestration (Claude, Gemini, Antigravity)
- Memex ZeroRAG shared memory
- Galaxy knowledge visualization
- Operator dashboards + RBAC
- Complete audit trails

### v1.1 (Post-Launch)
- Scale Memex to distributed Qdrant
- Additional adapters
- Advanced memory features
- Mobile app

### v2.0+ (Future)
- Autonomous Goal Mode
- Computer use agents
- Multi-agent debates
- Content repurposing

---

## License

MIT License — [LICENSE](./LICENSE)

---

**Built with ❤️ by AgentForge Team**  
**v0.0.0 — Planning Phase**  
**Last Updated:** 2026-07-07
