# User Guide: AgentForge Mission Control

**Complete guide to using AgentForge Mission Control for AI agent orchestration**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating and Managing Tasks](#creating-and-managing-tasks)
3. [Managing Agents](#managing-agents)
4. [Kanban Board](#kanban-board)
5. [Shared Memory (Memex)](#shared-memory-memex)
6. [Galaxy Visualization](#galaxy-visualization)
7. [Cost Tracking](#cost-tracking)
8. [Security & Operators](#security--operators)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Getting Started

### First Login

1. Navigate to `http://localhost:3000` (or your deployment URL)
2. Default credentials: Check `ADMIN_EMAIL` in `.env.local`
3. You'll land on the **War Room** — the main orchestration dashboard

### Dashboard Overview

The War Room contains:
- **Left Sidebar:** Navigation menu (all 12 core panels)
- **Top Bar:** Current user, workspace, notifications
- **Center Panel:** Active view (Kanban board, agent status, etc.)
- **Right Panel:** Task detail, memory search, or settings

### Navigation Menu

| Section | Purpose |
|---------|---------|
| **War Room** | Main task orchestration view (Kanban board) |
| **Operatives** | Agent roster, status, performance metrics |
| **Arsenal** | Manage available tools and capabilities |
| **Memory** | Search shared knowledge base (Memex) |
| **Galaxy** | Visualize knowledge graph relationships |
| **Tasks** | Full task history and audit log |
| **Costs** | Cost tracking dashboard per provider |
| **Alerts** | System notifications and escalations |
| **Settings** | User preferences, permissions, API keys |

---

## Creating and Managing Tasks

### Step 1: Open War Room

Click **War Room** in left sidebar, then click **+ New Task**

### Step 2: Fill Task Form

```
Title:           "Analyze security findings"
Description:     "Review OWASP top 10 in our codebase"

Provider:        Claude CLI ▼ (or Gemini CLI, Antigravity)
Agent:           Auto-select or choose specific agent

Task Scope:      SCOPE ▼ (how broad: narrow/medium/broad)
Evidence Needed: PROOF ▼ (rigor level: best-effort/confirmed/verified)

Budget:          $5.00  (max spend on this task)
Timeout:         300 seconds (max execution time)

Tools Allowed:   ☑ Task ☑ Bash ☑ Read ☑ Write ☐ Edit
                 ☐ Agent (disable for safety)

Tags:            [security] [code-review] [urgent]
Priority:        High ▼ (High/Normal/Low)
```

### Step 3: Dispatch Task

1. Review settings one more time
2. Click **Dispatch**
3. Task appears on Kanban board in "Triage" column
4. Agent picks it up automatically

### Step 4: Monitor Progress

Real-time updates:
- **Kanban board:** Task moves Triage → Outline → Draft → Visuals → Review → Publish
- **Live log:** Tool executions, outputs, cost updates
- **Cost meter:** Current spend (green=safe, yellow=caution, red=at cap)

### Step 5: Review Results

When task completes:
1. Move to "Review" column
2. Click task card → open detail panel
3. See full output, tool usage, cost breakdown
4. Memory automatically indexed (appears in Memex search)

---

## Managing Agents

### Operatives Panel

Open **Operatives** to see:

| Agent | Status | Tasks | Cost | Last Seen |
|-------|--------|-------|------|-----------|
| claude-cli-agent-1 | 🟢 Online | 23 | $12.34 | 30s ago |
| gemini-cli-agent-1 | 🟢 Online | 8 | $4.56 | 2m ago |
| antigravity-1 | 🔴 Offline | 0 | $0 | 12h ago |

### Agent Actions

**Deploy Agent:**
1. Click agent card
2. Click **Deploy** button
3. Agent starts listening for tasks

**Stop Agent:**
1. Click agent card
2. Click **Stop** (graceful shutdown)
3. Completes current task, then stops

**View Agent History:**
1. Click agent card
2. Scroll down → Task history
3. Filter by status (completed/failed/pending)

---

## Kanban Board

### Board Layout

```
┌──────────────┬──────────────┬────────────┬─────────────┐
│   Triage     │   Outline    │   Draft    │   Visuals   │
├──────────────┼──────────────┼────────────┼─────────────┤
│ ┌──────────┐ │              │            │             │
│ │ Task 123 │ │              │            │             │
│ │ Budget:  │ │              │            │             │
│ │ $5.00    │ │              │            │             │
│ │ Cost:    │ │              │            │             │
│ │ $2.34    │ │              │            │             │
│ └──────────┘ │              │            │             │
└──────────────┴──────────────┴────────────┴─────────────┘
```

### Columns

| Column | Meaning |
|--------|---------|
| **Triage** | New tasks, awaiting assignment |
| **Outline** | Agent assigned, starting work |
| **Draft** | Execution in progress |
| **Visuals** | Generating outputs/visualizations |
| **Review** | Complete, pending human review |
| **Publish** | Approved, results published |

### Dragging Tasks

- Drag task card between columns to manually advance
- Automatic advance when agent completes stage
- Drag task back to previous stage if needs re-work

### Task Card Info

Hover over task card to see:
- Task title + description
- Agent name + provider
- Current spend vs budget
- Estimated time remaining
- Tool count + status
- Priority badge

---

## Shared Memory (Memex)

### Searching Memory

1. Open **Memory** panel (left sidebar)
2. Enter query: "SQL injection" or "auth bypass"
3. Results show within 100ms:

```
Results for "SQL injection" (5 found)

[1] SQL injection in /login endpoint (Confidence: 95%)
    Found by: claude-cli-agent-1 in Task #42
    Tags: [vulnerability] [critical] [auth]
    Created: 3 days ago
    
[2] SQL injection vulnerability comparison (Confidence: 72%)
    Found by: gemini-cli-agent-1 in Task #47
    Tags: [analysis] [security] [comparison]
    Created: 2 days ago
```

### Reading Memory

Click on a memory chunk to see:
- **Full content** — Complete finding or analysis
- **Provenance** — Who found it, which task, confidence score
- **Related chunks** — Similar findings (semantic search)
- **Sources** — Links to original task outputs
- **Tags** — For filtering and discovery

### Memory Features

**Confidence Scoring:**
- 1.0 = Ground truth (verified by multiple agents, confirmed by human)
- 0.7-0.9 = High confidence (multiple agents agree, well-tested)
- 0.5-0.6 = Medium confidence (single agent, good methodology)
- 0.2-0.4 = Low confidence (early signal, needs verification)

**Semantic vs Keyword Search:**
- **Semantic:** "How do we prevent SQL attacks?" → finds "SQL injection" + "prepared statements" + "input validation"
- **Keyword:** "SQL injection" → finds exact phrase only

**Filtering:**
- Agent: Show findings from specific agent
- Tag: Filter by domain (security, feature, analysis, etc.)
- Confidence: Show only high-confidence results
- Time: Last 7/30/90 days

---

## Galaxy Visualization

### Opening Galaxy

1. Click **Galaxy** in left sidebar
2. 3D knowledge graph loads (takes 2-5 seconds for 10K nodes)
3. Force-directed layout shows relationships

### Visualization

**Nodes:**
- Colored by type (red=vulnerability, blue=feature, green=insight)
- Size by importance (confidence × usage)
- Label: first 30 characters of finding

**Edges:**
- Connect related findings
- Thickness: relationship strength
- Direction: shows discovery chains

### Interacting with Galaxy

| Action | Result |
|--------|--------|
| **Hover** | Preview chunk content in tooltip |
| **Click** | Open detail panel with full chunk + sources |
| **Drag camera** | Pan around the graph (left-click drag) |
| **Right-click drag** | Rotate 3D view |
| **Scroll wheel** | Zoom in/out |
| **Double-click node** | Auto-focus on that node + neighbors |

### Filtering Galaxy

**Agent Filter:**
1. Top-left: Select agents (☑ Agent 1 ☑ Agent 2 ☐ Agent 3)
2. Graph highlights selected agents' nodes, grays others

**Tag Filter:**
1. Top-right: Multi-select tags
2. Graph shows only nodes matching tags
3. Tags scroll if too many (use search)

**Confidence Slider:**
1. Bottom-left: Adjust minimum confidence (0.2-1.0)
2. Low-confidence nodes fade out

**Search Highlight:**
1. Search box at top
2. Matching nodes highlighted in gold
3. Auto-zoom to cluster

### Timeline Scrubber

1. Bottom: Timeline slider (2026-01-01 to today)
2. Drag slider to animate galaxy growth over time
3. Watch: nodes appear in order they were discovered
4. Shows: discovery chains and evolution

### Relationship Explorer

1. Click a node
2. Click **Explore Neighbors** in detail panel
3. Choose depth: 1-hop, 2-hop, or 3-hop
4. Galaxy highlights: node → neighbors → neighbors-of-neighbors
5. See: how findings connect

---

## Cost Tracking

### Cost Dashboard

Open **Costs** panel to see:

**Summary:**
```
Total Spend (All Time):  $1,234.56
This Week:               $123.45
Today:                   $12.34
Budget Remaining:        $876.54
```

**Per-Provider Breakdown:**
```
Claude CLI:      $800.00 (65%)  ▓░░░░░░░░░░
Gemini CLI:      $300.00 (24%)  ▓░░░░░░
Antigravity:     $134.56 (11%)  ▓░
```

**Per-Agent Breakdown:**
```
claude-cli-agent-1:   $500.00 (41%)
claude-cli-agent-2:   $300.00 (24%)
gemini-cli-agent-1:   $300.00 (24%)
antigravity-1:        $134.56 (11%)
```

### Cost Per Task

Click task card → see cost breakdown:
```
Task #123: Security Analysis

Claude API (tokens):
  Input:    12,340 tokens × $0.003/1K  = $0.037
  Output:   4,567 tokens × $0.015/1K   = $0.068
  Subtotal: $0.105

Tool Execution:
  Bash runs:  3 × $0.01 = $0.03
  File reads: 12 × $0.005 = $0.06
  Subtotal:  $0.09

Total Cost: $0.195
```

### Setting Budget Alerts

1. Open **Settings** → Costs
2. Set alert thresholds:
   - Weekly budget: $500
   - Daily budget: $50
   - Per-task budget: $10
3. Alerts trigger when exceeded (email + in-app notification)

---

## Security & Operators

### RBAC Roles

**Viewer:**
- Read-only access to dashboards
- Cannot create tasks
- Cannot modify agents
- Can search memory

**Operator:**
- Create and manage tasks
- Deploy/stop agents
- Set budgets and tool allowlists
- Cannot view other users' data
- Cannot modify security settings

**Admin:**
- Full access
- User management
- System configuration
- Security auditing
- Cannot bypass sandbox rules

### Tool Allowlisting

When creating tasks, select which tools agents can use:

| Tool | Risk | Use Case |
|------|------|----------|
| **Read** | Low | Read files, analyze code |
| **Write** | Medium | Generate reports, store findings |
| **Bash** | High | Run commands, interact with CLI |
| **Edit** | High | Modify files in workspace |
| **Task** | Low | Create sub-tasks, delegate work |
| **Agent** | High | Deploy other agents (usually disabled) |

**Best Practice:** Start with minimal set (Read + Task), add only if needed

### Audit Log

1. Open **Tasks** panel
2. Scroll to **Audit Log** tab
3. See: every operation, timestamp, user, status

```
2026-07-07 14:23:45  User: joerg  Action: task.created  Task: #123  Status: OK
2026-07-07 14:23:50  Agent: claude-cli-1  Action: task.started  Task: #123  Status: OK
2026-07-07 14:25:12  Agent: claude-cli-1  Action: task.completed  Task: #123  Status: OK
2026-07-07 14:25:13  System: memory.indexed  Chunks: 3  Confidence: 0.85+
```

---

## Troubleshooting

### Common Issues

#### Issue: "Agent offline, cannot dispatch task"

**Cause:** Agent heartbeat timed out (30s without response)

**Solution:**
1. Open Operatives panel
2. Click offline agent
3. Click **Deploy** to restart
4. Check agent logs for errors
5. If persistent, check network connectivity

---

#### Issue: "Task timeout, execution killed"

**Cause:** Task execution exceeded timeout limit (default: 300s)

**Solution:**
1. Review task output (partial results preserved)
2. Increase timeout (if task needs more time)
3. Reduce task scope (break into smaller tasks)
4. Check for infinite loops in agent logic

---

#### Issue: "Budget exceeded, task stopped"

**Cause:** Task spending exceeded budget cap

**Solution:**
1. Review cost breakdown
2. Increase budget (if task is necessary)
3. Use cheaper provider (if available)
4. Reduce task complexity or tool usage

---

#### Issue: "Memory search returns no results"

**Cause:** No similar findings indexed yet, or low confidence threshold

**Solution:**
1. Reduce confidence threshold (Settings → Memory)
2. Try keyword search instead of semantic
3. Use different query terms
4. Run more tasks to populate memory

---

#### Issue: "Galaxy rendering slowly (lag)"

**Cause:** Too many nodes (>20K) or GPU underperforming

**Solution:**
1. Reduce time range (Settings → Galaxy → Show last N days)
2. Filter by agent/tag (reduces visible nodes)
3. Use simpler 2D view (Settings → Galaxy → 2D mode)
4. Upgrade GPU or use system with better graphics

---

## Best Practices

### Task Design

✅ **DO:**
- Create focused, single-purpose tasks
- Set realistic budgets (based on task complexity)
- Use descriptive titles and descriptions
- Tag tasks for easy filtering
- Start with conservative tool allowlists

❌ **DON'T:**
- Create vague tasks ("Analyze everything")
- Set budget too low (task fails mid-execution)
- Allow all tools by default (security risk)
- Ignore budget alerts
- Rerun identical tasks (check memory first!)

### Memory Management

✅ **DO:**
- Search memory before creating new tasks
- Tag findings consistently (same tags across team)
- Review low-confidence results before acting
- Archive outdated findings

❌ **DON'T:**
- Ignore confidence scores
- Act on unverified findings (confidence <0.5)
- Create duplicate findings
- Forget to tag findings

### Cost Optimization

✅ **DO:**
- Review cost dashboard weekly
- Set per-task budgets based on scope
- Use cheaper providers when possible (Gemini < Antigravity < Claude)
- Consolidate small tasks into one

❌ **DON'T:**
- Set budgets too high (encourages waste)
- Ignore provider cost differences
- Create long-running tasks without monitoring
- Retry failed tasks without investigation

### Security

✅ **DO:**
- Review task before dispatch (especially with Bash tool)
- Use minimal tool allowlists
- Audit log regularly (check for anomalies)
- Rotate API keys monthly
- Set workspace isolation (--cwd)

❌ **DON'T:**
- Enable all tools by default
- Allow agents to modify sensitive files
- Ignore security alerts
- Share admin credentials
- Run untrusted tasks

---

**End of User Guide**

For additional help:
- **[FAQ](./FAQ.md)** — Common questions
- **[Troubleshooting](./TROUBLESHOOTING.md)** — Error solutions
- **[Operations Manual](./OPERATIONS.md)** — Admin tasks
