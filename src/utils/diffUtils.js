/**
 * Diff Utilities
 *
 * Provides utilities for calculating and formatting diffs between file contents.
 * Used by the tool use system to preview changes before applying them.
 */

const diff = require('diff');

/**
 * Calculate diff between two strings
 *
 * @param {string} oldContent - Original content
 * @param {string} newContent - New content
 * @returns {object} Diff result with statistics
 */
function calculateDiff(oldContent, newContent) {
  const changes = diff.diffLines(oldContent, newContent);

  let additions = 0;
  let deletions = 0;
  let changedLines = 0;

  changes.forEach((part) => {
    if (part.added) {
      additions += part.count;
      changedLines += part.count;
    }
    if (part.removed) {
      deletions += part.count;
      changedLines += part.count;
    }
  });

  return {
    changes,
    additions,
    deletions,
    changedLines,
    hasChanges: additions > 0 || deletions > 0,
  };
}

/**
 * Format diff for display (unified diff format)
 *
 * @param {string} oldContent - Original content
 * @param {string} newContent - New content
 * @returns {string} Formatted diff string
 */
function formatDiff(oldContent, newContent) {
  const changes = diff.diffLines(oldContent, newContent);

  let result = '';
  changes.forEach((part) => {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    const lines = part.value.split('\n');

    lines.forEach((line, index) => {
      // Skip empty line at end
      if (index === lines.length - 1 && line === '') return;
      result += `${prefix} ${line}\n`;
    });
  });

  return result;
}

/**
 * Apply a diff/edit to file content
 *
 * @param {string} currentContent - Current file content
 * @param {string} oldContent - Content to find and replace
 * @param {string} newContent - New content to insert
 * @returns {string} Updated file content
 * @throws {Error} If oldContent not found in file
 */
function applyEdit(currentContent, oldContent, newContent) {
  if (!currentContent.includes(oldContent)) {
    throw new Error(
      'Old content not found in file. The file may have been modified since the edit was proposed.'
    );
  }

  // Replace first occurrence
  return currentContent.replace(oldContent, newContent);
}

/**
 * Format diff for side-by-side display
 *
 * @param {string} oldContent - Original content
 * @param {string} newContent - New content
 * @returns {object} Object with left and right arrays of line objects
 */
function formatSideBySideDiff(oldContent, newContent) {
  const changes = diff.diffLines(oldContent, newContent);

  const left = [];
  const right = [];

  let leftLineNum = 1;
  let rightLineNum = 1;

  changes.forEach((part) => {
    const lines = part.value.split('\n').filter((line, idx, arr) => {
      // Keep all lines except the last one if it's empty
      return idx < arr.length - 1 || line !== '';
    });

    if (part.added) {
      // Added lines - show only on right
      lines.forEach((line) => {
        left.push({ lineNum: null, content: '', type: 'empty' });
        right.push({ lineNum: rightLineNum++, content: line, type: 'added' });
      });
    } else if (part.removed) {
      // Removed lines - show only on left
      lines.forEach((line) => {
        left.push({ lineNum: leftLineNum++, content: line, type: 'removed' });
        right.push({ lineNum: null, content: '', type: 'empty' });
      });
    } else {
      // Unchanged lines - show on both sides
      lines.forEach((line) => {
        left.push({ lineNum: leftLineNum++, content: line, type: 'unchanged' });
        right.push({
          lineNum: rightLineNum++,
          content: line,
          type: 'unchanged',
        });
      });
    }
  });

  return { left, right };
}

/**
 * Get context lines around a change
 *
 * @param {string} content - File content
 * @param {number} targetLine - Line number of change
 * @param {number} contextLines - Number of context lines before/after
 * @returns {object} Object with lines array and start line number
 */
function getContextLines(content, targetLine, contextLines = 3) {
  const lines = content.split('\n');

  const startLine = Math.max(0, targetLine - contextLines);
  const endLine = Math.min(lines.length, targetLine + contextLines + 1);

  return {
    lines: lines.slice(startLine, endLine),
    startLineNum: startLine + 1,
    endLineNum: endLine,
  };
}

/**
 * Validate that old_content exists in current file
 *
 * @param {string} currentContent - Current file content
 * @param {string} oldContent - Content that should exist
 * @returns {boolean} True if old content exists
 */
function validateOldContent(currentContent, oldContent) {
  return currentContent.includes(oldContent);
}

/**
 * Find line number where content appears
 *
 * @param {string} fileContent - Full file content
 * @param {string} searchContent - Content to find
 * @returns {number} Line number (1-indexed), or -1 if not found
 */
function findLineNumber(fileContent, searchContent) {
  const lines = fileContent.split('\n');
  const searchLines = searchContent.split('\n');

  for (let i = 0; i <= lines.length - searchLines.length; i++) {
    let match = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (lines[i + j] !== searchLines[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i + 1; // 1-indexed
    }
  }

  return -1;
}

module.exports = {
  calculateDiff,
  formatDiff,
  applyEdit,
  formatSideBySideDiff,
  getContextLines,
  validateOldContent,
  findLineNumber,
};
