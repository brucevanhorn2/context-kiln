# Context Kiln Documentation

**Last Updated**: 2026-01-26
**Status**: Active Development

---

## 📚 Quick Navigation

### Current Status
- **[STATUS.md](STATUS.md)** - Where we are right now (living document)
- **[ROADMAP.md](ROADMAP.md)** - Vision and next milestones
- **[sessions/2026-01-26.md](sessions/2026-01-26.md)** - Today's work

### For Users
- **[guides/QUICK-START.md](guides/QUICK-START.md)** - Get started quickly
- **[guides/TESTING-LOCAL-LLM.md](guides/TESTING-LOCAL-LLM.md)** - Ollama setup

### For Developers
- **[features/](features/)** - Feature specifications
- **[decisions/](decisions/)** - Architecture Decision Records (ADRs)

---

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── STATUS.md                    # Current project status (updated each session)
├── ROADMAP.md                   # Vision, phases, next steps
│
├── sessions/                    # Date-stamped session notes
│   ├── 2026-01-26.md           # Latest session
│   └── ...                      # Previous sessions
│
├── features/                    # Feature specifications
│   ├── agentic-tools.md        # Tool use design
│   └── token-budgeting.md      # Token management (future)
│
├── guides/                      # User and developer guides
│   ├── QUICK-START.md          # Getting started
│   └── TESTING-LOCAL-LLM.md    # Local model setup
│
├── decisions/                   # Architecture Decision Records
│   └── 001-adapter-pattern.md  # Why adapter pattern
│
└── archive/                     # Historical documents (reference only)
    ├── Implementation-Status.md # Old detailed status
    ├── MVP-Plan.md             # Original plan
    └── ...                      # Other old docs
```

---

## 📖 How to Use This Documentation

### 🆕 Starting Fresh?
1. Read [STATUS.md](STATUS.md) - understand current reality
2. Read [ROADMAP.md](ROADMAP.md) - understand the vision
3. Read [guides/QUICK-START.md](guides/QUICK-START.md) - get the app running

### 🔨 Continuing Development?
1. Check [sessions/latest](sessions/) - what happened last time
2. Review [STATUS.md](STATUS.md) - current priorities
3. Pick a task and get coding

### 📝 Contributing?
1. Read relevant feature docs in [features/](features/)
2. Check [decisions/](decisions/) for architectural context
3. Update [sessions/YYYY-MM-DD.md](sessions/) with your work

---

## 📋 Document Types

### Living Documents (Update Frequently)
- **STATUS.md** - The source of truth for "where are we now"
- **ROADMAP.md** - High-level vision and next steps
- **sessions/YYYY-MM-DD.md** - Daily work log (create new, don't edit old)

### Reference Documents (Write Once, Reference Often)
- **features/*.md** - Detailed feature specifications
- **guides/*.md** - How-to documentation
- **decisions/*.md** - Architecture Decision Records (ADRs)

### Archive (Historical Reference)
- Old detailed status docs
- Outdated plans
- Session notes that got too long
- **Don't delete, just move to archive/**

---

## ✍️ Documentation Standards

### Session Notes
- **File name**: `sessions/YYYY-MM-DD.md`
- **Format**: See template in latest session
- **Sections**: Goals, What We Did, Insights, Next Steps, Files Changed
- **Rule**: Create new file each session, never edit old ones

### Feature Specs
- **File name**: `features/feature-name.md`
- **Include**: Goal, Design, Implementation notes, Testing
- **Keep focused**: One feature per file

### ADRs (Architecture Decision Records)
- **File name**: `decisions/NNN-short-title.md`
- **Format**: Context, Decision, Consequences
- **Immutable**: Once written, don't change (create new ADR instead)

---

## 🔍 Finding Information

**"What's the current status?"**
→ Read [STATUS.md](STATUS.md)

**"What happened last session?"**
→ Read [sessions/latest](sessions/)

**"How does feature X work?"**
→ Check [features/X.md](features/)

**"Why did we choose Y?"**
→ Check [decisions/](decisions/)

**"How do I get started?"**
→ Read [guides/QUICK-START.md](guides/QUICK-START.md)

**"What's the long-term plan?"**
→ Read [ROADMAP.md](ROADMAP.md)

---

## 🎯 Current Focus (from STATUS.md)

**Priority**: Wire agentic tools to Claude API

**Status**:
- ✅ All tools implemented (8 tools)
- ✅ Approval workflow complete
- ❌ Tools not connected to Claude API (critical gap)

**Next Steps**:
1. Add tool definitions to API requests
2. Parse tool_use blocks from responses
3. Implement tool execution loop
4. Add system prompt for agentic behavior

See [STATUS.md](STATUS.md) for full details.

---

## 📈 Project Stats

### Codebase
- **Production Code**: ~10,000 lines
- **Services**: 15+ service files
- **UI Components**: 20+ components
- **Tools Implemented**: 8 tools ready to wire

### Documentation
- **Current Docs**: 5 living documents
- **Session Notes**: Growing archive
- **Feature Specs**: 2 (more coming)
- **Guides**: 2 user guides

### Progress
- ✅ **Infrastructure**: Complete (100%)
- ✅ **UI**: Complete (100%)
- ✅ **Tool Implementation**: Complete (100%)
- ⏳ **Tool Wiring**: Next priority (0%)

---

## 🤝 Contributing Guidelines

### Updating Documentation

**After Each Session**:
1. Create `sessions/YYYY-MM-DD.md` with today's work
2. Update [STATUS.md](STATUS.md) if priorities changed
3. Commit both files together

**When Adding Features**:
1. Create `features/feature-name.md` with design
2. Update [ROADMAP.md](ROADMAP.md) if milestone changes
3. Update [STATUS.md](STATUS.md) when feature completes

**When Making Architectural Decisions**:
1. Create `decisions/NNN-title.md` as ADR
2. Reference in relevant feature docs
3. Update [STATUS.md](STATUS.md) if it impacts current work

---

## 🗂️ Archive Policy

**What Goes in Archive**:
- Documents that are outdated but useful for reference
- Old detailed status docs replaced by newer structure
- Deprecated plans and designs
- Historical session notes (if we consolidate)

**What Stays Current**:
- STATUS.md, ROADMAP.md (living docs)
- Recent session notes (last 30 days)
- Active feature specs
- All ADRs (they're historical by nature)

---

## 🔮 Future Enhancements

**Timeline Display** (user request):
- Build UI to visualize session notes chronologically
- See project evolution over time
- Jump to specific dates
- Search across all sessions

**Better Navigation**:
- Auto-generate "latest session" link
- Index of all features
- Search functionality

**Templates**:
- Session note template
- Feature spec template
- ADR template

---

**Questions?** Check [STATUS.md](STATUS.md) or read the latest session notes.

**Happy building!** 🚀
