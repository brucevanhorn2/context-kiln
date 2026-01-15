# Context Kiln - Strategic Vision

**Date**: 2026-01-15
**Context**: Post-shower epiphany + subscription vs API reality check

---

## The Epiphany: Leapfrog, Don't Integrate

### Initial Thinking (Wrong)
> "Let's integrate with LM Studio and Ollama to give users local model access"

**Problem**: This positions Context Kiln as just another VS Code competitor with AI bolt-ons.

### The Epiphany (Right)
> "Don't hook into LM Studio - **leapfrog LM Studio** in features and usability"

**Insight**: LM Studio only does model hosting. We can do model hosting + code editor + agentic features + context management + sessions. **All in one app.**

### Competitive Positioning

**Before**: Context Kiln = VSCode + Ollama/LM Studio integration
**After**: Context Kiln = LM Studio + VSCode + Cursor + Unique features

| Feature | LM Studio | Cursor | GitHub Copilot | Context Kiln Vision |
|---------|-----------|--------|----------------|---------------------|
| Model Hosting | ✅ Yes | ❌ Cloud only | ❌ Cloud only | ✅ **Yes** |
| Code Editor | ❌ No | ✅ Yes | ✅ Yes (IDE plugin) | ✅ **Yes** |
| Local Models | ✅ Yes | ❌ No | ❌ No | ✅ **Yes** |
| Cloud Models | ❌ No | ✅ Yes | ✅ Yes | ✅ **Yes (both!)** |
| Tool Use | ❌ No | ✅ Yes | ⚠️ Limited | ✅ **Yes** |
| Context Management | ❌ Basic | ❌ Basic | ❌ Very limited | ✅ **Advanced** |
| Sessions | ❌ No | ❌ No | ❌ No | ✅ **Yes** |
| Agentic Workflows | ❌ No | ⚠️ Limited | ❌ No | ✅ **Full** |
| Subscription Support | N/A | ❌ API only | ⚠️ IDE-locked | ✅ **Proxy adapters** |

---

## The Subscription Problem (Critical Insight)

### The Reality Most Users Face

**Scenario 1: The Corporate Developer**
- Has GitHub Copilot subscription via employer ($10-20/month)
- Subscription is for IDE/CLI tools, **NOT the API**
- Can't install unapproved software at work
- Corporate policies: months to approve new AI tools
- Can't use personal API keys on work projects

**Scenario 2: The Side Project Developer**
- Pays for Claude Code Pro ($20/month)
- Subscription is for the CLI tool, **NOT the API**
- API access costs extra (~$10-50/month depending on usage)
- **Paying twice** for the same underlying model

**Scenario 3: The Indie Developer**
- Paying for multiple subscriptions (Copilot, Cursor, Claude Code)
- Each is locked to their own tool
- Can't mix and match or use in custom workflows
- Token anxiety: burning work credits on side projects

### The Universal Problem

> **AI companies sell subscriptions to TOOLS, not to the underlying models. To use the model in YOUR tool, you have to pay again for API access.**

This affects:
- GitHub Copilot users
- Claude Code users
- ChatGPT Plus users
- Cursor Pro users
- Codeium users

### Why This Matters

**Current State**: Users have to choose
- Use the AI tool with limitations (IDE-focused, single-file, no sessions)
- OR pay twice (subscription + API) to use in custom workflows

**Context Kiln Opportunity**:
> **"The AI IDE that works with your existing subscriptions"**

---

## Project Genesis Story

### The Original Problem (From Developer's Experience)

**At Work**:
- Has GitHub Copilot subscription (via employer)
- Copilot in WebStorm works but has limitations:
  - IDE-focused, not AI-session focused
  - Can only work on one thing at a time
  - Limited context window
  - No persistent sessions
- Can't install unapproved software (security/legal takes months)
- Worried about burning work tokens on side projects

**At Home**:
- Started with 7B Qwen Coder (local model)
- Quality was insufficient - "RAPIDLY ponied up $20 for Claude Code"
- But Claude Code subscription ≠ Claude API access
- Would need to pay twice to build custom tools

**The Need**:
- Better leverage of existing Copilot subscription
- Tool that bridges subscription access and custom workflows
- Not limited by IDE plugin constraints
- Session-focused instead of file-focused

### The POC Proxy (x-copilot-proxy)

**Proof of Concept Built**:
- **Project**: x-copilot-proxy
- **What it does**: OpenAI-compatible wrapper around GitHub Copilot CLI
- **Runs on**: http://localhost:3030/v1
- **Models exposed**: claude-sonnet-4.5, claude-sonnet-4, claude-haiku-4.5, gpt-5
- **Authentication**: Uses local Copilot CLI authentication (no API key needed)
- **Result**: Proved subscription-to-API bridge is technically feasible

**How It Works**:
```
User Request → x-copilot-proxy (localhost:3030)
                    ↓
            GitHub Copilot CLI (authenticated)
                    ↓
            GitHub Copilot Subscription
                    ↓
            Response → User
```

**Key Insight**: OpenAI-compatible interface means any OpenAI SDK can talk to it

**Integration Design** (from docs/FEATURE_INTEGRATION.md):
```javascript
// Context Kiln → OpenAI SDK → localhost:3030 → Copilot CLI
const client = new OpenAI({
  baseURL: 'http://localhost:3030/v1',
  apiKey: 'dummy' // Not validated by proxy
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4.5',
  messages: [...]
});
```

**Files to Review**:
- ✅ docs/FEATURE_INTEGRATION.md (integration design documented)
- 📁 x-copilot-proxy source code (separate project - location TBD)
- 📁 C:\Users\BruceVanHorn\OneDrive - Content4 LLC\upload proxy research.docx

**Next Steps**:
1. Locate x-copilot-proxy source code
2. Document the CLI protocol reverse-engineering process
3. Extract reusable patterns for other CLI tools (Claude Code)
4. Build generic CLIProxyAdapter base class

---

## Technical Feasibility: Embedded Model Hosting

### Why Embed Models?

**Pros**:
- Zero cost for experimentation and learning
- Privacy - code never leaves your machine
- No rate limits
- Works offline
- Complements (doesn't replace) cloud models

**Cons**:
- Hardware requirements (8GB+ RAM for 7B models)
- Large downloads (2-20GB per model)
- Inferior quality to frontier models (GPT-4, Claude Opus, etc.)

**Conclusion**: Embedded models are valuable for SECONDARY use cases (learning, experimentation, offline work), but frontier models remain the primary value proposition.

### Implementation Options

#### Option 1: node-llama-cpp (Recommended)
```bash
npm install node-llama-cpp
```

**Pros**:
- Node.js bindings for llama.cpp (gold standard)
- Supports GGUF models (same as Ollama/LM Studio)
- GPU acceleration (CUDA, Metal, Vulkan)
- Mature and well-maintained

**Cons**:
- Native bindings (requires electron-rebuild)
- ~50MB bundle size increase

#### Option 2: llama-node
```bash
npm install llama-node
```

**Pros**:
- Similar to node-llama-cpp
- Good Electron integration
- Active development

**Cons**:
- Less mature than node-llama-cpp

#### Option 3: transformers.js
```bash
npm install @xenova/transformers
```

**Pros**:
- Pure WebAssembly (no native bindings)
- Works everywhere
- Easier builds

**Cons**:
- Significantly slower than native
- Limited model support

**Recommendation**: Start with node-llama-cpp for best performance.

### Architecture Design

```
Context Kiln Model Services
│
├── External Services (Current - Phase A)
│   ├── OllamaAdapter → localhost:11434
│   ├── LMStudioAdapter → localhost:1234
│   ├── AnthropicAdapter → Claude API
│   └── OpenAIAdapter → OpenAI API
│
├── Subscription Proxies (Future - Phase D)
│   ├── CopilotProxyAdapter → GitHub Copilot CLI
│   ├── ClaudeCodeProxyAdapter → Claude Code CLI
│   └── CursorProxyAdapter → Cursor API (if possible)
│
└── Embedded Models (Future - Phase E)
    ├── LocalModelService (uses node-llama-cpp)
    ├── ModelLibrary (download, manage GGUF files)
    ├── LocalModelAdapter → LocalModelService
    └── GPU Acceleration Layer
```

### Hardware Requirements Reality Check

**7B Models** (Qwen Coder, Llama 3.1):
- RAM: 8GB (Q4 quantization) to 16GB (Q8)
- GPU: Optional but helpful (4GB VRAM)
- Quality: Good for basic tasks, poor for complex reasoning

**70B Models** (Qwen Coder 70B, Llama 3.1 70B):
- RAM: 40GB (Q4) to 80GB+ (Q8)
- GPU: 48GB VRAM minimum (A6000, RTX 6000)
- Cost: ~$2,000 for Mac Mini with 64GB unified memory
- Quality: Much better, but still below GPT-4/Claude Opus

**Frontier Models** (GPT-4, Claude Opus):
- Cost: $10-50/month via API
- Quality: State of the art
- No hardware requirements

**Conclusion**: For 99% of users, frontier model API access is more economical and better quality than running 70B+ models locally.

---

## Strategic Priorities (Revised)

### Priority 1: Leverage Existing Subscriptions ⭐⭐⭐

**Why**: This is the REAL problem most users face
**Impact**: Massive - turns existing subscriptions into agentic tools
**Effort**: Medium - need to reverse-engineer CLI tools

**Implementation**:
1. **CopilotProxyAdapter** - Use GitHub Copilot via CLI
2. **ClaudeCodeProxyAdapter** - Use Claude Code via CLI
3. Generic "CLI Proxy" pattern for other tools

**User Value**:
> "Use your existing Copilot/Claude Code subscription with Context Kiln's advanced features - no double payment"

### Priority 2: Complete Agentic Features (Phase C) ⭐⭐⭐

**Why**: This is what makes Context Kiln unique
**Impact**: High - enables multi-step workflows, planning, error recovery
**Effort**: Medium - 5-7 hours

**Implementation**:
- Multi-step task planning
- Error recovery strategies
- Progress tracking
- Rollback capabilities

**User Value**:
> "Context Kiln doesn't just help you code - it autonomously executes complex multi-step refactors"

### Priority 3: Embedded Model Hosting (Phase E) ⭐⭐

**Why**: Valuable for experimentation, learning, offline work
**Impact**: Medium - nice to have, but not primary value
**Effort**: Medium - 5-7 hours for basic implementation

**Implementation**:
1. LocalModelService using node-llama-cpp
2. Model library UI (download, manage models)
3. GPU detection and configuration

**User Value**:
> "Experiment with local models for free, use frontier models when quality matters"

### Priority 4: Cloud API Support (Current) ⭐⭐

**Why**: Already implemented, works well
**Impact**: High for users willing to pay for API access
**Effort**: Done (Anthropic, OpenAI adapters ready)

**User Value**:
> "Direct API access to Claude, GPT-4 when you have budget"

---

## Revised Roadmap

### Phase A: Local LLMs ✅ COMPLETE
- Ollama integration
- LM Studio integration
- ESLint, toolbar
- **Status**: Done (2 hours)

### Phase B: Tool Use System ✅ COMPLETE
- read_file, edit_file, create_file, list_files
- Diff preview with approval workflow
- Security (path validation, size limits)
- Tool orchestration in AIProviderService
- **Status**: Done (3 hours)

### Phase C: Multi-Step Workflows (NEXT - 5-7 hours)
- Task planning and breakdown
- Multi-step execution with dependencies
- Error recovery and retry logic
- Progress tracking
- Rollback capabilities
- **Status**: Not started

### Phase D: Subscription Proxy Adapters (HIGH VALUE - 8-10 hours)
- Reverse-engineer GitHub Copilot CLI protocol
- Build CopilotProxyAdapter
- Reverse-engineer Claude Code CLI protocol
- Build ClaudeCodeProxyAdapter
- Generic CLI proxy pattern
- Authentication flow for subscriptions
- **Status**: Not started
- **Impact**: 🔥 This is the killer feature

### Phase E: Embedded Model Hosting (NICE TO HAVE - 5-7 hours)
- Install and integrate node-llama-cpp
- LocalModelService implementation
- Model library UI (download, list, delete)
- GPU detection and configuration
- Quantization selection
- **Status**: Not started
- **Impact**: Good for power users, but secondary

---

## Market Positioning

### The Problem We Solve

**Current AI Coding Tools**:
1. **IDE Plugins** (Copilot, Cursor) - Limited to IDE, single-file focus, no sessions
2. **CLI Tools** (GitHub Copilot CLI, Claude Code) - Terminal-only, no GUI, limited workflows
3. **Model Hosts** (Ollama, LM Studio) - No editor, no agentic features
4. **API Access** - Requires paying twice if you have a subscription

**Context Kiln**:
> **"The agentic IDE that works with your existing subscriptions"**

### Unique Value Propositions

1. **Subscription Support** 🔥 (Phase D)
   - Use GitHub Copilot subscription without API costs
   - Use Claude Code subscription in custom workflows
   - No double payment

2. **Session Management** (Implemented)
   - Persistent context across days/weeks
   - Project-local session storage
   - Archive and restore conversations

3. **Advanced Context** (Implemented)
   - Drag-drop files to context
   - Multi-file context window
   - Context window optimization

4. **Agentic Workflows** (Phase C - In Progress)
   - Multi-step task execution
   - Tool use (read, edit, create files)
   - Error recovery and retry logic
   - Planning and coordination

5. **Hybrid Model Support** (Phase E - Future)
   - Local models for experimentation
   - Cloud models for production
   - Easy switching between providers

### Competitive Moat

**Short Term**: Session management + tool use + subscription support
**Medium Term**: Multi-step agentic workflows + embedded models
**Long Term**: Ecosystem of community-built agents and workflows

---

## Technical Challenges & Solutions

### Challenge 1: Reverse-Engineering CLI Tools

**Problem**: GitHub Copilot CLI and Claude Code CLI aren't documented APIs

**Solution**:
- Study CLI source code (if open source)
- Network analysis (proxy CLI traffic)
- Minimal API surface: just "send prompt, get response"
- Fall back to API if CLI fails

**Risk**: CLI protocols may change without notice
**Mitigation**: Version detection, graceful degradation, API fallback

### Challenge 2: Authentication Flow

**Problem**: Subscriptions require OAuth or device flow authentication

**Solution**:
- Launch CLI in background process
- Intercept auth flow
- Store credentials securely (electron-store with OS keychain)
- Refresh tokens automatically

**Risk**: Complex auth flows
**Mitigation**: Detailed error messages, fallback to manual auth

### Challenge 3: Rate Limits

**Problem**: Subscription tools may have rate limits

**Solution**:
- Detect rate limit errors
- Queue requests with backoff
- Show user their usage/limits
- Offer API fallback

### Challenge 4: Native Models Performance

**Problem**: 7B models are slow, 70B models need expensive hardware

**Solution**:
- Set expectations: local = experimentation, cloud = production
- GPU offloading when available
- Quantization for smaller memory footprint
- Don't compete with frontier models on quality

---

## Business Model Implications

### Revenue Streams

1. **Free Tier**
   - Use your own API keys or subscriptions
   - All features available
   - Community support

2. **Pro Tier** ($10-20/month)
   - Managed API keys (we pay for API, bundle cost)
   - Priority support
   - Team features (shared sessions, templates)
   - Early access to new features

3. **Enterprise Tier** ($50-100/user/month)
   - Self-hosted option
   - SSO integration
   - Audit logs and compliance
   - Custom adapters for internal AI services

### Why This Works

**Context Kiln is a TOOL, not an AI provider**:
- Users can BYO (API key, subscription, local model)
- Or pay us for convenience (managed API access)
- Value comes from features, not from AI access

**Comparison**:
- **Cursor**: Forces you to use their API ($20/month)
- **Context Kiln**: Use whatever you want (free), or pay for convenience

---

## Next Actions

### Immediate (This Week)

1. ✅ **Document this vision** (this file)
2. ⏳ **Review POC proxy code** - Find and document the original Copilot proxy
3. ⏳ **Implement Phase C** - Complete multi-step workflows
4. ⏳ **Test Phase B with real Claude API** - Verify tool use works end-to-end

### Short Term (Next 2 Weeks)

5. **Research GitHub Copilot CLI protocol**
   - Run CLI with verbose logging
   - Capture network traffic
   - Document API surface

6. **Build CopilotProxyAdapter prototype**
   - Shell out to `github-copilot-cli`
   - Parse responses
   - Test with real subscription

7. **Build ClaudeCodeProxyAdapter prototype**
   - Same process as Copilot
   - Test with real subscription

### Medium Term (1 Month)

8. **Implement Phase D fully** - Production-ready subscription adapters
9. **User testing** - Get feedback from developers with subscriptions
10. **Polish and bug fixes**

### Long Term (2-3 Months)

11. **Implement Phase E** - Embedded model hosting
12. **Beta release** - Limited rollout to early adopters
13. **Marketing** - "Use your existing AI subscriptions in a real IDE"

---

## Success Metrics

### Technical Metrics
- ✅ Phase A complete (local LLMs)
- ✅ Phase B complete (tool use)
- ⏳ Phase C complete (multi-step workflows)
- ⏳ Phase D complete (subscription adapters)
- ⏳ Phase E complete (embedded models)

### User Metrics (Post-Beta)
- % of users using subscription adapters vs API keys
- Average session length (goal: 30+ minutes)
- Number of tool calls per session (goal: 10+)
- User retention (goal: 60% weekly active)

### Business Metrics (Post-Launch)
- Free tier users
- Pro tier conversion rate (goal: 5-10%)
- Enterprise leads
- GitHub stars / community engagement

---

## Key Insights Summary

1. **Don't integrate - leapfrog**: Context Kiln should be LM Studio + VSCode + Cursor + more, not just "VSCode with AI"

2. **Subscriptions > APIs**: Most users have AI tool subscriptions, not API access. Solving this is HUGE value.

3. **Frontier models win**: Local models are for experimentation, but GPT-4/Claude remain the gold standard. Don't compete on model quality.

4. **Agentic is the differentiator**: Sessions + tool use + multi-step workflows = unique value that Copilot/Cursor don't offer.

5. **Platform, not product**: Build adapters for everything (Ollama, LM Studio, Copilot, Claude Code, local models, APIs). Let users choose.

---

**Document Status**: Living document - update as strategy evolves
**Last Updated**: 2026-01-15
**Next Review**: After Phase C completion
