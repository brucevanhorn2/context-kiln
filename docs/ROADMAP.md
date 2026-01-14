# Context Kiln - Product Roadmap

**Last Updated**: 2026-01-14
**Current Status**: MVP Development (Phase 1-5)
**Next Major Release**: v1.0 (MVP Complete)

---

## Vision

Context Kiln is a **chat-first context engineering tool** for AI-powered software development. Unlike traditional IDEs with sidebar chat features, Context Kiln puts the conversation with AI at the center, with powerful context management, token budgeting, and multi-provider support.

**Unique Value Propositions**:
1. 🎯 **Chat-First Interface** - AI conversation is primary, editor is secondary
2. 📊 **Token Budget Management** - First tool with pre-flight cost estimation
3. 🔄 **Session-Based Development** - Long-running tasks without context limits
4. 🔌 **Multi-Provider** - Claude, OpenAI, local models, enterprise proxies
5. 💡 **Context Optimization** - Smart suggestions to reduce bloat

---

## Release Roadmap

### ✅ v0.1 - Prototype (COMPLETE)
**Completed**: 2026-01-13
**Status**: Basic UI prototype

**Features**:
- Three-pane layout (file tree, chat, context tools)
- File browser with drag-and-drop
- Simulated chat interface
- Ant Design dark mode theme

---

### 🟡 v0.5 - MVP (IN PROGRESS - Phase 1-5)
**Target**: 2026-02-01 (3 weeks)
**Current Phase**: Phase 1 (71% complete)
**Goal**: Fully functional AI coding assistant

#### Phase 1: Foundation & Infrastructure (71% Complete)
**Target**: 2026-01-15
**Status**: 🟡 In Progress (4 tasks remaining)

**Completed** ✅:
- Service layer architecture (8 services)
- Adapter pattern for multi-provider support
- Database schema (SQLite)
- Token counting infrastructure (tiktoken)
- Session management system
- File operations service

**Remaining**:
- [ ] React contexts (5 contexts)
- [ ] IPC handlers (main.js)
- [ ] Preload API exposure
- [ ] Webpack Monaco configuration

---

#### Phase 2: Claude API Integration (0% Complete)
**Target**: 2026-01-18
**Status**: ⚪ Not Started
**Prerequisites**: Phase 1 complete

**Goals**:
- [ ] Real Claude API connection
- [ ] Streaming responses
- [ ] API key management UI
- [ ] Session management UI
- [ ] Context injection into prompts

**Key Deliverables**:
- Settings modal for API keys
- Session selector dropdown
- Working chat with real Claude responses
- Session file management

---

#### Phase 3: File Editor (0% Complete)
**Target**: 2026-01-22
**Status**: ⚪ Not Started
**Prerequisites**: Phase 1 complete (webpack), Phase 2 complete

**Goals**:
- [ ] Monaco Editor integration
- [ ] Tabbed file editing
- [ ] Syntax highlighting (60+ languages)
- [ ] Save functionality (Ctrl+S)
- [ ] Dirty state indicators

**Key Deliverables**:
- Double-click to open files
- Multi-file tabs in center panel
- VS Code-quality editing experience

---

#### Phase 4: Token Tracking (0% Complete)
**Target**: 2026-01-25
**Status**: ⚪ Not Started
**Prerequisites**: Phase 2 complete (real API usage)

**Goals**:
- [ ] Real-time token usage recording
- [ ] Usage dashboard with charts
- [ ] Cost calculations
- [ ] Historical analytics
- [ ] Export functionality

**Key Deliverables**:
- Token usage tabs (Project, API Key, Session, Global)
- Charts showing usage over time
- Cost tracking per model
- CSV/JSON export

---

#### Phase 5: Layout & Polish (0% Complete)
**Target**: 2026-01-29
**Status**: ⚪ Not Started
**Prerequisites**: All previous phases complete

**Goals**:
- [ ] Layout preset system (5 presets)
- [ ] Keyboard shortcuts
- [ ] Error handling polish
- [ ] Loading states & animations
- [ ] Performance optimizations

**Key Deliverables**:
- Layout switcher dropdown
- Settings persistence
- Smooth UX throughout
- Production-ready quality

---

### 🎯 v1.0 - MVP Complete
**Target**: 2026-02-01
**Status**: Not Started

**Success Criteria**:
- ✅ User can chat with Claude using their API key
- ✅ Files can be added to context via drag-and-drop
- ✅ Files can be edited with syntax highlighting
- ✅ Token usage tracked per project/session/API key
- ✅ Sessions manage long-running conversations
- ✅ Layout configurable for different monitors
- ✅ No crashes during normal operation
- ✅ All data persists across restarts

**Launch Activities**:
- Internal dogfooding (use for Context Kiln development)
- Create demo video
- Write user documentation
- Publish to GitHub (open source)

---

### 🚀 v1.1 - OpenAI Support
**Target**: 2026-02-15 (2 weeks after MVP)
**Priority**: High (broad user appeal)

**Features**:
- [ ] OpenAI API adapter implementation
- [ ] GPT-4 Turbo, GPT-4, GPT-3.5 Turbo support
- [ ] Provider switcher in UI
- [ ] Cost comparison between providers
- [ ] Hybrid workflows (Claude for X, GPT for Y)

**Why Now**: Enables users without Claude API access

---

### 🔧 v1.2 - Enhanced Context Management
**Target**: 2026-03-01 (2 weeks after v1.1)
**Priority**: Medium (quality of life)

**Features**:
- [ ] Context search (find files in large projects)
- [ ] Context templates (save/load common file sets)
- [ ] Context folders (organize files into groups)
- [ ] .contextignore support (exclude patterns)
- [ ] Smart context suggestions (AI recommends relevant files)

**Why**: Makes context engineering faster and more powerful

---

### 💰 v2.0 - Token Budgeting (Phase 6)
**Target**: 2026-04-01 (4-6 weeks)
**Priority**: High (novel feature, competitive advantage)

**Novel Features** ⭐:
- [ ] Pre-flight cost estimation
- [ ] Per-session budget management
- [ ] Context optimization engine
- [ ] Historical analytics dashboard
- [ ] Budget-aware model selection
- [ ] Visual budget indicators

**Why This Matters**: No other tool has these features. Provides:
- Cost awareness (prevent surprise bills)
- Sustainable usage patterns
- Data-driven model selection
- Context optimization suggestions

**Implementation**: 6-week phased rollout (see docs/features/token-budgeting.md)

---

### 🏢 v2.5 - Enterprise Features
**Target**: 2026-05-01 (4 weeks)
**Priority**: High (user's primary need)

**Features**:
- [ ] Copilot CLI proxy adapter
- [ ] Custom API endpoint support
- [ ] SSO/auth integration
- [ ] Team budget management
- [ ] Audit logging
- [ ] Air-gapped deployment mode

**Why**: Enables use in corporate environments with cyber restrictions

**User Story**: "I need to use Context Kiln at work with our approved Copilot subscription"

---

### 🤖 v3.0 - Local AI Models
**Target**: 2026-06-01 (4 weeks)
**Priority**: Medium (privacy-focused users)

**Features**:
- [ ] Ollama adapter implementation
- [ ] LM Studio support
- [ ] Local model management UI
- [ ] Hybrid mode (local for context, cloud for generation)
- [ ] Model download manager
- [ ] GPU acceleration support

**Models**:
- Llama 3.1 (8B, 70B)
- Code Llama
- Qwen 2.5 Coder
- Mistral
- DeepSeek Coder

**Why**: Enables offline usage, zero API costs, full privacy

---

### 🎨 v3.5 - Advanced UI Features
**Target**: 2026-07-01 (4 weeks)
**Priority**: Medium (user experience)

**Features**:
- [ ] Multi-project workspace
- [ ] Session timeline visualization
- [ ] Conversation branching (fork sessions)
- [ ] Prompt library
- [ ] Template system
- [ ] Customizable themes
- [ ] Plugin system

**Why**: Power user features for advanced workflows

---

### 🔗 v4.0 - Integrations
**Target**: 2026-08-01 (6 weeks)
**Priority**: Medium (ecosystem play)

**Features**:
- [ ] Git integration (commit, diff, branch)
- [ ] Built-in terminal
- [ ] Jira/Linear integration (ticket-based sessions)
- [ ] Slack/Discord notifications
- [ ] CI/CD hooks
- [ ] Webhook support
- [ ] VS Code extension (companion mode)

**Why**: Fits into existing developer workflows

---

## Feature Backlog (Future)

### User-Requested Features
- **Black Box Recorder UI**: Session timeline with iconography
- **Prompt Library**: Manage, categorize, reuse prompts
- **Context Diff Viewer**: Show what changed between sessions
- **Session Export/Import**: Share sessions with teammates

### Community Ideas (TBD)
- Real-time collaboration (multiple users, one session)
- Voice input/output
- Mobile companion app
- Web version (limited functionality)

---

## Decision Framework

**How we prioritize**:
1. **MVP-Critical**: Must have for v1.0 launch
2. **High Value, Low Effort**: Quick wins after MVP
3. **Novel Features**: Competitive differentiation (token budgeting)
4. **Enterprise Needs**: Enable corporate adoption
5. **Community Requests**: User-driven features

**Trade-offs**:
- **Depth vs Breadth**: Perfect core features before adding new ones
- **Open Source vs Commercial**: Core free, premium features for teams
- **Simplicity vs Power**: Easy for beginners, powerful for experts

---

## Success Metrics

### v1.0 (MVP)
- [ ] 100 GitHub stars in first month
- [ ] 10 active users (internal + beta)
- [ ] Zero data loss incidents
- [ ] <3 second startup time
- [ ] 90%+ test coverage

### v2.0 (Token Budgeting)
- [ ] 1,000 GitHub stars
- [ ] 100 active users
- [ ] Featured in HackerNews/Reddit
- [ ] Average 30% token savings vs baseline

### v3.0 (Enterprise)
- [ ] First paying customer (team plan)
- [ ] 500 active users
- [ ] Integration with major company
- [ ] Positive ROI (revenue > costs)

---

## Technical Roadmap

### Infrastructure
- **v1.0**: Single-user, local SQLite
- **v2.0**: Optional cloud sync
- **v3.0**: Self-hosted option
- **v4.0**: SaaS offering

### Architecture
- **v1.0**: Electron monolith
- **v2.0**: Plugin system
- **v3.0**: Microservices (optional)
- **v4.0**: Cloud-native

### Performance
- **v1.0**: <3s startup, <100ms token counts
- **v2.0**: <1s startup, background processing
- **v3.0**: Instant context switching
- **v4.0**: Distributed processing

---

## Open Questions

### For v1.0
- [ ] Bundle size acceptable? (Monaco adds 3-4MB)
- [ ] SQLite performance with 100k+ messages?
- [ ] Streaming performance with high-frequency updates?

### For v2.0
- [ ] Pricing model for premium features?
- [ ] How to monetize without alienating open source users?

### For Enterprise
- [ ] Air-gapped deployment requirements?
- [ ] Compliance certifications needed (SOC2, ISO)?

---

## Dependencies

### External Dependencies
- Anthropic API (v1.0+)
- OpenAI API (v1.1+)
- Ollama (v3.0+)
- GitHub API (for proxy integration)

### Technical Dependencies
- Electron 27+
- React 19+
- Ant Design 6+
- Monaco Editor
- better-sqlite3
- tiktoken

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| API pricing changes | High | Multi-provider support, local models |
| Performance issues | Medium | Profiling, optimization, background workers |
| Electron bundle size | Low | Code splitting, lazy loading |
| User adoption | High | Open source, free core, great UX |
| Competition | Medium | Novel features (token budgeting), speed |

---

## Principles

### Development
1. **Ship Fast**: MVP in 3 weeks, iterate based on usage
2. **Dogfood**: Use Context Kiln to build Context Kiln
3. **Document Everything**: Timeline, ADRs, lessons learned
4. **Test in Production**: Real usage reveals real problems

### Product
1. **Chat-First**: Never compromise on conversation experience
2. **Cost Awareness**: Always show user what things cost
3. **Privacy**: Local-first, user controls data
4. **Flexibility**: Support multiple workflows, not one opinionated way

### Business
1. **Open Core**: Free core features, paid team/enterprise features
2. **Transparent**: Roadmap public, progress visible
3. **Community-Driven**: Listen to users, prioritize their needs

---

## Timeline Summary

| Version | Target Date | Status | Key Features |
|---------|-------------|--------|--------------|
| v0.1 | 2026-01-13 | ✅ Complete | Basic UI prototype |
| v0.5 | 2026-02-01 | 🟡 In Progress | MVP (Phases 1-5) |
| v1.0 | 2026-02-01 | ⚪ Not Started | MVP launch |
| v1.1 | 2026-02-15 | ⚪ Not Started | OpenAI support |
| v1.2 | 2026-03-01 | ⚪ Not Started | Enhanced context |
| v2.0 | 2026-04-01 | ⚪ Not Started | Token budgeting ⭐ |
| v2.5 | 2026-05-01 | ⚪ Not Started | Enterprise features |
| v3.0 | 2026-06-01 | ⚪ Not Started | Local AI models |
| v3.5 | 2026-07-01 | ⚪ Not Started | Advanced UI |
| v4.0 | 2026-08-01 | ⚪ Not Started | Integrations |

---

**Next Update**: When v1.0 MVP launches (2026-02-01)
**Maintained By**: Context Kiln development team
**Feedback**: GitHub issues or discussions
