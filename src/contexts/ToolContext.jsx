/**
 * Tool Context
 *
 * Manages state for AI tool calls:
 * - Pending tool calls awaiting approval
 * - Tool execution history
 * - Approval/rejection callbacks
 *
 * Used by ToolExecutionService and UI components to coordinate
 * human-in-the-loop approval workflow for file modifications.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToolContext = createContext();

/**
 * Hook to access tool context
 */
export const useTool = () => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTool must be used within ToolProvider');
  }
  return context;
};

/**
 * Tool Provider Component
 */
export function ToolProvider({ children }) {
  // Pending tool calls waiting for user approval
  const [pendingToolCalls, setPendingToolCalls] = useState([]);

  // Tool execution history (for display in chat)
  const [toolHistory, setToolHistory] = useState([]);

  // Currently displayed diff preview
  const [activeDiffPreview, setActiveDiffPreview] = useState(null);

  /**
   * Add a tool call to the pending queue
   *
   * @param {object} toolCall - Tool call object
   * @returns {Promise} Resolves when user approves/rejects
   */
  const addPendingToolCall = useCallback((toolCall) => {
    return new Promise((resolve, reject) => {
      const toolCallWithCallbacks = {
        ...toolCall,
        resolve,
        reject,
        addedAt: Date.now(),
      };

      setPendingToolCalls((prev) => [...prev, toolCallWithCallbacks]);

      // If this is a read-only tool, auto-approve it
      if (
        toolCall.type === 'read_file' ||
        toolCall.type === 'list_files'
      ) {
        // Auto-approve after a brief delay (to show in UI)
        setTimeout(() => {
          approveToolCall(toolCall.id);
        }, 100);
      } else {
        // Show diff preview for modification tools
        setActiveDiffPreview(toolCallWithCallbacks);
      }
    });
  }, []);

  /**
   * Approve a pending tool call
   *
   * @param {string} toolCallId - ID of tool call to approve
   * @param {object} editedContent - Optional edited content (if user modified)
   */
  const approveToolCall = useCallback((toolCallId, editedContent = null) => {
    setPendingToolCalls((prev) => {
      const toolCall = prev.find((tc) => tc.id === toolCallId);

      if (toolCall) {
        // Update status
        toolCall.status = 'approved';

        // If user edited content, update it
        if (editedContent) {
          toolCall.updatedContent = editedContent;
        }

        // Add to history
        setToolHistory((history) => [
          ...history,
          { ...toolCall, approvedAt: Date.now() },
        ]);

        // Build modified tool call if content was edited
        const modifiedToolCall = editedContent
          ? { ...toolCall, parameters: { ...toolCall.parameters, content: editedContent } }
          : null;

        // Send approval response to main process
        if (window.electron && window.electron.sendToolApprovalResponse) {
          window.electron.sendToolApprovalResponse(
            toolCallId,
            true,
            modifiedToolCall
          );
        }

        // Resolve the promise (for local tool execution)
        toolCall.resolve({
          approved: true,
          content: editedContent || toolCall.updatedContent,
        });

        // Remove from pending
        return prev.filter((tc) => tc.id !== toolCallId);
      }

      return prev;
    });

    // Clear diff preview if this was the active one
    setActiveDiffPreview((current) =>
      current?.id === toolCallId ? null : current
    );
  }, []);

  /**
   * Reject a pending tool call
   *
   * @param {string} toolCallId - ID of tool call to reject
   * @param {string} reason - Optional rejection reason
   */
  const rejectToolCall = useCallback((toolCallId, reason = null) => {
    setPendingToolCalls((prev) => {
      const toolCall = prev.find((tc) => tc.id === toolCallId);

      if (toolCall) {
        // Update status
        toolCall.status = 'rejected';
        toolCall.rejectionReason = reason;

        // Add to history
        setToolHistory((history) => [
          ...history,
          { ...toolCall, rejectedAt: Date.now() },
        ]);

        // Send rejection response to main process
        if (window.electron && window.electron.sendToolApprovalResponse) {
          window.electron.sendToolApprovalResponse(toolCallId, false, null);
        }

        // Reject the promise (for local tool execution)
        toolCall.reject(new Error(reason || 'User rejected this change'));

        // Remove from pending
        return prev.filter((tc) => tc.id !== toolCallId);
      }

      return prev;
    });

    // Clear diff preview if this was the active one
    setActiveDiffPreview((current) =>
      current?.id === toolCallId ? null : current
    );
  }, []);

  /**
   * Mark a tool call as executed (after file operation completes)
   *
   * @param {string} toolCallId - ID of tool call
   * @param {object} result - Execution result
   */
  const markToolCallExecuted = useCallback((toolCallId, result) => {
    setToolHistory((history) =>
      history.map((tc) =>
        tc.id === toolCallId
          ? {
              ...tc,
              status: 'executed',
              result,
              executedAt: Date.now(),
            }
          : tc
      )
    );
  }, []);

  /**
   * Mark a tool call as failed
   *
   * @param {string} toolCallId - ID of tool call
   * @param {Error} error - Error object
   */
  const markToolCallFailed = useCallback((toolCallId, error) => {
    setToolHistory((history) =>
      history.map((tc) =>
        tc.id === toolCallId
          ? {
              ...tc,
              status: 'error',
              error: error.message,
              failedAt: Date.now(),
            }
          : tc
      )
    );
  }, []);

  /**
   * Clear all pending tool calls (e.g., on session change)
   */
  const clearPendingToolCalls = useCallback(() => {
    // Reject all pending
    pendingToolCalls.forEach((tc) => {
      tc.reject(new Error('Session changed or cleared'));
    });

    setPendingToolCalls([]);
    setActiveDiffPreview(null);
  }, [pendingToolCalls]);

  /**
   * Clear tool history
   */
  const clearToolHistory = useCallback(() => {
    setToolHistory([]);
  }, []);

  /**
   * Get tool call by ID
   *
   * @param {string} toolCallId - Tool call ID
   * @returns {object|null} Tool call object or null
   */
  const getToolCall = useCallback(
    (toolCallId) => {
      return (
        pendingToolCalls.find((tc) => tc.id === toolCallId) ||
        toolHistory.find((tc) => tc.id === toolCallId) ||
        null
      );
    },
    [pendingToolCalls, toolHistory]
  );

  /**
   * Listen for tool approval requests from main process
   */
  useEffect(() => {
    if (!window.electron || !window.electron.onToolApprovalRequest) {
      return;
    }

    const handleApprovalRequest = (data) => {
      const { id, toolCall } = data;

      // Add to pending queue (automatically shows approval UI)
      addPendingToolCall({
        ...toolCall,
        id: id, // Use the approval ID from main process
      });
    };

    // Register listener
    window.electron.onToolApprovalRequest(handleApprovalRequest);

    // Cleanup not needed - IPC listeners are managed by preload
  }, [addPendingToolCall]);

  const value = {
    // State
    pendingToolCalls,
    toolHistory,
    activeDiffPreview,

    // Actions
    addPendingToolCall,
    approveToolCall,
    rejectToolCall,
    markToolCallExecuted,
    markToolCallFailed,
    clearPendingToolCalls,
    clearToolHistory,
    getToolCall,

    // Computed
    hasPendingToolCalls: pendingToolCalls.length > 0,
    pendingCount: pendingToolCalls.length,
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
}
