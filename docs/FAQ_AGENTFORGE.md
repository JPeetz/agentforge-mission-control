# FAQ: AgentForge Mission Control

**Frequently Asked Questions and Answers**

---

## General Questions

### Q: What is Mission Control?
**A:** AgentForge Mission Control is a unified orchestration platform for coordinating multiple AI agents across different LLM providers (Claude, Gemini, Antigravity). It provides shared memory (Memex), knowledge visualization (Galaxy), and operator control (RBAC, cost tracking, sandboxing).

---

### Q: How is this different from using Claude Code directly?
**A:** 
- **Claude Code:** Single-agent, interactive chat
- **Mission Control:** Multi-agent orchestration, shared memory, batch task processing
- **Use Mission Control when:** You need multiple agents working simultaneously, want all agents to learn from each other, need cost control/audit trails, operate at scale

---

### Q: Can I use Mission Control without any coding?
**A:** Yes! The dashboard is fully no-code. You create tasks via UI forms, select providers, set budgets, dispatch. The only code is in agent logic (which agents handle automatically).

---

### Q: What's the minimum setup required?
**A:** 
1. Node.js 20+ LTS
2. npm or pnpm
3. One LLM provider (Claude CLI minimum)
4. Optional: Gemini CLI, Antigravity for multi-provider

---

## Task & Agent Questions

### Q: How do I create my first task?
**A:** 
1. Click **War Room** in left sidebar
2. Click **+ New Task**
3. Fill form (title, description, provider, budget, tools)
4. Click **Dispatch**
5. Watch Kanban board for real-time progress

---

### Q: What's the difference between Scope and Evidence?
**A:**
- **Scope:** How broad the task (narrow = focused, broad = exploratory)
- **Evidence:** How rigorous (best-effort = quick, verified = thorough + confirmation)

Example: "narrow scope + verified evidence" = deep dive on one specific thing

---

### Q: Can I assign a task to a specific agent?
**A:** Yes. In the task form, you can either:
- Leave as "Auto-select" (system picks best agent)
- Choose specific agent from dropdown

---

### Q: What happens if an agent goes offline?
**A:** 
- Active tasks complete (finish current work)
- Pending tasks get reassigned to online agent
- Agent status changes to 🔴 Offline
- You can click agent → **Deploy** to bring back online

---

### Q: Can tasks run in parallel?
**A:** Yes! Multiple agents can work on different tasks simultaneously. The dashboard updates in real-time via WebSocket.

---

## Memory & Galaxy Questions

### Q: What is Memex?
**A:** Memex is the shared memory system. All agents index their findings (findings, analyses, insights) so future agents can search and learn from prior work. It's "zero-hallucination RAG" — only returns indexed facts with source attribution.

---

### Q: How does memory search work?
**A:** 
- **Semantic:** Finds conceptually similar findings ("prevent SQL attacks" finds "prepared statements", "input validation")
- **Keyword:** Exact phrase matching ("SQL injection" finds exactly that)
- **Hybrid:** Both (best for discovery)

Default is semantic (better for discovery).

---

### Q: What's the confidence score?
**A:**
- **1.0** = Ground truth (multiple agents agree, human verified)
- **0.7-0.9** = High confidence (multiple agents, good methodology)
- **0.5-0.6** = Medium confidence (single agent, good process)
- **0.2-0.4** = Low confidence (early signal, needs verification)

---

### Q: Why should I use Galaxy instead of just searching memory?
**A:** Galaxy lets you see the *entire knowledge network* at a glance:
- Visual clusters show related findings
- Timeline shows discovery evolution
- Relationship explorer reveals chains ("How did we discover this?")
- Pattern recognition: humans are visual

---

### Q: Can I export Galaxy?
**A:** Yes! Click node → **Export** to save:
- Screenshot (PNG)
- 3D model (GLB/GLTF for importing to Blender, etc.)
- Data (JSON of nodes/edges)

---

## Cost & Budget Questions

### Q: How is cost calculated?
**A:** Per-token costs vary by provider:
- **Claude:** $0.003/1K input tokens, $0.015/1K output tokens
- **Gemini:** $0.00025/1K tokens
- **Antigravity:** $0.0005/1K tokens

Task cost = tokens × rate. Shown in real-time during execution.

---

### Q: What happens if I set a budget too low?
**A:** 
- Agent starts work
- Midway through, spending hits budget cap
- Task is terminated (but output so far is preserved)
- Task marked "BUDGET_EXCEEDED"
- You can retry with higher budget

---

### Q: Can I see cost breakdown per tool?
**A:** Yes! Click task → scroll down → **Cost Breakdown** shows:
- LLM API cost (tokens)
- Tool execution cost (if enabled)
- Total spent vs budget

---

### Q: Which provider is cheapest?
**A:** Roughly:
1. **Gemini** — Cheapest (~$0.00025/1K tokens)
2. **Antigravity** — Medium (~$0.0005/1K)
3. **Claude** — More expensive (~$0.003 input, $0.015 output)

For simple analysis → Gemini. For complex reasoning → Claude.

---

### Q: How do I set alerts for budget overrun?
**A:** 
1. Open **Settings** → **Costs**
2. Set thresholds:
   - Weekly budget: $500
   - Daily budget: $50
   - Per-task max: $10
3. When exceeded → email + in-app alert

---

## Security & Operators

### Q: Is my data safe?
**A:** Yes. Mission Control is:
- **Self-hosted** (all data stored locally in SQLite)
- **No cloud lock-in** (your data stays on your machine)
- **Audit logged** (every operation recorded)
- **Sandboxed** (agents can't escape workspace)

---

### Q: What's RBAC?
**A:** Role-based access control. Three roles:
- **Viewer:** Read-only (see dashboards, search memory, no creation)
- **Operator:** Create/manage tasks, deploy agents
- **Admin:** Full access including user management

Default: you are Admin. Add other users via Settings.

---

### Q: How do I prevent agents from accessing sensitive files?
**A:** Set **workspace isolation** when creating task:
- `--cwd /workspace/projects/foo`
- Agent can only access files under `/workspace/projects/foo`
- Cannot `cd /etc` or other paths

---

### Q: Can I limit which tools agents can use?
**A:** Yes! In task form, checkbox each tool:
- ☑ Read (safe, read-only)
- ☑ Write (medium risk)
- ☑ Bash (high risk, carefully control)
- ☐ Edit (very high risk, usually disable)
- ☑ Task (low risk, agent creates sub-tasks)

Best practice: Enable only what you need.

---

### Q: How do I audit what agents did?
**A:** 
1. Open **Tasks** panel
2. Scroll to **Audit Log**
3. See: every operation, timestamp, user, agent, status
4. Export: Click **Export** → CSV for external storage

---

## Troubleshooting

### Q: Agent says "offline" but it's definitely running
**A:** 
1. Check network connectivity
2. Verify Claude CLI is running: `claude auth login`
3. Check agent logs for errors
4. Restart agent: Click agent → **Deploy**

---

### Q: Memory search is returning irrelevant results
**A:**
1. Try different query terms
2. Reduce confidence threshold (Settings → Memory)
3. Use keyword search instead of semantic
4. Check tags are being used consistently

---

### Q: Galaxy is rendering very slowly
**A:**
1. Reduce nodes: Filter by agent/tag
2. Reduce time range: Settings → Galaxy → "Show last 30 days"
3. Switch to 2D view (Settings → Galaxy → 2D mode)
4. Close other browser tabs to free memory

---

### Q: Task keeps timing out
**A:**
1. Increase timeout (default 300s, max 3600s)
2. Break task into smaller pieces
3. Check for infinite loops in agent logic
4. Check if provider is overloaded (try different provider)

---

### Q: I can't find a task I created earlier
**A:**
1. Open **Tasks** panel (not Kanban)
2. Search by task ID or title
3. Filter by status (completed/failed/pending)
4. Filter by date range

---

## Advanced Questions

### Q: Can I create custom adapters for other LLM providers?
**A:** Yes! It takes 200-300 lines of code and 2-3 weeks. See [Adapter Development](../docs/ADAPTER_DEVELOPMENT.md).

---

### Q: How does confidence aggregation work if multiple agents find the same thing?
**A:** Dempster-Shafer combination: if Agent A (0.7 confidence) and Agent B (0.8 confidence) find same vuln, system combines to 0.94 (agreement increases confidence).

---

### Q: Can I integrate Mission Control with my CI/CD pipeline?
**A:** Not in v1.0, but planned for v1.1. Roadmap includes:
- GitHub Actions integration
- Webhook triggers
- Automated task creation on code merge

---

### Q: What's the maximum number of chunks Memex can handle?
**A:** 
- v1.0: ~100K chunks (embedded Qdrant)
- v1.1+: Millions (distributed Qdrant)

Recommended: Monitor storage, auto-archive after 90 days

---

### Q: Can I export all my memory for backup?
**A:** Yes! Settings → **Backup & Export**:
- Full memory dump (JSON)
- Audit log (CSV)
- SQLite database (raw)

---

## Support

### Q: How do I report a bug?
**A:** 
1. Open **Help** → **Report Bug**
2. Include: steps to reproduce, browser, OS, screenshot
3. Or: GitHub Issues (https://github.com/agentforge/mission-control/issues)

---

### Q: How do I request a feature?
**A:** 
1. Open **Help** → **Request Feature**
2. Describe use case + expected behavior
3. Or: GitHub Issues with [FEATURE] tag

---

### Q: Who do I contact for support?
**A:**
- **Documentation:** [User Guide](./USER_GUIDE.md)
- **Community:** GitHub Discussions
- **Commercial:** Contact: j.peetz69@gmail.com

---

**Last Updated:** 2026-07-07
