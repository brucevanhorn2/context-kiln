# Context Kiln - Testing Plan (Phases 1 & 2)

**Purpose**: Validate that Phase 1 (Foundation) and Phase 2 (Claude API Integration) work correctly before merging Phase 3 & 4 from branch.

**Status**: Phase 1 & 2 in `main` branch, Phase 3 & 4 in feature branch
**Tester**: Manual testing (no automated tests yet)
**Environment**: macOS, Electron 27, React 19

---

## Pre-Test Setup

### 1. Environment Check
```bash
cd /Users/bruce.vanhorn/src/context-kiln
node --version        # Should be v22.19.0 or compatible
npm --version         # Should be 10.x+
git status            # Confirm on main branch
```

### 2. Install Dependencies
```bash
npm install           # Install all dependencies
npm run dev           # Should start without errors
```

**Expected**: Webpack dev server starts, Electron window opens

**If fails**: Check console for errors, verify package.json dependencies installed

---

## Phase 1: Foundation & Infrastructure Testing

### Test 1.1: Application Startup ✅
**Goal**: Verify app launches without crashes

**Steps**:
1. Run `npm run dev`
2. Wait for Electron window to open
3. Check window title shows "Context Kiln"
4. Verify dark mode theme is active

**Expected**:
- ✅ App window opens within 5 seconds
- ✅ Title bar shows "Context Kiln"
- ✅ UI is dark themed (Ant Design dark mode)
- ✅ No console errors in terminal
- ✅ No red error messages in Electron DevTools

**How to check DevTools**: 
- macOS: Cmd+Option+I
- Look for Console tab
- Should see normal React startup logs, no red errors

---

### Test 1.2: Database Initialization ✅
**Goal**: Verify SQLite database creates successfully

**Steps**:
1. Start app with `npm run dev`
2. Open Electron DevTools (Cmd+Option+I)
3. Go to Console tab
4. Look for database initialization logs

**Expected**:
- ✅ No "database error" messages
- ✅ Database file created at `~/Library/Application Support/context-kiln/usage.db`

**Manual verification**:
```bash
# Check if database exists
ls -la ~/Library/Application\ Support/context-kiln/
# Should see usage.db

# Inspect database schema (optional)
sqlite3 ~/Library/Application\ Support/context-kiln/usage.db ".schema"
# Should see tables: projects, sessions, token_usage, api_keys, settings
```

**If fails**: 
- Check for better-sqlite3 errors in console
- May need to run `npm rebuild better-sqlite3`

---

### Test 1.3: File Browser ✅
**Goal**: Verify file tree loads and displays correctly

**Steps**:
1. Click "Select Folder" button (or menu option)
2. Navigate to `/Users/bruce.vanhorn/src/context-kiln`
3. Select the folder
4. Observe file tree in left panel

**Expected**:
- ✅ Folder selection dialog opens
- ✅ Selected folder path displays
- ✅ File tree populates with files and folders
- ✅ Folders show expand/collapse arrows
- ✅ Files show appropriate icons (based on extension)
- ✅ Tree is scrollable if content overflows

**File Icon Check**:
- `.js`, `.jsx` files show JavaScript icon
- `.md` files show document icon
- `.json` files show JSON icon
- Folders show folder icon

**If fails**: 
- Check console for FileService errors
- Verify IPC communication between main and renderer

---

### Test 1.4: Drag & Drop to Context ✅
**Goal**: Verify files can be dragged from tree to context panel

**Steps**:
1. With folder loaded in file tree
2. Find a `.js` or `.jsx` file
3. Click and drag file from tree
4. Drop onto "Context Files" panel (right side)
5. Verify file appears in context list

**Expected**:
- ✅ Dragging shows visual feedback (file moves with cursor)
- ✅ Drop zone highlights when hovering
- ✅ File appears in context list after drop
- ✅ File shows name and path
- ✅ File shows estimated token count

**Try dragging**:
- Single file
- Multiple files (Cmd+click to select multiple, then drag)

**If fails**:
- Check if drag events are firing (DevTools console)
- Verify context state is updating

---

### Test 1.5: Remove File from Context ✅
**Goal**: Verify files can be removed from context

**Steps**:
1. Drag file to context (from Test 1.4)
2. Hover over file in context list
3. Click "X" or "Remove" button
4. Verify file disappears from context

**Expected**:
- ✅ Remove button visible on hover
- ✅ File removed from list immediately
- ✅ Context list re-renders correctly

---

### Test 1.6: Token Counting ✅
**Goal**: Verify token counter estimates file sizes

**Steps**:
1. Add a file to context (e.g., `src/App.jsx`)
2. Check displayed token count
3. Add several files
4. Verify total token count updates

**Expected**:
- ✅ Each file shows individual token count (~X tokens)
- ✅ Total context size displayed
- ✅ Counts are reasonable (not 0, not millions)
- ✅ Adding files increases total

**Sanity check**:
- Small file (50 lines) ~500-1000 tokens
- Medium file (200 lines) ~2000-5000 tokens
- Large file (1000 lines) ~10000-20000 tokens

**If fails**:
- Check console for tiktoken errors
- May fall back to character-based estimation
- Verify TokenCounterService is initialized

---

## Phase 2: Claude API Integration Testing

### Test 2.1: Settings Modal Opens ✅
**Goal**: Verify settings UI is accessible

**Steps**:
1. Click menu: File > Settings (or Ctrl+,)
2. Settings modal should open

**Expected**:
- ✅ Modal window appears
- ✅ Modal shows tabs or sections
- ✅ "API Keys" section visible
- ✅ "Model Selection" section visible
- ✅ Modal can be closed (X button or Cancel)

**If fails**:
- Check for SettingsModal component errors
- Verify IPC handler registered in main.js

---

### Test 2.2: API Key Configuration ✅
**Goal**: Verify API key can be added and saved

**Steps**:
1. Open Settings modal
2. Navigate to API Keys section
3. Click "Add API Key"
4. Enter:
   - Provider: Anthropic (Claude)
   - Name: "My Claude Key"
   - API Key: (your actual Anthropic API key from https://console.anthropic.com/)
5. Click Save
6. Close settings
7. Re-open settings
8. Verify API key is still there

**Expected**:
- ✅ API key form appears
- ✅ Can select Anthropic as provider
- ✅ Can enter key name and value
- ✅ Save button works
- ✅ Key persists across app restarts
- ✅ Key is stored securely (electron-store)

**Security check**:
- API key should NOT be visible in clear text in database
- Check: `sqlite3 ~/Library/Application\ Support/context-kiln/usage.db "SELECT * FROM api_keys;"`
- Should see key metadata but NOT the actual API key (stored in electron-store)

**If fails**:
- Check console for electron-store errors
- Verify IPC handlers for settings work

---

### Test 2.3: Model Selection ✅
**Goal**: Verify AI model can be selected

**Steps**:
1. Open Settings modal
2. Go to Model Selection
3. Verify available models listed:
   - Claude Opus 4.5
   - Claude Sonnet 3.7
   - Claude Sonnet 3.5
   - Claude Haiku 3.5
4. Select "Claude Sonnet 3.7" (default)
5. Save settings
6. Verify selection persists

**Expected**:
- ✅ Model dropdown shows all 4 Claude models
- ✅ Can select a model
- ✅ Selection saves
- ✅ Selection persists across app restarts

---

### Test 2.4: Session Creation ✅
**Goal**: Verify new session can be created

**Steps**:
1. Click "New Session" button (or menu option)
2. Enter session name: "test-session-001"
3. Click Create
4. Verify session appears in session selector dropdown

**Expected**:
- ✅ New session dialog opens
- ✅ Can enter session name
- ✅ Session creates without errors
- ✅ Session directory created at: `<selected-folder>/.context-kiln/sessions/test-session-001/`
- ✅ Session files created:
  - session.json
  - context.md
  - decisions.md
  - README.md
  - conversation-history/ (directory)
  - artifacts/ (directory)

**Manual verification**:
```bash
# Navigate to your selected folder
cd /Users/bruce.vanhorn/src/context-kiln
ls -la .context-kiln/sessions/test-session-001/
# Should see session files
```

---

### Test 2.5: Session Switching ✅
**Goal**: Verify can switch between sessions

**Steps**:
1. Create session "session-A"
2. Add some files to context
3. Type a message in chat (don't send yet)
4. Create session "session-B"
5. Switch back to "session-A"
6. Verify context files are restored
7. Verify message is still there

**Expected**:
- ✅ Session selector dropdown shows both sessions
- ✅ Can switch between sessions
- ✅ Context restores correctly per session
- ✅ Chat history restores per session
- ✅ No data loss when switching

**If fails**:
- Check SessionContext state management
- Verify session files are saving/loading correctly

---

### Test 2.6: Send Message to Claude ✅ (CRITICAL TEST)
**Goal**: Verify actual API integration works

**Prerequisites**:
- Valid Anthropic API key configured
- Session created
- At least one file in context (optional but recommended)

**Steps**:
1. Ensure API key is configured (Test 2.2)
2. Create a new session
3. (Optional) Add `src/App.jsx` to context
4. Type message in chat: "Hello, can you see the files I've added to context?"
5. Click Send button
6. Wait for response

**Expected - Success Case**:
- ✅ Send button disabled during request
- ✅ "Claude is typing..." indicator appears
- ✅ Response streams in character-by-character (not all at once)
- ✅ Response completes with full message
- ✅ Message appears in chat history
- ✅ Token usage recorded in database
- ✅ No errors in console

**Expected - If context file was added**:
- ✅ Claude should acknowledge seeing the file
- ✅ Claude should be able to answer questions about file content

**Example test questions**:
- "What is the main component in App.jsx?"
- "List the imports in this file"
- "What state is being managed?"

**If fails - Error Cases**:

**401 Unauthorized**:
- API key invalid or missing
- Check API key in settings
- Verify key at https://console.anthropic.com/

**429 Rate Limited**:
- Too many requests
- Wait a minute and try again
- Check API quota

**500 Server Error**:
- Anthropic API issue
- Try again in a few minutes
- Check https://status.anthropic.com/

**Network Error**:
- No internet connection
- Check network
- Try: `ping api.anthropic.com`

**Streaming Error**:
- Check AnthropicAdapter streaming implementation
- Look for WebSocket or EventSource errors

---

### Test 2.7: Context Injection ✅
**Goal**: Verify files are actually sent to Claude

**Steps**:
1. Create new session
2. Add file `src/services/TokenCounterService.js` to context
3. Send message: "What does the countTokens function do?"
4. Wait for response

**Expected**:
- ✅ Claude's response references the actual code
- ✅ Claude explains the countTokens function specifically
- ✅ Claude doesn't say "I can't see any files"

**If fails**:
- Context files not being formatted into prompt
- Check ContextInjector or AIProviderService formatRequest
- Verify AnthropicAdapter is building messages correctly

---

### Test 2.8: Streaming Response ✅
**Goal**: Verify responses stream in real-time

**Steps**:
1. Send message: "Write a 10-line hello world program in JavaScript with detailed comments"
2. Watch response appear

**Expected**:
- ✅ Text appears gradually (character by character or word by word)
- ✅ NOT: entire response appears at once after delay
- ✅ Can see typing progress
- ✅ Response feels "live"

**If fails**:
- Streaming not implemented
- Check AnthropicAdapter.sendMessage stream handling
- Verify IPC streaming events

---

### Test 2.9: Stop Generation ✅
**Goal**: Verify can stop mid-response

**Steps**:
1. Send message: "Write a very long essay about the history of computing"
2. Wait for response to start streaming
3. Click "Stop" button while response is generating
4. Verify generation stops

**Expected**:
- ✅ Stop button appears during generation
- ✅ Clicking stop halts the response
- ✅ Partial response is kept in chat
- ✅ No errors from stopping mid-stream

**If fails**:
- Stop functionality not implemented
- Check streaming abort logic

---

### Test 2.10: Token Usage Tracking ✅
**Goal**: Verify token usage is recorded to database

**Steps**:
1. Send a message to Claude (any message)
2. Wait for response
3. Open database to check usage was recorded

**Manual verification**:
```bash
sqlite3 ~/Library/Application\ Support/context-kiln/usage.db
SELECT * FROM token_usage ORDER BY timestamp DESC LIMIT 5;
.quit
```

**Expected**:
- ✅ New row inserted for this API call
- ✅ Columns populated:
  - project_id (folder ID)
  - session_id (session UUID)
  - api_key_id (key used)
  - model (claude-sonnet-3.7)
  - input_tokens (> 0)
  - output_tokens (> 0)
  - total_tokens (sum of input + output)
  - estimated_cost (> 0.0)
  - timestamp (current time)

**If fails**:
- DatabaseService.recordUsage not being called
- Check AIProviderService after response completes

---

### Test 2.11: Session Persistence ✅
**Goal**: Verify chat history saves and loads

**Steps**:
1. Create session "persistence-test"
2. Send message: "Hello"
3. Wait for Claude's response
4. Close app completely (Cmd+Q)
5. Restart app (`npm run dev`)
6. Load same session
7. Verify chat history is restored

**Expected**:
- ✅ Previous messages visible after restart
- ✅ Both user and assistant messages restored
- ✅ Message order preserved
- ✅ Context files restored

**If fails**:
- Session files not saving correctly
- Check SessionService save/load logic
- Verify conversation-history/ files created

---

### Test 2.12: Multiple Messages in Conversation ✅
**Goal**: Verify context is maintained across messages

**Steps**:
1. Create new session
2. Send: "My name is Bruce"
3. Wait for response
4. Send: "What is my name?"
5. Wait for response

**Expected**:
- ✅ Claude remembers your name from previous message
- ✅ Claude responds with "Bruce" or "Your name is Bruce"
- ✅ NOT: "I don't know your name"

**If fails**:
- Conversation history not being sent
- Check message array building in AIProviderService

---

## Error Handling Tests

### Test E.1: Invalid API Key ❌
**Goal**: Verify graceful error handling

**Steps**:
1. Configure API key with invalid value: "sk-invalid-key-12345"
2. Try sending message
3. Observe error handling

**Expected**:
- ✅ User-friendly error message shown
- ✅ NOT: raw API error dumped to UI
- ✅ Message like: "Invalid API key. Please check your settings."
- ✅ App doesn't crash

---

### Test E.2: Network Offline ❌
**Goal**: Verify network error handling

**Steps**:
1. Disconnect from internet
2. Try sending message
3. Observe error

**Expected**:
- ✅ Error message: "Network error. Check internet connection."
- ✅ Message stays in input (can retry later)
- ✅ App doesn't crash

---

### Test E.3: Large Context Warning ⚠️
**Goal**: Verify token limit warnings

**Steps**:
1. Add many large files to context (20+ files, >100k tokens)
2. Observe warning messages

**Expected**:
- ✅ Warning shown when approaching limit (150k default)
- ✅ Suggests removing files
- ✅ Can still send if user confirms

**If not implemented yet**: Mark as "Future Enhancement"

---

## Performance Tests

### Test P.1: Large File Tree 🚀
**Goal**: Verify performance with large project

**Steps**:
1. Select a large folder (e.g., `node_modules` with 10k+ files)
2. Observe load time
3. Test scrolling performance

**Expected**:
- ✅ Tree loads within 3 seconds
- ✅ Scrolling is smooth (no lag)
- ✅ Can collapse/expand folders smoothly

**If fails**:
- May need virtualization for large trees
- Note as performance issue

---

### Test P.2: Token Counting Performance 🚀
**Goal**: Verify token counting doesn't block UI

**Steps**:
1. Add 10 large files to context quickly
2. Observe UI responsiveness

**Expected**:
- ✅ UI doesn't freeze during counting
- ✅ Counts appear within 1 second per file
- ✅ Can continue using app while counting

**If fails**:
- Token counting should be async or debounced

---

## Testing Checklist Summary

### Phase 1 Tests (Foundation)
- [ ] 1.1 - Application Startup
- [ ] 1.2 - Database Initialization
- [ ] 1.3 - File Browser
- [ ] 1.4 - Drag & Drop to Context
- [ ] 1.5 - Remove File from Context
- [ ] 1.6 - Token Counting

### Phase 2 Tests (Claude API)
- [ ] 2.1 - Settings Modal Opens
- [ ] 2.2 - API Key Configuration
- [ ] 2.3 - Model Selection
- [ ] 2.4 - Session Creation
- [ ] 2.5 - Session Switching
- [ ] 2.6 - Send Message to Claude ⭐ CRITICAL
- [ ] 2.7 - Context Injection
- [ ] 2.8 - Streaming Response
- [ ] 2.9 - Stop Generation
- [ ] 2.10 - Token Usage Tracking
- [ ] 2.11 - Session Persistence
- [ ] 2.12 - Multiple Messages

### Error Handling Tests
- [ ] E.1 - Invalid API Key
- [ ] E.2 - Network Offline
- [ ] E.3 - Large Context Warning

### Performance Tests
- [ ] P.1 - Large File Tree
- [ ] P.2 - Token Counting Performance

---

## Test Results Template

Copy this for each testing session:

```
## Test Session: [DATE]
**Tester**: Bruce Van Horn
**Environment**: macOS, Node 22.19.0, Electron 27
**Branch**: main
**Commit**: [git rev-parse HEAD]

### Results:
- Phase 1: [X/6] tests passed
- Phase 2: [X/12] tests passed
- Error Handling: [X/3] tests passed
- Performance: [X/2] tests passed

### Critical Issues Found:
1. [Issue description]
2. [Issue description]

### Minor Issues Found:
1. [Issue description]

### Notes:
- [Any observations]
- [Things that worked well]
- [Things that need improvement]

### Next Steps:
- [ ] Fix critical issues
- [ ] Re-test failed tests
- [ ] Merge Phase 3 & 4 if all tests pass
```

---

## Success Criteria

**Phase 1 & 2 are ready to merge Phase 3 & 4 when**:
- ✅ All Phase 1 tests pass (6/6)
- ✅ Test 2.6 (Send Message to Claude) works ⭐
- ✅ Test 2.7 (Context Injection) works
- ✅ No critical errors or crashes
- ✅ Database persists correctly

**Can proceed with minor issues if**:
- UI polish issues (styling, layout)
- Performance could be better but usable
- Non-critical features not fully implemented

**Must fix before merging if**:
- App crashes frequently
- API integration doesn't work
- Data loss occurs
- Database corrupts

---

## Quick Smoke Test (5 minutes)

If short on time, run this abbreviated test:

1. ✅ Start app (`npm run dev`)
2. ✅ Select folder
3. ✅ Drag file to context
4. ✅ Configure API key in settings
5. ✅ Create session
6. ✅ Send message to Claude with context file
7. ✅ Verify response mentions file content
8. ✅ Restart app and verify session loads

**If all 8 pass**: Core functionality works, can proceed

**If any fail**: Run full test suite to identify issues

---

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Status**: Ready for testing
**Maintained By**: Context Kiln development team
