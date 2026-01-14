# Token Budgeting & Cost Management Requirements

**Status**: Future Enhancement (Post-MVP)
**Priority**: High (Novel Feature - No other tool has this)
**Target Phase**: Phase 6 - Advanced Features

---

## Overview

Token budgeting is a **novel feature** that provides cost awareness and optimization for AI-powered development. Unlike existing tools that leave users blind to token consumption, Context Kiln will provide pre-flight cost estimation, budget tracking, and intelligent context optimization.

**Why This Matters**:
- Prevents surprise API bills
- Enables sustainable usage patterns
- Teaches users what actually costs tokens
- Provides data-driven model selection

---

## Feature Set

### 1. Pre-flight Cost Estimation ⭐ Core Feature

**Description**: Before sending any request, show the user exactly what it will cost.

**UI Mockup**:
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

**Implementation**:
- Extend TokenCounterService with `estimateRequestCost(context)`
- Add modal/panel in ChatInterface before sending
- Use existing tiktoken integration
- Show breakdown: files + prompt + history
- Calculate percentage of user's monthly budget

**Dependencies**:
- TokenCounterService (✅ already implemented)
- User budget setting (add to settings table)
- Context state (files + messages)

---

### 2. Per-Session Budget Management

**Description**: Allocate token budgets per session/project to prevent overruns.

**Example**:
```javascript
{
  "Session: JIRA-1234-auth-refactor": {
    "allocated": 50000,
    "used": 32000,
    "remaining": 18000,
    "percentUsed": 64,
    "autoStopAt": 45000,  // Warn at 90%
    "warnAt": 40000        // Warn at 80%
  }
}
```

**UI Elements**:
- Budget allocation UI in session creation modal
- Progress bar in session tab showing X/Y tokens used
- Warning badge when approaching limit
- Block sending if over hard limit

**Implementation**:
- Add `budget_allocated` column to sessions table
- Track cumulative usage per session
- UI component: SessionBudgetIndicator
- Settings: enable/disable budget enforcement

---

### 3. Context Optimization Engine ⭐ Novel Feature

**Description**: Analyze context and suggest intelligent removals to save tokens.

**Example Output**:
```
Your context includes:
├─ package-lock.json (8,234 tokens) ❌ Remove? (generated file)
├─ Full git history (2,100 tokens) ❌ Summarize instead?
├─ Old conversation (4,500 tokens) ⚙️  Archive to session files?
├─ Duplicate imports (340 tokens) ❌ Deduplicate?
└─ Code snippets (1,200 tokens) ✅ Keep (relevant)

Potential savings: -14,834 tokens (83% reduction!)
[Auto-optimize] [Review suggestions] [Keep all]
```

**Optimization Rules**:
1. **Generated files**: package-lock.json, yarn.lock, *.min.js → Suggest removal
2. **Large dependencies**: node_modules, vendor → Always exclude
3. **Binary files**: Images, PDFs → Cannot include
4. **Duplicate content**: Same file added multiple times → Deduplicate
5. **Old messages**: Archive messages older than N turns
6. **Summarization**: Offer to summarize long files (keep structure, remove details)

**Implementation**:
- New service: ContextOptimizerService
- Rules engine with configurable heuristics
- UI: Optimization suggestions panel
- One-click "auto-optimize" button
- User can override suggestions

---

### 4. Historical Analytics Dashboard

**Description**: Track token usage over time with charts and insights.

**Dashboard Sections**:

#### A. Monthly Overview
```
This Month (January 2026):
├─ Total: 312K / 1M tokens (31.2%)
├─ By Session:
│  ├─ JIRA-1234 (Refactoring): 145K tokens
│  ├─ JIRA-5678 (Testing): 98K tokens
│  └─ JIRA-9012 (Debugging): 69K tokens
├─ By Model:
│  ├─ Claude Sonnet 3.7: 215K (69%)
│  ├─ Claude Opus 4.5: 67K (21%)
│  └─ Claude Haiku 3.5: 30K (10%)
├─ Burn rate: 34K/day
├─ Projected end-of-month: 1,020K (⚠️  OVER BUDGET)
└─ Recommendation: Switch 50% to Haiku, save 150K tokens
```

#### B. Daily Breakdown Chart
- Line chart showing tokens/day
- Highlight peaks and valleys
- Annotations for major events ("built feature X")

#### C. Cost Breakdown
- Total cost in USD (if using paid APIs)
- Cost per session/project
- Export to CSV for expense reporting

**Implementation**:
- New component: UsageDashboard.jsx
- Charts: Ant Design Charts or recharts
- Query DatabaseService for time-series data
- Add export functionality (CSV, JSON)

---

### 5. Budget-Aware Model Selection

**Description**: Automatically suggest cheaper models when budget is low.

**Logic**:
```javascript
function selectModel(context, budget) {
  const remaining = budget.total - budget.used;
  const percentRemaining = remaining / budget.total;
  
  if (percentRemaining > 0.7) {
    return 'claude-opus-4.5';      // Premium model
  } else if (percentRemaining > 0.3) {
    return 'claude-sonnet-3.7';    // Mid-tier
  } else if (percentRemaining > 0.1) {
    return 'claude-haiku-3.5';     // Economy
  } else {
    return 'BUDGET_EXHAUSTED';     // Block or warn
  }
}
```

**UI Elements**:
- Auto-switch toggle in settings
- Notification: "Switched to Haiku to conserve budget"
- Manual override available
- Budget threshold settings (70%, 30%, 10%)

**Implementation**:
- Add to AIProviderService
- Check budget before each request
- User preference: auto-switch vs warn-only
- Settings: threshold percentages

---

### 6. Visual Budget Indicators

**Description**: At-a-glance status of token budgets throughout the UI.

**Session Tabs**:
```
├─ 🟢 JIRA-1234 (35% budget, healthy)
├─ 🟡 JIRA-5678 (75% budget, warning)
└─ 🔴 JIRA-9012 (95% budget, critical)
```

**Monthly Budget Gauge**:
```
[████████░░] 80% used (200K remaining)
Days left: 21 | Projected: 1.2M (⚠️ 20% over)
```

**Context Panel**:
```
Current context: 15,900 tokens
Limit: 200,000 tokens
[████░░░░░░░░░░░] 8%
```

**Implementation**:
- Badge component with color coding
- Progress bars throughout UI
- Update in real-time as files added
- Tooltip with detailed breakdown

---

## Implementation Phases

### Phase 6a: Foundation (Week 1)
- [ ] Add budget settings to database (monthly budget, session budgets)
- [ ] Extend TokenCounterService with budget tracking
- [ ] Add budget columns to sessions table
- [ ] Create BudgetService for centralized budget logic

### Phase 6b: Pre-flight Estimation (Week 2)
- [ ] Build PreflightModal component
- [ ] Integrate with ChatInterface (show before send)
- [ ] Display token breakdown
- [ ] Show monthly budget impact
- [ ] Add "Send Anyway" / "Optimize" / "Cancel" actions

### Phase 6c: Context Optimization (Week 3)
- [ ] Build ContextOptimizerService
- [ ] Implement optimization rules engine
- [ ] Create OptimizationSuggestionsPanel
- [ ] Add auto-optimize functionality
- [ ] Test with real codebases

### Phase 6d: Analytics Dashboard (Week 4)
- [ ] Create UsageDashboard component
- [ ] Implement time-series charts
- [ ] Add cost calculations
- [ ] Export functionality (CSV/JSON)
- [ ] Filter by project/session/date range

### Phase 6e: Budget Enforcement (Week 5)
- [ ] Implement session budget caps
- [ ] Add auto-model-switching logic
- [ ] Visual budget indicators (badges, gauges)
- [ ] Warning notifications
- [ ] Settings UI for budget configuration

### Phase 6f: Polish & Testing (Week 6)
- [ ] User testing with real workflows
- [ ] Performance optimization
- [ ] Documentation and help text
- [ ] Edge case handling
- [ ] Budget forecasting accuracy tuning

---

## Success Criteria

✅ **User can:**
- See token cost BEFORE sending any message
- Set and track budgets per session
- Get intelligent suggestions to reduce context size
- View usage analytics over time
- Auto-switch to cheaper models when budget is low
- Export usage data for expense tracking

✅ **Quality:**
- Token estimates within 5% of actual usage
- No performance degradation with budget checks
- Budget warnings appear before overruns
- Optimization suggestions save average 30%+ tokens
- Charts load instantly even with months of data

✅ **Novel Value:**
- First AI tool with pre-flight cost estimation
- First to suggest context optimization
- First with session-level budget management
- First with burn-rate forecasting

---

## Future Enhancements (Post-Phase 6)

### Team Budgets
- Shared budget pools for organizations
- Per-user quotas
- Admin dashboard for budget management

### Advanced Analytics
- ML-based usage prediction
- Anomaly detection (unusually high usage)
- Cost attribution by feature/component

### Budget Templates
- Preset budgets for task types (bugfix: 10K, feature: 50K)
- Smart defaults based on historical data
- Budget recommendations based on project size

### Token ROI Tracking
- "This refactor cost 50K tokens but saved 20 hours"
- Value metrics beyond just cost
- Productivity correlation

---

## Technical Considerations

### Token Counting Accuracy
- **tiktoken** approximates Claude tokens (OpenAI tokenizer)
- Actual Claude usage may vary ±5%
- Solution: Calibrate estimates based on actual usage over time
- Display as "~15,900 tokens" (approximate)

### Performance
- Token counting should be fast (<100ms)
- Cache token counts for unchanged files
- Debounce re-counts during rapid file additions
- Background worker for large context analysis

### Storage
- Store budget data in SQLite (usage.db)
- Archive old usage data after 1 year
- Export before archival for historical analysis

### Privacy
- All token data stays local (no cloud analytics)
- User controls data retention
- Export functionality for user's own analysis

---

## References

- **Inspiration**: No existing tool has this feature
- **User Need**: "30% of tokens used by day 9 is unsustainable"
- **Business Value**: Prevents budget overruns, teaches cost awareness
- **Technical Foundation**: TokenCounterService already implemented in Phase 1

---

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Status**: Approved for Phase 6 implementation
**Owner**: Context Kiln development team
