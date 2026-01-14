# Feature Integration: Planning Session → Context Kiln

**Purpose**: This document maps features discussed in the original planning session (from x-copilot-proxy project) to Context Kiln's implementation roadmap.

**Background**: During the planning session for x-copilot-proxy, we identified several novel features for an AI coding assistant. Context Kiln is the implementation of that vision.

---

## Feature Mapping

### ✅ Already Implemented in Context Kiln

| Feature | Planning Doc | Context Kiln | Status |
|---------|--------------|--------------|--------|
| **Multi-agent/Multi-session Support** | Required for 3+ parallel tasks | Session system with UUID-based sessions | ✅ Implemented |
| **File System Integration** | Full local access, drag-and-drop | File tree + drag to context | ✅ Implemented |
| **Lightweight Editing** | Monaco editor, quick fixes | Monaco integration (Phase 3) | 🟡 Planned |
| **Chat-First UI** | Chat as primary interface | Three-pane layout, chat center | ✅ Implemented |
| **Session Management** | Ticket-based sessions | Project/.context-kiln/sessions/ | ✅ Implemented |
| **Token Counting** | Pre-flight estimation | TokenCounterService + tiktoken | ✅ Implemented |

---

### 🟡 Planned for Context Kiln

| Feature | Planning Doc | Context Kiln Roadmap | Target |
|---------|--------------|---------------------|--------|
| **Token Budget & Planning** | Pre-flight cost, budgets, analytics | Phase 6 (v2.0) | 2026-04-01 |
| **Context Optimization Engine** | Suggest file removals, dedupe | Phase 6c | 2026-04 |
| **Historical Analytics** | Burn rate, forecasting | Phase 6d | 2026-04 |
| **Budget-Aware Model Selection** | Auto-switch to cheaper models | Phase 6e | 2026-04 |
| **Visual Budget Indicators** | Session tab badges (🟢🟡🔴) | Phase 6e | 2026-04 |
| **Copilot Proxy Integration** | Enterprise locked-down CLI | v2.5 Enterprise | 2026-05-01 |

---

### ⚪ Deferred or Not Applicable

| Feature | Planning Doc | Context Kiln Status | Reason |
|---------|--------------|-------------------|--------|
| **Delegation System** | Parent/child agents | Not planned yet | Complex, low MVP value |
| **Code & Markdown Preview** | Live preview, diff view | Partial (Monaco has diff) | Lower priority |
| **Multi-agent tabs** | 3+ simultaneous agents | Sessions are serial | Different architecture approach |

---

## Architecture Differences

### Planning Session Vision
```
┌─────────────────────────────────────┐
│  File Tree  │  Chat Tabs  │ Context │
│             │  [Agent 1]  │         │
│             │  [Agent 2]  │         │
│             │  [Agent 3]  │         │
└─────────────────────────────────────┘
```
**Concept**: Multiple agents running simultaneously in tabs, each with own context

---

### Context Kiln Implementation
```
┌─────────────────────────────────────┐
│  File Tree  │  Chat/Editor │ Context│
│             │  Session: X  │         │
│             │  (Tabbed)    │         │
└─────────────────────────────────────┘
```
**Approach**: Single active session at a time, switch between sessions via dropdown

**Why Different**: 
- Simpler mental model (one conversation focus)
- Session files enable long-running tasks without parallel context
- Can still switch between tasks quickly via session selector
- Cleaner implementation for MVP

**Future**: Could add multi-session tabs in v3.5+ if users demand it

---

## Novel Features: Status Update

### Pre-flight Cost Estimation ⭐
**Original Vision**: Show cost before sending any request

**Context Kiln Plan**: Phase 6b (v2.0)
- Modal/panel before sending message
- Breakdown: files + prompt + history
- Monthly budget percentage
- "Optimize" / "Send Anyway" / "Cancel" buttons

**Status**: Fully specified in docs/features/token-budgeting.md

---

### Context Optimization Engine ⭐
**Original Vision**: "Remove package-lock.json? (-8K tokens)"

**Context Kiln Plan**: Phase 6c (v2.0)
- ContextOptimizerService with rules engine
- Suggestions panel in UI
- One-click auto-optimize
- User can override

**Status**: Fully specified in docs/features/token-budgeting.md

---

### Budget Forecasting ⭐
**Original Vision**: "You'll run out on Jan 23rd at current rate"

**Context Kiln Plan**: Phase 6d (v2.0)
- Analytics dashboard
- Burn rate calculation
- Projection based on daily average
- Recommendations (switch models, archive conversations)

**Status**: Fully specified in docs/features/token-budgeting.md

---

## Integration Points

### Where Planning Session Features Live in Context Kiln

| Feature | File/Component | Phase |
|---------|----------------|-------|
| **Token Counting** | src/services/TokenCounterService.js | Phase 1 ✅ |
| **Session Management** | src/services/SessionService.js | Phase 1 ✅ |
| **File Operations** | src/services/FileService.js | Phase 1 ✅ |
| **Database Tracking** | src/services/DatabaseService.js | Phase 1 ✅ |
| **Multi-Provider** | src/services/adapters/*.js | Phase 1 ✅ |
| **Pre-flight Modal** | src/components/PreflightModal.jsx | Phase 6b ⏳ |
| **Budget Indicators** | src/components/SessionBudgetIndicator.jsx | Phase 6e ⏳ |
| **Analytics Dashboard** | src/components/UsageDashboard.jsx | Phase 6d ⏳ |
| **Context Optimizer** | src/services/ContextOptimizerService.js | Phase 6c ⏳ |

---

## How to Add Copilot Proxy Support

### Current: x-copilot-proxy
**What It Does**: OpenAI-compatible wrapper around `copilot` CLI
**Runs On**: http://localhost:3030/v1
**Models**: claude-sonnet-4.5, claude-sonnet-4, claude-haiku-4.5, gpt-5

### Integration into Context Kiln (v2.5)

**Step 1**: Create CopilotProxyAdapter
```javascript
// src/services/adapters/CopilotProxyAdapter.js
export class CopilotProxyAdapter extends BaseAdapter {
  constructor(apiKey = 'dummy') {
    super('copilot-proxy', 'http://localhost:3030/v1');
  }
  
  async sendMessage(messages, context, options) {
    // Use OpenAI SDK pointing at localhost:3030
    const client = new OpenAI({
      baseURL: 'http://localhost:3030/v1',
      apiKey: 'dummy' // Not validated by proxy
    });
    
    // Format and send
    return client.chat.completions.create({
      model: options.model || 'claude-sonnet-4.5',
      messages: this.formatMessages(messages, context)
    });
  }
}
```

**Step 2**: Register Adapter
```javascript
// In src/services/AIProviderService.js
import { CopilotProxyAdapter } from './adapters/CopilotProxyAdapter.js';

// During initialization
this.registerAdapter(new CopilotProxyAdapter());
```

**Step 3**: UI Configuration
- Add "Copilot Proxy (Enterprise)" to provider dropdown
- Settings: "Proxy URL" field (default: http://localhost:3030/v1)
- Auto-detect if proxy is running (health check)

**Step 4**: Model Selection
- Query /v1/models endpoint
- Display available models
- User selects from proxy's model list

**Benefit**: Works with company's approved Copilot subscription, no legal friction

---

## Token Budgeting: Detailed Comparison

### Planning Session Requirements
```
┌─────────────────────────────────────┐
│ Context Summary                     │
├─────────────────────────────────────┤
│ Files: 3 (12,450 tokens)           │
│ Prompt: 250 tokens                  │
│ Conversation history: 3,200 tokens  │
│ ─────────────────────────────────  │
│ Total Input: ~15,900 tokens         │
│                                     │
│ Expected response: ~2,000 tokens    │
│ Estimated cost: ~18K tokens         │
│                                     │
│ Monthly budget: 850K / 1M used      │
│ This request: 2.1% of remaining     │
│ ─────────────────────────────────  │
│ ⚠️  Warning: Large context          │
│ 💡 Tip: Remove File X (-4K tokens)  │
│                                     │
│ [Optimize] [Send Anyway] [Cancel]   │
└─────────────────────────────────────┘
```

### Context Kiln Implementation (Phase 6b)
**Component**: `PreflightModal.jsx`
**Triggered**: Before sending message (user clicks Send)
**Data Source**: 
- TokenCounterService.countContextTokens()
- DatabaseService.getProjectUsage('month')
- Settings monthly_budget

**Workflow**:
1. User types message, clicks Send
2. PreflightModal intercepts
3. Count tokens in context (files + message + history)
4. Query current monthly usage
5. Calculate: cost, percentage of budget, projection
6. Show breakdown with warnings/tips
7. User clicks: Optimize → open OptimizationPanel
8. User clicks: Send Anyway → proceed to AI
9. User clicks: Cancel → return to chat

**Novel**: No other tool does this

---

## Success Criteria Evolution

### Original Planning Session
**Goal**: "Token budget lasts the full month"

### Context Kiln v2.0
**Metrics**:
- [ ] Average user saves 30%+ tokens vs no optimization
- [ ] 90% of users stay under budget with warnings enabled
- [ ] Pre-flight modal prevents 50%+ budget overruns
- [ ] Context optimization suggestions accepted 60%+ of time

**Validation**: Compare against control group (v1.0 users without budgeting)

---

## Lessons from Planning Session

### What We Got Right ✅
1. **Adapter Pattern**: Enables multi-provider without refactoring
2. **Session Management**: Solves context window limits elegantly
3. **Token Tracking**: Foundation already built, ready for budgeting
4. **Chat-First UI**: Differentiation from IDE-centric tools

### What Changed 🔄
1. **Multi-agent tabs** → **Multi-session selector**: Simpler, still effective
2. **Parallel agents** → **Sequential sessions**: Clearer mental model
3. **Delegation system** → **Session branching** (future): Better UX

### What's Still Evolving 🤔
1. **Budget enforcement**: Hard limits vs soft warnings?
2. **Context templates**: Pre-defined file sets for common tasks?
3. **Team features**: Shared sessions, budgets, analytics?

---

## Roadmap Alignment

| Planning Session Priority | Context Kiln Version | Timeline |
|---------------------------|---------------------|----------|
| **MVP Core** (chat, files, context) | v1.0 | 2026-02-01 |
| **Token Budgeting** (novel feature) | v2.0 | 2026-04-01 |
| **Enterprise Proxy** (work use case) | v2.5 | 2026-05-01 |
| **Multi-provider** (OpenAI, Ollama) | v1.1, v3.0 | 2026-02, 2026-06 |

**Rationale**: 
- Get MVP working first (3 weeks)
- Add OpenAI support quickly (broad appeal)
- Token budgeting as major differentiator (novel)
- Enterprise features enable corporate adoption

---

## Next Steps

### For MVP (Phase 1-5)
1. ✅ Review Context Kiln's current implementation (done)
2. ✅ Integrate planning session docs (done)
3. ⏳ Complete Phase 1 (React contexts + IPC)
4. ⏳ Implement Phase 2-5 (Claude API → Polish)

### After MVP Launch
1. Dogfood Context Kiln for its own development
2. Gather user feedback on MVP
3. Validate token budgeting demand
4. Plan Phase 6 implementation

### For Enterprise (v2.5)
1. Test x-copilot-proxy integration
2. Document enterprise deployment
3. Add SSO/auth if needed
4. Compliance review (SOC2?)

---

## Questions to Resolve

### Technical
- [ ] Can tiktoken accuracy be improved for Claude? (currently ±5%)
- [ ] Should session budgets be hard limits or soft warnings?
- [ ] How to handle offline mode with proxy dependency?

### Product
- [ ] Is pre-flight modal too intrusive for power users?
- [ ] Should budgeting be opt-in or opt-out?
- [ ] Pricing model for premium features?

### User Experience
- [ ] Session selector dropdown vs tabs? (current: dropdown)
- [ ] Context optimization: auto vs manual?
- [ ] Budget alerts: notifications vs in-app only?

---

## Conclusion

**Context Kiln successfully incorporates the planning session vision** with some architectural refinements:

✅ **Retained**:
- Chat-first UI
- Token budgeting (novel feature)
- Multi-provider support
- Session-based development
- Context optimization

🔄 **Adapted**:
- Multi-session selector instead of parallel agents (simpler)
- Sequential focus instead of true multi-agent (clearer)
- Phase 6 for budgeting instead of MVP (scope management)

⏳ **Deferred**:
- Delegation system (complex, low ROI)
- Multi-agent parallelism (can revisit in v3.5+)

**The core vision remains intact**: A context engineering tool that puts AI conversation first, with novel token budgeting features that no other tool has.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Maintained By**: Context Kiln development team
