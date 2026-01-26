/**
 * IPCToolContext - Bridge between main process tool execution and renderer approval UI
 *
 * This class provides a toolContext interface for ToolExecutionService
 * that communicates with the renderer process for user approval.
 *
 * Flow:
 * 1. Tool needs approval in main process
 * 2. IPCToolContext sends IPC message to renderer
 * 3. Renderer shows DiffPreviewModal to user
 * 4. User approves/rejects
 * 5. Renderer sends response back via IPC
 * 6. Promise resolves/rejects
 * 7. Tool execution continues/fails
 */
class IPCToolContext {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.pendingApprovals = new Map(); // toolCallId -> { resolve, reject }
    this.approvalTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Request approval for a tool call
   * Returns a promise that resolves when user approves, rejects when user denies
   *
   * @param {object} toolCall - Tool call object with id, type, parameters
   * @returns {Promise} Resolves on approval, rejects on rejection
   */
  addPendingToolCall(toolCall) {
    return new Promise((resolve, reject) => {
      const approvalId = toolCall.id || `tool-${Date.now()}`;

      // Store callbacks
      this.pendingApprovals.set(approvalId, { resolve, reject });

      // Set timeout for approval
      const timeout = setTimeout(() => {
        if (this.pendingApprovals.has(approvalId)) {
          this.pendingApprovals.delete(approvalId);
          reject(new Error('Tool approval timed out'));
        }
      }, this.approvalTimeout);

      // Send approval request to renderer
      this.mainWindow.webContents.send('tool:approval-request', {
        id: approvalId,
        toolCall: toolCall,
      });

      // Attach timeout to pending approval for cleanup
      this.pendingApprovals.get(approvalId).timeout = timeout;
    });
  }

  /**
   * Handle approval response from renderer
   *
   * @param {string} approvalId - ID of the approval request
   * @param {boolean} approved - Whether user approved
   * @param {object} modifiedToolCall - Modified tool call (if user edited)
   */
  handleApprovalResponse(approvalId, approved, modifiedToolCall = null) {
    const pending = this.pendingApprovals.get(approvalId);

    if (!pending) {
      console.warn(`[IPCToolContext] No pending approval found for ID: ${approvalId}`);
      return;
    }

    // Clear timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    // Remove from pending
    this.pendingApprovals.delete(approvalId);

    // Resolve or reject based on user decision
    if (approved) {
      pending.resolve(modifiedToolCall);
    } else {
      pending.reject(new Error('User rejected tool call'));
    }
  }

  /**
   * Cleanup all pending approvals (e.g., on window close)
   */
  cleanup() {
    for (const [id, pending] of this.pendingApprovals.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Tool context cleanup'));
    }
    this.pendingApprovals.clear();
  }
}

module.exports = IPCToolContext;
