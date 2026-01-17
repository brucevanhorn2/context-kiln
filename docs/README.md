# Context Kiln Documentation

**Last Updated**: 2026-01-15
**Status**: Active Development

This directory contains all documentation for Context Kiln, an agentic AI-powered coding IDE.

---

## Quick Start

**New to Context Kiln?** Start here:
1. 📖 [QUICK-START.md](QUICK-START.md) - User guide for getting started
2. 📋 [MVP-Plan-v2.md](MVP-Plan-v2.md) - Overall project vision and roadmap
3. 📊 [Implementation-Status.md](Implementation-Status.md) - Current progress and status

**Developer?** Start here:
1. 🎯 [ACTION-ITEMS.md](ACTION-ITEMS.md) - What to work on next
2. 🌙 [TONIGHT-SUMMARY.md](TONIGHT-SUMMARY.md) - Today's session summary
3. 🏗️ [CODE-INDEXING-DESIGN.md](CODE-INDEXING-DESIGN.md) - Current implementation focus

---

## Documentation Categories

### 📋 Planning & Vision

| Document | Purpose | Status |
|----------|---------|--------|
| [MVP-Plan-v2.md](MVP-Plan-v2.md) | Revised MVP with local-first strategy | Current |
| [MVP-Plan.md](MVP-Plan.md) | Original MVP plan (v1.2) | Archived |
| [STRATEGIC-VISION.md](STRATEGIC-VISION.md) | Strategic positioning and epiphanies | ⭐ Key Doc |
| [ROADMAP.md](ROADMAP.md) | Long-term feature roadmap | Active |

**Key Insights**:
- Leapfrog LM Studio, don't just integrate
- Solve the "subscription vs API" problem
- Frontier models for production, local for experimentation

---

### 🏗️ Architecture & Design

| Document | Purpose | Status |
|----------|---------|--------|
| [CODE-INDEXING-DESIGN.md](CODE-INDEXING-DESIGN.md) | Code search and indexing system | 🔥 Current Focus |
| [TOOL-USE-DESIGN.md](TOOL-USE-DESIGN.md) | Phase B tool use system design | Complete |
| [FEATURE_INTEGRATION.md](FEATURE_INTEGRATION.md) | x-copilot-proxy integration design | Reference |
| [decisions/001-adapter-pattern.md](decisions/001-adapter-pattern.md) | ADR: Why adapter pattern | Complete |

**Current Focus**: Code indexing (Phase B.5 and B.75) for search capabilities

---

### 📊 Status & Progress

| Document | Purpose | Status |
|----------|---------|--------|
| [Implementation-Status.md](Implementation-Status.md) | Overall progress tracker | Updated Daily |
| [ACTION-ITEMS.md](ACTION-ITEMS.md) | Prioritized task list | Updated Daily |
| [TONIGHT-SUMMARY.md](TONIGHT-SUMMARY.md) | Session-specific summary | Session-specific |

**Progress**: Phase A & B complete (local LLMs + tool use), Phase B.5/B.75/C next

---

### 🧪 Testing & Setup

| Document | Purpose | Status |
|----------|---------|--------|
| [QUICK-START.md](QUICK-START.md) | User-friendly setup guide | Complete |
| [TESTING-LOCAL-LLM.md](TESTING-LOCAL-LLM.md) | Ollama/LM Studio testing guide | Complete |
| [TESTING_PLAN.md](TESTING_PLAN.md) | Comprehensive testing strategy | Draft |

---

### 📝 Session Notes

| Document | Purpose | Date |
|----------|---------|------|
| [dev-notes/2026-01-14-evening-local-llm-pivot.md](dev-notes/2026-01-14-evening-local-llm-pivot.md) | Phase A implementation | 2026-01-14 |
| [dev-notes/2026-01-13-phase1-progress.md](dev-notes/2026-01-13-phase1-progress.md) | Initial infrastructure | 2026-01-13 |

---

### 🎯 Feature Specs

| Document | Purpose | Status |
|----------|---------|--------|
| [features/token-budgeting.md](features/token-budgeting.md) | Token budget system (v2.0) | Deferred |

---

## Development Phases

### ✅ Complete

| Phase | Description | Lines of Code | Duration |
|-------|-------------|---------------|----------|
| **1-5** | Infrastructure (services, adapters, UI, tracking) | ~5,168 | 3 weeks |
| **Phase A** | Local LLM integration (Ollama, LM Studio) | ~661 | 2 hours |
| **Phase B** | Tool use (read, edit, create, list files) | ~1,700 | 3 hours |

**Total Complete**: ~7,529 lines of production code

---

### 🔥 Current Focus

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| **Phase B.5** | Search tools (search_files, find_files) | 2-3 hours | CRITICAL |
| **Phase B.75** | Lightweight code index (symbols, imports) | 3-4 hours | HIGH |

**Why Critical**: Without search, AI is blind - has to guess which files to read, wasting tokens and getting wrong answers 30% of the time.

---

### ⏳ Planned

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| **Phase C** | Multi-step workflows, planning, error recovery | 5-7 hours | HIGH |
| **Phase D** | Subscription adapters (Copilot, Claude Code) | 8-10 hours | HIGH |
| **Phase E** | Embedded model hosting (node-llama-cpp) | 5-7 hours | MEDIUM |
| **Phase D.5** | Full LSP integration (TypeScript, Python, Go) | 8-10 hours | MEDIUM |

---

## Key Architectural Decisions

### 1. Adapter Pattern (Phase 1)
**Decision**: Use adapter pattern for AI providers
**Why**: Enables adding new providers (Anthropic, OpenAI, Ollama, LM Studio) without refactoring
**Doc**: [decisions/001-adapter-pattern.md](decisions/001-adapter-pattern.md)

### 2. Local-First Strategy (Phase A)
**Decision**: Prioritize local LLMs before cloud APIs
**Why**: Zero-cost testing, faster iteration, privacy
**Doc**: [dev-notes/2026-01-14-evening-local-llm-pivot.md](dev-notes/2026-01-14-evening-local-llm-pivot.md)

### 3. Tool Use System (Phase B)
**Decision**: Human-in-the-loop for all write operations
**Why**: Safety, user control, transparency
**Doc**: [TOOL-USE-DESIGN.md](TOOL-USE-DESIGN.md)

### 4. Three-Tier Indexing (Phase B.5/B.75/D.5)
**Decision**: Build indexing in phases (grep → lightweight index → full LSP)
**Why**: Deliver value incrementally, validate approach
**Doc**: [CODE-INDEXING-DESIGN.md](CODE-INDEXING-DESIGN.md)

### 5. Subscription Adapters (Phase D)
**Decision**: Support Copilot/Claude Code subscriptions, not just APIs
**Why**: Solves "pay twice" problem for most users
**Doc**: [STRATEGIC-VISION.md](STRATEGIC-VISION.md)

---

## Technology Stack

### Backend (Electron Main Process)
- **Runtime**: Node.js 18+
- **Framework**: Electron 27
- **Database**: better-sqlite3 (SQLite)
- **AI SDKs**: @anthropic-ai/sdk, openai (OpenAI-compatible)
- **File Operations**: Node.js fs/promises
- **Code Parsing**: Regex (Phase B.75), tree-sitter (future), LSP (Phase D.5)

### Frontend (Electron Renderer)
- **Framework**: React 19
- **UI Library**: Ant Design 6
- **Editor**: Monaco Editor (@monaco-editor/react)
- **State Management**: React Context API
- **Styling**: CSS + Ant Design theming

### Build & Tooling
- **Bundler**: Webpack 5
- **Linter**: ESLint 9
- **Testing**: (TBD - Vitest or Jest)

---

## File Organization

```
docs/
├── README.md (this file)           # Documentation index
├── STRATEGIC-VISION.md             # ⭐ Strategic positioning
├── CODE-INDEXING-DESIGN.md         # 🔥 Current focus
├── ACTION-ITEMS.md                 # 🎯 Task tracking
├── TONIGHT-SUMMARY.md              # 📅 Session summary
├── Implementation-Status.md        # 📊 Progress tracker
├── MVP-Plan-v2.md                  # 📋 Overall plan
├── QUICK-START.md                  # 📖 User guide
├── TOOL-USE-DESIGN.md              # Tool system design
├── TESTING-LOCAL-LLM.md            # Testing guide
├── FEATURE_INTEGRATION.md          # Integration patterns
├── ROADMAP.md                      # Long-term roadmap
├── TESTING_PLAN.md                 # Test strategy
├── decisions/                      # Architecture Decision Records
│   └── 001-adapter-pattern.md
├── dev-notes/                      # Session notes
│   ├── 2026-01-14-evening-local-llm-pivot.md
│   └── 2026-01-13-phase1-progress.md
└── features/                       # Feature specifications
    └── token-budgeting.md
```

---

## How to Use This Documentation

### For New Contributors
1. Read [QUICK-START.md](QUICK-START.md) to understand the product
2. Read [MVP-Plan-v2.md](MVP-Plan-v2.md) to understand the vision
3. Read [Implementation-Status.md](Implementation-Status.md) to see what's done
4. Read [ACTION-ITEMS.md](ACTION-ITEMS.md) to see what needs work
5. Pick a task and start coding!

### For Returning Contributors
1. Check [TONIGHT-SUMMARY.md](TONIGHT-SUMMARY.md) for session-specific context
2. Review [ACTION-ITEMS.md](ACTION-ITEMS.md) for priorities
3. Check [Implementation-Status.md](Implementation-Status.md) for latest progress
4. Read relevant design docs (e.g., [CODE-INDEXING-DESIGN.md](CODE-INDEXING-DESIGN.md))

### For Product/Planning
1. Read [STRATEGIC-VISION.md](STRATEGIC-VISION.md) for strategic direction
2. Review [ROADMAP.md](ROADMAP.md) for long-term plans
3. Check [features/](features/) for specific feature specs
4. Update [MVP-Plan-v2.md](MVP-Plan-v2.md) as strategy evolves

---

## Documentation Standards

### File Naming
- **ALL_CAPS.md** - Top-level documents (README, ROADMAP, etc.)
- **kebab-case.md** - Feature specs, design docs
- **YYYY-MM-DD-description.md** - Session notes, dated content

### Document Structure
- **Title** - Clear, descriptive
- **Metadata** - Date, status, context
- **Table of Contents** - For docs >100 lines
- **Code Examples** - Annotated, runnable
- **Status Indicators** - ✅ Complete, 🔥 Current, ⏳ Planned, ❌ Blocked

### Maintenance
- **Update dates** when content changes significantly
- **Archive** old versions (don't delete)
- **Link between** related documents
- **Tag priorities** (CRITICAL, HIGH, MEDIUM, LOW)

---

## Key Metrics

### Code Stats (as of 2026-01-15)
- **Total Production Code**: ~7,529 lines
- **Documentation**: ~4,500 lines
- **Tests**: (TBD)
- **Files Created**: 30 files
- **Files Modified**: 19 files

### Progress
- **Phases Complete**: 1-5, A, B (10 phases)
- **Phases In Progress**: B.5, B.75 (2 phases)
- **Phases Planned**: C, D, D.5, E (4 phases)
- **Overall Progress**: 75% complete (15/20 phases)

### Time Invested
- **Infrastructure** (Phases 1-5): ~40 hours
- **Phase A** (Local LLMs): ~2 hours
- **Phase B** (Tool Use): ~3 hours
- **Documentation**: ~8 hours
- **Total**: ~53 hours

---

## Version History

### v1.2 - 2026-01-15 (Current)
- ✅ Phase B complete (tool use system)
- 📖 Strategic vision documented
- 🔍 Code indexing design complete
- 🎯 Phase B.5 ready for implementation

### v1.1 - 2026-01-14
- ✅ Phase A complete (local LLMs)
- 📖 Local-first strategy documented
- 🧪 Testing guides created

### v1.0 - 2026-01-13
- ✅ Phases 1-5 complete (infrastructure)
- 📖 MVP plan documented
- 🏗️ Adapter pattern implemented

---

## Questions?

**For immediate help**:
- Check [ACTION-ITEMS.md](ACTION-ITEMS.md) - "What should I work on?"
- Check [TONIGHT-SUMMARY.md](TONIGHT-SUMMARY.md) - "What's happening now?"
- Check [Implementation-Status.md](Implementation-Status.md) - "What's done?"

**For strategic questions**:
- Read [STRATEGIC-VISION.md](STRATEGIC-VISION.md) - "Why are we building this?"
- Read [MVP-Plan-v2.md](MVP-Plan-v2.md) - "What's the plan?"

**For technical details**:
- Read specific design docs (e.g., [CODE-INDEXING-DESIGN.md](CODE-INDEXING-DESIGN.md))
- Read [decisions/](decisions/) for architecture decisions

---

**Happy building!** 🚀
