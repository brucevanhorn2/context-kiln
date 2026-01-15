# Context Kiln - Action Items

**Generated**: 2026-01-15 (Post-epiphany documentation session)
**Context**: Strategic vision documented, now tracking actionable next steps

---

## Immediate Actions (This Week)

### 1. ✅ Document Strategic Vision
**Status**: COMPLETE
**Files Created**:
- `docs/STRATEGIC-VISION.md` - Comprehensive vision document
- This file (ACTION-ITEMS.md)

**Key Insights Captured**:
- Leapfrog LM Studio, don't just integrate
- Subscription adapters > embedded models in value
- POC proxy (x-copilot-proxy) proves feasibility
- Frontier models remain primary value, local is secondary

---

### 2. ⏳ Locate and Document x-copilot-proxy

**Goal**: Find the POC proxy code and extract learnings

**Known Info**:
- Project name: x-copilot-proxy
- Runs on: http://localhost:3030/v1
- Models: claude-sonnet-4.5, claude-sonnet-4, claude-haiku-4.5, gpt-5
- OpenAI-compatible API
- Wraps GitHub Copilot CLI

**Search Locations**:
- [ ] Check other drives/directories
- [ ] Check OneDrive: "C:\Users\BruceVanHorn\OneDrive - Content4 LLC\upload proxy research.docx"
- [ ] Check git repos elsewhere on system
- [ ] Check old project folders

**What to Document**:
1. How the proxy intercepts CLI commands
2. Authentication flow (how it uses CLI's auth)
3. Model routing logic
4. Request/response transformation
5. Error handling approach

**Output**: Create `docs/X-COPILOT-PROXY-ANALYSIS.md`

---

### 3. ⏳ Complete Phase C (Multi-Step Workflows)

**Goal**: Finish the agentic features before adding new providers

**Estimated Effort**: 5-7 hours

**Tasks**:
- [ ] Task planning and breakdown
- [ ] Multi-step execution with dependencies
- [ ] Error recovery and retry logic
- [ ] Progress tracking UI
- [ ] Rollback capabilities

**Files to Create/Modify**:
- `src/services/WorkflowService.js` (new)
- `src/contexts/WorkflowContext.jsx` (new)
- `src/components/WorkflowPlanner.jsx` (new)
- `src/services/AIProviderService.js` (extend)

**Success Criteria**:
- AI can break down "refactor this module" into 5+ steps
- Each step executes with tool calls
- Failures trigger retry or rollback
- User sees progress indicators

---

### 4. ⏳ Test Phase B with Real Claude API

**Goal**: Verify tool use system works end-to-end

**Prerequisites**:
- Anthropic API key
- Test project with files to edit

**Test Cases**:
1. **Read File**:
   - Ask Claude to read a file
   - Verify contents displayed correctly
   - Check auto-approval works

2. **Edit File**:
   - Ask Claude to fix a bug
   - Verify diff preview shows
   - Approve and check file updated

3. **Create File**:
   - Ask Claude to create a new utility
   - Verify preview and creation

4. **List Files**:
   - Ask Claude what JS files exist
   - Verify listing works

5. **Tool Loop**:
   - Ask Claude to read, then edit same file
   - Verify recursive tool calls work

**Document Results**: Create `docs/PHASE-B-TEST-RESULTS.md`

---

## Short Term Actions (Next 2 Weeks)

### 5. ⏳ Research GitHub Copilot CLI Protocol

**Goal**: Understand how to programmatically interact with Copilot CLI

**Approach**:
1. **Install Copilot CLI** (if not already)
   ```bash
   npm install -g @githubnext/github-copilot-cli
   ```

2. **Run with Verbose Logging**
   ```bash
   copilot --verbose "explain this function"
   ```

3. **Capture Network Traffic**
   - Use Wireshark or mitmproxy
   - Log all HTTP requests
   - Document API endpoints

4. **Study CLI Source Code**
   - Check if CLI is open source
   - Look for API client code
   - Extract request/response formats

5. **Test Edge Cases**
   - Large prompts
   - Streaming responses
   - Error conditions
   - Rate limiting

**Output**: Create `docs/COPILOT-CLI-PROTOCOL.md`

---

### 6. ⏳ Build CopilotProxyAdapter Prototype

**Goal**: Working adapter that uses Copilot subscription

**Prerequisites**:
- Copilot subscription active
- CLI protocol documented (from #5)

**Implementation**:
```javascript
// src/services/adapters/CopilotProxyAdapter.js
class CopilotProxyAdapter extends BaseAdapter {
  constructor() {
    super('copilot-proxy');
    this.cliPath = this.findCopilotCLI();
  }

  findCopilotCLI() {
    // Locate copilot CLI executable
    // Windows: %APPDATA%\npm\copilot.cmd
    // Mac/Linux: /usr/local/bin/copilot
  }

  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    // Spawn CLI process
    // Send prompt via stdin or args
    // Parse streaming output
    // Call onChunk for each token
    // Call onComplete when done
  }

  formatRequest(internalContext, model) {
    // Convert to CLI format
    // May need special syntax
  }
}
```

**Test**:
- Send simple prompt via adapter
- Verify response comes from Copilot
- Check token counting works
- Test error handling

**Output**: Working adapter + test results

---

### 7. ⏳ Build ClaudeCodeProxyAdapter Prototype

**Goal**: Same as #6 but for Claude Code CLI

**Prerequisites**:
- Claude Code subscription active
- CLI protocol reverse-engineered

**Approach**:
1. Install Claude Code CLI (if available)
2. Reverse-engineer protocol (same process as Copilot)
3. Build adapter following CopilotProxyAdapter pattern
4. Test with real subscription

**Note**: Claude Code CLI may not exist yet - research needed

**Alternatives if No CLI**:
- Use Claude Code desktop app API (if exposed)
- Request CLI from Anthropic
- Wait for official API bridge

**Output**: Working adapter or documented blocker

---

## Medium Term Actions (1 Month)

### 8. ⏳ Implement Phase D: Subscription Adapters

**Goal**: Production-ready subscription support

**Prerequisites**:
- CopilotProxyAdapter prototype working (#6)
- ClaudeCodeProxyAdapter prototype working (#7)

**Tasks**:
1. **Generic CLIProxyAdapter Base Class**
   ```javascript
   class CLIProxyAdapter extends BaseAdapter {
     async spawnCLI(args) { /* ... */ }
     async parseStreamingOutput(process) { /* ... */ }
     async handleCLIErrors(error) { /* ... */ }
   }
   ```

2. **Authentication Flow**
   - Detect if CLI is authenticated
   - Trigger auth flow if needed (device code flow)
   - Store credentials securely
   - Handle token refresh

3. **Error Handling**
   - CLI not found
   - Not authenticated
   - Rate limiting
   - CLI crashes

4. **UI Integration**
   - Add "GitHub Copilot (Subscription)" provider
   - Add "Claude Code (Subscription)" provider
   - Settings: CLI path configuration
   - Status indicator (connected/disconnected)

5. **Testing**
   - Unit tests for adapters
   - Integration tests with real CLIs
   - Error scenario testing

**Output**:
- Production-ready subscription adapters
- Documentation for users
- Support for troubleshooting

---

### 9. ⏳ User Testing

**Goal**: Get feedback from developers with subscriptions

**Approach**:
1. **Recruit Beta Testers**
   - GitHub Copilot users (priority)
   - Claude Code users
   - Mix of experience levels

2. **Test Scenarios**
   - Setup and onboarding
   - Daily coding tasks
   - Complex refactors
   - Error recovery

3. **Gather Feedback**
   - What works well?
   - What's confusing?
   - What's missing?
   - Performance issues?

4. **Iterate**
   - Fix critical bugs
   - Improve UX pain points
   - Add requested features

**Output**: User feedback report + prioritized improvements

---

### 10. ⏳ Polish and Bug Fixes

**Goal**: Production-ready quality

**Categories**:
1. **Critical Bugs**
   - Crashes
   - Data loss
   - Security issues

2. **UX Issues**
   - Confusing flows
   - Missing feedback
   - Slow operations

3. **Edge Cases**
   - Large files
   - Network errors
   - Permission issues

4. **Performance**
   - Slow startup
   - Memory leaks
   - Laggy UI

**Process**:
- Track bugs in GitHub Issues
- Prioritize by severity
- Fix in sprints
- Re-test after fixes

---

## Long Term Actions (2-3 Months)

### 11. ⏳ Implement Phase E: Embedded Model Hosting

**Goal**: Host local models without Ollama/LM Studio

**Estimated Effort**: 5-7 hours

**Tasks**:
1. **Install node-llama-cpp**
   ```bash
   npm install node-llama-cpp
   npm run rebuild
   ```

2. **Create LocalModelService**
   ```javascript
   class LocalModelService {
     async loadModel(modelPath, config) {
       this.model = await loadLlama({
         modelPath,
         gpuLayers: config.gpuLayers,
         contextSize: config.contextSize
       });
     }

     async generate(prompt, onToken) {
       for await (const token of this.model.createCompletion(prompt)) {
         onToken(token);
       }
     }
   }
   ```

3. **Build LocalModelAdapter**
   - Wraps LocalModelService
   - Implements BaseAdapter interface
   - Handles model loading/unloading

4. **Create Model Library UI**
   - Browse available models
   - Download models (HuggingFace)
   - Manage local models
   - Configure GPU settings

5. **GPU Detection**
   - Detect CUDA (Windows/Linux)
   - Detect Metal (Mac)
   - Fallback to CPU

**Output**:
- Working embedded model hosting
- Model management UI
- User documentation

---

### 12. ⏳ Beta Release

**Goal**: Limited rollout to early adopters

**Prerequisites**:
- Phase C complete (multi-step workflows)
- Phase D complete (subscription adapters)
- User testing done (#9)
- Critical bugs fixed (#10)

**Release Plan**:
1. **Private Beta** (50 users)
   - Invite-only
   - Active feedback loop
   - Weekly updates

2. **Public Beta** (500 users)
   - Open signups
   - GitHub releases
   - Community support

3. **Feedback Gathering**
   - Usage analytics
   - Bug reports
   - Feature requests

4. **Iterate**
   - Bi-weekly releases
   - Address feedback
   - Improve stability

**Output**: Stable beta version + growing user base

---

### 13. ⏳ Marketing and Positioning

**Goal**: "Use your existing AI subscriptions in a real IDE"

**Channels**:
1. **Developer Communities**
   - Reddit (r/programming, r/webdev)
   - Hacker News
   - Dev.to
   - Twitter/X

2. **Content Marketing**
   - Blog: "Stop Paying Twice for AI"
   - Video: "Context Kiln in 5 Minutes"
   - Tutorial: "Build a Feature with AI Agents"

3. **GitHub Presence**
   - Open source core
   - Good README with screenshots
   - Active issue tracking
   - Community contributions

4. **Partnerships**
   - Reach out to Anthropic (Claude Code)
   - Reach out to GitHub (Copilot)
   - Developer influencers

**Messaging**:
> "Context Kiln: The AI IDE that works with your existing subscriptions. Stop paying twice. Start building better."

**Key Differentiators**:
- ✅ Works with Copilot/Claude Code subscriptions
- ✅ Agentic multi-step workflows
- ✅ Session management for long-running tasks
- ✅ Local + cloud model support

---

## Deferred / Nice to Have

### Token Budget Planning (Phase 6)
**From**: Original planning session (x-copilot-proxy)
**Status**: Deferred to v2.0
**Reason**: MVP first, advanced features later

**Features**:
- Pre-flight cost estimation
- Monthly budget tracking
- Context optimization suggestions
- Burn rate forecasting

**Documentation**: Already specified in docs/features/token-budgeting.md

---

### Multi-Agent Parallel Execution
**Status**: Deferred to v3.5+
**Reason**: Complex, unclear user demand

**Concept**: Run multiple AI agents simultaneously
**Alternative**: Current session switching is simpler

---

### Delegation System
**Status**: Not planned
**Reason**: Complex, low ROI for MVP

**Concept**: Parent agents delegate to child agents
**Alternative**: Multi-step workflows achieve similar goals

---

## Questions to Resolve

### Technical Decisions

1. **CLI vs API Priority**:
   - Should we focus on Copilot CLI first (subscription support)?
   - Or complete Phase C first (multi-step workflows)?
   - **Recommendation**: Phase C first (complete agentic features), then Phase D (subscriptions)

2. **Embedded Models: When?**:
   - Phase E is lower priority than Phase D
   - Should we do it at all?
   - **Recommendation**: After Phase D, if users request it

3. **Authentication Storage**:
   - How to securely store CLI credentials?
   - **Options**: OS keychain (electron-store), encrypted file, system keyring
   - **Recommendation**: electron-store with OS keychain integration (already using for API keys)

### Product Decisions

1. **Pricing Model**:
   - Free tier: BYO subscriptions/API keys
   - Pro tier: What features justify $10-20/month?
   - **Ideas**: Managed API access, team features, priority support

2. **Target Audience**:
   - Corporate developers (Copilot subscriptions)?
   - Indie developers (side projects)?
   - Both?
   - **Recommendation**: Start with both, optimize based on adoption

3. **Open Source Strategy**:
   - Fully open source?
   - Open core (core = OSS, advanced = paid)?
   - **Recommendation**: Open core - subscription adapters OSS, enterprise features paid

---

## Success Metrics

### Phase C Success
- [ ] AI can plan 5+ step refactors
- [ ] 80%+ of planned steps execute successfully
- [ ] Error recovery works without manual intervention
- [ ] Build passes after AI refactor

### Phase D Success
- [ ] Copilot subscription users can use Context Kiln
- [ ] No "pay twice" problem
- [ ] 90%+ uptime for subscription adapters
- [ ] Authentication works seamlessly

### Phase E Success
- [ ] 7B models run at 10+ tokens/sec
- [ ] GPU offloading works on supported hardware
- [ ] Model downloads complete reliably
- [ ] Quality acceptable for experimentation

### Beta Success
- [ ] 100+ active users
- [ ] 60%+ weekly retention
- [ ] <5% crash rate
- [ ] Net Promoter Score > 30

---

## Decision Log

### Decision: Phase C Before Phase D
**Date**: 2026-01-15
**Reasoning**:
- Phase C completes the agentic vision (core value prop)
- Phase D adds new providers (important but secondary)
- Better to have complete features for fewer providers than incomplete features for many

**Result**: Focus on Phase C next

### Decision: Subscription Adapters > Embedded Models
**Date**: 2026-01-15
**Reasoning**:
- Subscriptions solve "pay twice" problem (huge user pain)
- Embedded models are nice-to-have (experimentation use case)
- Frontier models will always be better than local 7B models

**Result**: Phase D higher priority than Phase E

### Decision: Document Everything Now
**Date**: 2026-01-15
**Reasoning**:
- User's shower epiphany is strategically important
- Subscription problem affects most users
- POC proxy proves feasibility
- Need to capture context before it's lost

**Result**: Created STRATEGIC-VISION.md and this file

---

## Timeline Estimate

| Phase | Effort | Start | End | Status |
|-------|--------|-------|-----|--------|
| Phase A | 2 hours | 2026-01-14 | 2026-01-14 | ✅ Complete |
| Phase B | 3 hours | 2026-01-15 | 2026-01-15 | ✅ Complete |
| Phase C | 5-7 hours | 2026-01-15 | 2026-01-16 | ⏳ Next |
| Phase D | 8-10 hours | 2026-01-17 | 2026-01-20 | ⏳ Planned |
| Phase E | 5-7 hours | 2026-01-21 | 2026-01-22 | ⏳ Optional |
| Beta | Ongoing | 2026-01-23 | 2026-02-01 | ⏳ Planned |

**Note**: Timeline assumes ~4 hours/day of focused development

---

## Next Immediate Step

**After documenting vision (complete), the next action is:**

👉 **Choose One**:

**Option A**: Complete Phase C (Multi-Step Workflows)
- Finishes the agentic features
- Makes Context Kiln fully functional as an autonomous coding assistant
- Estimated: 5-7 hours

**Option B**: Locate and Analyze x-copilot-proxy
- Documents the POC proxy approach
- Extracts patterns for Phase D implementation
- Estimated: 2-3 hours

**Option C**: Test Phase B with Claude API
- Verifies tool use system works end-to-end
- Identifies bugs before building Phase C on top
- Estimated: 1-2 hours

**Recommendation**: **Option C** (test Phase B), then **Option A** (finish Phase C), then **Option B** (prep for Phase D)

---

**Document Status**: Living document - update as actions complete
**Last Updated**: 2026-01-15
**Next Review**: After Phase C completion
