# ADR 001: Adapter Pattern for AI Provider Integration

**Date**: 2026-01-13
**Status**: Approved and Implemented
**Deciders**: Bruce Van Horn (User), Claude (Assistant)
**Context**: Context Kiln MVP Phase 1 Architecture

---

## Context

Context Kiln needs to integrate with multiple AI providers (Claude, GPT, Ollama) both now and in the future. During initial planning, a simple `ClaudeService` was proposed with direct integration to the Anthropic API using XML formatting for context files.

**The Critical Moment**: When asked about the XML context format choice, the user responded:

> "XML is so 1995! The reason I was really asking is because my instincts are to direct you to not tightly couple our app's context presentation to the model to the requirements of the model apis themselves."

This feedback identified a significant architectural risk: **tight coupling** between our internal context representation and provider-specific API requirements.

The user continued:

> "We'd want to use an adapter or facade pattern to present a de-coupling between the two... we want some decoupling there so that when new frameworks emerge or as api standards change we have separation of concerns as well as the ability to maintain backwards compatibility."

---

## Decision

**We will implement the Adapter Pattern with a Facade** for all AI provider integrations.

### Architecture Overview

```
Internal Context Format (API-agnostic JavaScript object)
                    ↓
         AIProviderService (Facade)
                    ↓
            BaseAdapter (Abstract)
                    ↓
      ┌─────────────┼─────────────┬──────────┐
      ↓             ↓             ↓          ↓
 Anthropic       OpenAI        Ollama     Future
 Adapter         Adapter       Adapter    Adapters
      ↓             ↓             ↓
   Claude         GPT-4        Local
    API            API         Models
```

### Core Components

#### 1. Internal Context Format (API-Agnostic)

```javascript
{
  contextFiles: [
    {
      path: 'src/App.js',
      content: '...',
      language: 'javascript',
      metadata: { lines: 150, tokens: 850, size: 4200 }
    }
  ],
  userMessage: 'Fix the authentication bug',
  sessionContext: {
    summary: 'Working on auth system',
    previousMessages: [...]
  },
  preferences: {
    includeLineNumbers: true,
    contextFormat: 'markdown'  // Provider can override
  }
}
```

**Key Point**: This format knows nothing about Anthropic, OpenAI, or Ollama. It's purely about *what* context we want to send, not *how* to format it.

#### 2. BaseAdapter (Abstract Class)

**Purpose**: Define the contract that all provider adapters must implement.

**File**: `src/services/adapters/BaseAdapter.js` (221 lines)

**Abstract Methods** (must be implemented):
- `formatRequest(internalContext, model)` - Transform internal format to provider's API format
- `parseResponse(apiResponse)` - Transform provider's response to internal format
- `sendRequest(formattedRequest, onChunk, onComplete, onError)` - Execute API call
- `validateApiKey(apiKey)` - Verify API key is valid

**Helper Methods** (provided to subclasses):
- `formatContextFiles(contextFiles, format)` - Format files as markdown, XML, or plain text
- `formatAsMarkdown()` - Markdown code blocks with syntax highlighting
- `formatAsXML()` - XML with CDATA sections
- `formatAsPlain()` - Plain text with delimiters

**Why Abstract?**
- Enforces contract compliance
- Prevents accidental instantiation
- Provides shared utilities
- Ensures consistency across adapters

#### 3. Provider Adapters (Concrete Implementations)

**AnthropicAdapter** (`src/services/adapters/AnthropicAdapter.js` - 272 lines)

**Full implementation for MVP**:
- Transforms internal context to Claude Messages API format
- Uses **markdown** formatting (works well with Claude)
- Implements streaming with callbacks
- Handles errors with user-friendly messages
- Model catalog: Opus 4.5, Sonnet 3.7, Sonnet 3.5, Haiku 3.5

**Key Code**:
```javascript
formatRequest(internalContext, model) {
  let content = this.formatContextFiles(internalContext.contextFiles, 'markdown');
  content += `\n\n# User Question\n${internalContext.userMessage}`;

  return {
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
    stream: true
  };
}
```

**OpenAIAdapter** (`src/services/adapters/OpenAIAdapter.js` - 89 lines)

**Stub for Phase 2**:
- Model catalog defined (GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
- Methods throw "not yet implemented"
- Demonstrates pattern for future contributors

**OllamaAdapter** (`src/services/adapters/OllamaAdapter.js` - 90 lines)

**Stub for local models**:
- Endpoint: http://localhost:11434
- No API key required (local)
- Models: Llama 3.1, Code Llama, Mistral

#### 4. AIProviderService (Facade)

**Purpose**: Provide a unified interface for the entire application.

**File**: `src/services/AIProviderService.js` (333 lines)

**Key Responsibilities**:
- Register adapters: `registerAdapter('anthropic', AnthropicAdapter)`
- Route messages: `sendMessage(internalContext, model, provider)`
- Provider switching: `setActiveProvider('anthropic')`
- Query capabilities: `getAvailableModels(provider)`
- Validate keys: `validateApiKey(provider, apiKey)`
- Log usage: Automatically records tokens to database
- Calculate costs: Based on model pricing

**Key Code**:
```javascript
async sendMessage(internalContext, model, providerName = null, onChunk, onComplete, onError) {
  const provider = providerName || this.activeProvider;
  const adapter = this._getAdapter(provider);

  const formattedRequest = adapter.formatRequest(internalContext, model);

  const response = await adapter.sendRequest(
    formattedRequest,
    onChunk,
    async (adapterResponse) => {
      // Automatically log usage to database
      await this._logUsage(provider, model, internalContext, adapterResponse.usage);
      if (onComplete) onComplete(adapterResponse);
    },
    onError
  );

  return response;
}
```

**Why Facade?**
- UI code only knows about `AIProviderService`, not adapters
- Cross-cutting concerns (logging, error handling) in one place
- Provider switching transparent to UI
- Single point of control

---

## Rationale

### Why Adapter Pattern?

1. **Decoupling**
   - Internal code never knows about Anthropic/OpenAI/Ollama specifics
   - Context format can evolve independently from provider APIs
   - Provider APIs can change without affecting application

2. **Extensibility**
   - Adding new providers = create new adapter (no core changes)
   - Can support 10 providers without changing `AIProviderService`
   - Future-proof against new AI services

3. **Evolution & Backwards Compatibility**
   - Provider API v2 = new adapter, keep v1 adapter
   - Can support multiple API versions simultaneously
   - Gradual migration paths

4. **Testing**
   - Create mock adapters for testing without API calls
   - Test internal logic independently from providers
   - Simulate provider responses easily

5. **Optimization**
   - Each adapter optimizes formatting for its provider
   - Claude: markdown (better reasoning)
   - GPT: structured prompts (better instruction-following)
   - Ollama: minimal overhead (local, no rate limits)

### Why Facade Pattern?

1. **Simplicity**
   - UI code: `window.electron.sendAIMessage(message)`
   - Don't need to know: adapters, formatting, logging, cost tracking
   - One method call does everything

2. **Provider Switching**
   - Runtime provider changes without UI code changes
   - Just change `activeProvider` setting
   - All wiring handled internally

3. **Cross-Cutting Concerns**
   - Logging to database: one place
   - Cost calculation: one place
   - Error handling: one place
   - Token tracking: one place

4. **Consistency**
   - All providers accessed through identical interface
   - Same callbacks (onChunk, onComplete, onError)
   - Same error format across providers

### Why NOT a Simple ClaudeService?

The initial approach would have created these problems:

#### Tight Coupling
```javascript
// BAD: Tight coupling
class ClaudeService {
  async sendMessage(contextFiles, message) {
    // Anthropic-specific formatting mixed with business logic
    const xmlContext = this._formatAsXML(contextFiles);
    const prompt = `<context>${xmlContext}</context>\n\nUser: ${message}`;
    const response = await this.anthropicClient.messages.create({...});
  }
}
```

**Problems**:
- Context formatting logic tied to Claude API
- Adding GPT requires duplicating context logic
- Changing context format requires changing ClaudeService
- Testing requires mocking Anthropic SDK

#### With Adapter Pattern
```javascript
// GOOD: Decoupled
class AIProviderService {
  async sendMessage(internalContext, model, provider) {
    // Just route to appropriate adapter
    const adapter = this.adapters[provider];
    return adapter.sendMessage(internalContext, model);
  }
}
```

**Benefits**:
- Context format independent from providers
- Adding GPT = just create GPTAdapter
- Testing = mock adapter, not provider SDK
- Internal context can change without touching adapters

---

## Consequences

### Positive ✅

1. **Future-Proof**
   - Can add GitHub Copilot, Gemini, Mistral without core changes
   - New AI services = new adapter file (10-15 minutes of work)

2. **Backwards Compatible**
   - Adapters can maintain compatibility with old API versions
   - Can support Anthropic API v1 and v2 simultaneously

3. **Maintainable**
   - Provider-specific code isolated to single file
   - Bug in Claude adapter doesn't affect GPT adapter
   - Clear separation of concerns

4. **Testable**
   - Easy to create mock adapters
   - Can test UI without real API calls
   - Can simulate streaming, errors, edge cases

5. **Optimizable**
   - Each adapter optimizes for its provider's strengths
   - Claude: longer context with markdown
   - GPT: structured system messages
   - Ollama: minimal formatting overhead

6. **User Control**
   - Users can switch providers seamlessly
   - Compare same task across providers
   - Use cheapest provider for simple tasks

### Negative ⚠️

1. **Complexity**
   - More files: 4 adapters + 1 facade vs 1 service
   - More indirection: UI → Facade → Adapter → API
   - Steeper learning curve for contributors

2. **Abstraction Overhead**
   - Small performance cost for transformation
   - Extra function calls in hot path
   - Memory allocation for internal format

3. **Maintenance Burden**
   - Must update all adapters when internal format changes
   - Must keep adapters in sync with provider API changes
   - More code to test

### Mitigations

**For Complexity**:
- Comprehensive documentation (this ADR)
- Inline comments explaining "why"
- OpenAIAdapter stub demonstrates pattern
- Architecture.md deep dive

**For Performance**:
- Transformation overhead negligible vs network I/O (< 1ms vs 500-2000ms)
- Can optimize later if needed (caching, pooling)
- Streaming means no blocking on transformation

**For Maintenance**:
- Strong typing via JSDoc comments
- Automated tests for each adapter
- Version pinning for provider SDKs
- CI/CD catches breaking changes

---

## Implementation Status

### Phase 1 (Completed 2026-01-13)

✅ **BaseAdapter** - `src/services/adapters/BaseAdapter.js` (221 lines)
- Abstract class with format helpers
- Enforces contract via abstract methods
- Provides markdown/XML/plain formatting utilities

✅ **AnthropicAdapter** - `src/services/adapters/AnthropicAdapter.js` (272 lines)
- Full Claude API implementation
- Streaming support with callbacks
- Error handling with user-friendly messages
- Model catalog (4 models with pricing)

✅ **OpenAIAdapter** - `src/services/adapters/OpenAIAdapter.js` (89 lines)
- Stub implementation (Phase 2)
- Model catalog defined
- Demonstrates pattern

✅ **OllamaAdapter** - `src/services/adapters/OllamaAdapter.js` (90 lines)
- Stub for local models
- No API key required
- Local endpoint configuration

✅ **AIProviderService** - `src/services/AIProviderService.js` (333 lines)
- Adapter registration system
- Provider routing
- Usage logging
- Cost calculation

### Phase 2 (Post-MVP)

⏳ Implement OpenAIAdapter fully
⏳ Implement OllamaAdapter fully
⏳ Add GitHub Copilot adapter (if API available)
⏳ Provider-specific optimizations
⏳ Adapter versioning system

---

## Alternatives Considered

### 1. Direct Integration (ClaudeService)

**Approach**: Single service directly calling Anthropic API

**Pros**:
- Simpler (fewer files)
- Less indirection
- Easier for beginners

**Cons**:
- Tight coupling to Anthropic
- Adding GPT requires duplicating logic
- Hard to test
- Vendor lock-in

**Verdict**: ❌ Rejected - Creates technical debt

### 2. Strategy Pattern Only (No Facade)

**Approach**: UI code directly instantiates and uses adapters

**Pros**:
- Simpler than adapter + facade
- More direct control

**Cons**:
- UI must manage provider switching
- Cross-cutting concerns duplicated
- Harder to add features (logging, caching)

**Verdict**: ❌ Rejected - Puts too much logic in UI

### 3. Plugin System with Dynamic Loading

**Approach**: Load adapters as separate modules at runtime

**Pros**:
- Ultimate extensibility
- Third-party adapters possible
- Can distribute adapters separately

**Cons**:
- Significant complexity
- Security risks (loading external code)
- Overkill for MVP

**Verdict**: ❌ Rejected - Over-engineering

### 4. Microservices Architecture

**Approach**: Each provider as separate service

**Pros**:
- Ultimate isolation
- Independent scaling
- Language-agnostic

**Cons**:
- Massive complexity
- Network latency
- Not suitable for desktop app

**Verdict**: ❌ Rejected - Wrong architecture for Electron

---

## Related Decisions

- **[002-session-files.md](./002-session-files.md)** - Session management architecture (pending)
- **[003-token-tracking.md](./003-token-tracking.md)** - Token tracking implementation (pending)
- **[004-internal-context-format.md](./004-internal-context-format.md)** - Internal format specification (pending)

---

## References

**Books**:
- Design Patterns: Elements of Reusable Object-Oriented Software (Gang of Four)
  - Adapter Pattern (pg. 139)
  - Facade Pattern (pg. 185)

**User Quotes** (from timeline.md):
> "XML is so 1995! The reason I was really asking is because my instincts are to direct you to not tightly couple our app's context presentation to the model to the requirements of the model apis themselves."

> "We'd want to use an adapter or facade pattern to present a de-coupling between the two... the apis are going to use REST presumably and furthermore there will be a POST request... we want some decoupling there so that when new frameworks emerge or as api standards change we have separation of concerns as well as the ability to maintain backwards compatibility."

---

## Timeline

- **2026-01-13 10:30 AM** - Initial proposal: ClaudeService with XML
- **2026-01-13 11:00 AM** - User feedback: tight coupling identified
- **2026-01-13 11:15 AM** - Decision: Adapter + Facade pattern
- **2026-01-13 11:30 AM** - Plan updated with adapter architecture
- **2026-01-13 12:00 PM** - Plan approved by user
- **2026-01-13 12:30 PM** - Implementation started
- **2026-01-13 1:00 PM** - BaseAdapter + 3 adapters completed
- **2026-01-13 1:15 PM** - AIProviderService facade completed

---

## Status

**Decision**: Approved
**Implementation**: Complete (Phase 1)
**Last Updated**: 2026-01-13
**Next Review**: After Phase 2 OpenAI/Ollama implementation

---

## Lessons Learned

### Critical Insight

This decision was a **pivotal moment** in the project. The conversation progression:

1. **Initial Proposal**: ClaudeService with XML formatting
2. **User Reaction**: "XML is so 1995!" → identified tight coupling risk
3. **User Suggestion**: Adapter/facade pattern for decoupling
4. **Outcome**: Complete architectural redesign before implementation

**Key Lesson**: **Always validate approach with stakeholders before deep implementation.**

The user's 30+ years of systems engineering experience caught a design flaw that would have created significant technical debt. Had we proceeded with ClaudeService, we would have eventually needed a costly refactor when adding GPT/Ollama support.

**This saved us**:
- ~2 weeks of refactoring later
- Preserved clean architecture
- Made future features trivial to add
- Demonstrated value of user domain expertise

### Process Insight

The user later revealed their philosophy:

> "we will make mistakes. The mistakes should be documented so that we can avoid making the same mistakes in the future"

**This wasn't a mistake** - it was a **course correction** that prevented a mistake. The documentation of *why* we chose this pattern (this ADR) ensures:

1. Future contributors understand the reasoning
2. We don't simplify back to ClaudeService later
3. New AI services follow the same pattern
4. Architectural decisions are traceable

---

## Appendix: Code Examples

### Example: Adding a New Provider

**Step 1**: Create adapter file

```javascript
// src/services/adapters/GeminiAdapter.js
const BaseAdapter = require('./BaseAdapter');

class GeminiAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('gemini', config);
  }

  formatRequest(internalContext, model) {
    // Transform internal format to Gemini API format
    // Use XML since Gemini prefers structured data
    const content = this.formatContextFiles(internalContext.contextFiles, 'xml');
    return {
      model: model || 'gemini-pro',
      contents: [{ role: 'user', parts: [{ text: content }] }]
    };
  }

  parseResponse(apiResponse) {
    return {
      content: apiResponse.candidates[0].content.parts[0].text,
      usage: {
        inputTokens: apiResponse.usageMetadata.promptTokenCount,
        outputTokens: apiResponse.usageMetadata.candidatesTokenCount
      }
    };
  }

  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    // Implement Gemini API call
  }
}

module.exports = GeminiAdapter;
```

**Step 2**: Register in AIProviderService

```javascript
// src/services/AIProviderService.js
const GeminiAdapter = require('./adapters/GeminiAdapter');

this.registerAdapter('gemini', GeminiAdapter);
```

**That's it!** No changes to UI, database, session management, or any other code.

---

_This ADR follows the format: Context → Decision → Consequences → Alternatives → Implementation → Lessons Learned_
