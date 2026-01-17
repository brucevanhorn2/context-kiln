import React, { createContext, useContext, useState, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('EditorContext');

/**
 * EditorContext - Manage open files and editor state
 *
 * Responsibilities:
 * - Track open files (tabs)
 * - Track active file
 * - Track dirty (unsaved) state
 * - File operations (open, close, save)
 * - Editor settings (font size, theme, etc.)
 *
 * Uses FileService via IPC (window.electron.readFile, window.electron.saveFile)
 */

const EditorContext = createContext(null);

/**
 * Hook to access EditorContext
 * @returns {object} Context value
 */
export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};

/**
 * OpenFile format:
 * {
 *   path: string,
 *   content: string,
 *   language: string,
 *   isDirty: boolean,
 *   originalContent: string (for dirty detection),
 *   metadata: {
 *     lines: number,
 *     fileSize: number,
 *     lastModified: string
 *   }
 * }
 */

export const EditorProvider = ({ children }) => {
  // State
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Editor settings (could be moved to SettingsContext later)
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    theme: 'vs-dark',
    tabSize: 2,
    wordWrap: true,
    minimap: { enabled: true },
    lineNumbers: 'on',
  });

  /**
   * Get active file object
   * @returns {object|null} Active file or null
   */
  const getActiveFile = useCallback(() => {
    if (!activeFilePath) return null;
    return openFiles.find((f) => f.path === activeFilePath) || null;
  }, [openFiles, activeFilePath]);

  /**
   * Check if file is already open
   * @param {string} filePath - File path
   * @returns {boolean} True if open
   */
  const isFileOpen = useCallback(
    (filePath) => {
      return openFiles.some((f) => f.path === filePath);
    },
    [openFiles]
  );

  /**
   * Open file
   *
   * @param {string} filePath - Absolute path to file
   * @param {boolean} setActive - Set as active file (default: true)
   */
  const openFile = useCallback(
    async (filePath, setActive = true) => {
      log.info('openFile called', { filePath });
      try {
        setError(null);

        // If already open, just activate it
        if (isFileOpen(filePath)) {
          log.debug('File already open, activating', { filePath });
          if (setActive) {
            setActiveFilePath(filePath);
          }
          return;
        }

        setIsLoading(true);
        log.debug('Loading file via IPC...');

        // Read file via IPC
        const fileData = await window.electron.getFileMetadata(filePath);
        log.info('File loaded', { path: fileData?.path, language: fileData?.language });

        // Add to open files
        const newFile = {
          path: fileData.path,
          content: fileData.content,
          language: fileData.language,
          isDirty: false,
          originalContent: fileData.content,
          metadata: fileData.metadata,
        };

        setOpenFiles((prev) => [...prev, newFile]);

        // Set as active
        if (setActive) {
          setActiveFilePath(filePath);
        }

        setIsLoading(false);
      } catch (err) {
        log.error('Failed to open file', { error: err.message, filePath });
        setError(`Failed to open file: ${err.message}`);
        setIsLoading(false);
      }
    },
    [isFileOpen]
  );

  /**
   * Close file
   *
   * @param {string} filePath - Path of file to close
   * @param {boolean} force - Force close even if dirty
   * @returns {Promise<boolean>} True if closed, false if cancelled
   */
  const closeFile = useCallback(
    async (filePath, force = false) => {
      const file = openFiles.find((f) => f.path === filePath);

      if (!file) return true;

      // Check if dirty
      if (file.isDirty && !force) {
        // TODO: Show confirmation dialog
        // For now, just warn
        log.warn('File has unsaved changes', { filePath });
        return false;
      }

      // Remove from open files
      setOpenFiles((prev) => prev.filter((f) => f.path !== filePath));

      // If closing active file, switch to another
      if (activeFilePath === filePath) {
        const remainingFiles = openFiles.filter((f) => f.path !== filePath);
        if (remainingFiles.length > 0) {
          setActiveFilePath(remainingFiles[remainingFiles.length - 1].path);
        } else {
          setActiveFilePath(null);
        }
      }

      return true;
    },
    [openFiles, activeFilePath]
  );

  /**
   * Close all files
   *
   * @param {boolean} force - Force close even if dirty
   * @returns {Promise<boolean>} True if all closed
   */
  const closeAllFiles = useCallback(
    async (force = false) => {
      // Check for dirty files
      const dirtyFiles = openFiles.filter((f) => f.isDirty);

      if (dirtyFiles.length > 0 && !force) {
        // TODO: Show confirmation dialog
        log.warn('Files have unsaved changes', { count: dirtyFiles.length });
        return false;
      }

      setOpenFiles([]);
      setActiveFilePath(null);
      return true;
    },
    [openFiles]
  );

  /**
   * Update file content (marks as dirty)
   *
   * @param {string} filePath - Path of file
   * @param {string} newContent - New content
   */
  const updateFileContent = useCallback((filePath, newContent) => {
    setOpenFiles((prev) =>
      prev.map((file) => {
        if (file.path === filePath) {
          return {
            ...file,
            content: newContent,
            isDirty: newContent !== file.originalContent,
          };
        }
        return file;
      })
    );
  }, []);

  /**
   * Save file
   *
   * @param {string} filePath - Path of file to save
   * @returns {Promise<boolean>} True if saved successfully
   */
  const saveFile = useCallback(
    async (filePath) => {
      try {
        setError(null);

        const file = openFiles.find((f) => f.path === filePath);

        if (!file) {
          throw new Error('File not found in open files');
        }

        if (!file.isDirty) {
          // Nothing to save
          return true;
        }

        setIsLoading(true);

        // Save via IPC
        await window.electron.saveFile(filePath, file.content);

        // Update file state (no longer dirty)
        setOpenFiles((prev) =>
          prev.map((f) => {
            if (f.path === filePath) {
              return {
                ...f,
                isDirty: false,
                originalContent: f.content,
                metadata: {
                  ...f.metadata,
                  lastModified: new Date().toISOString(),
                },
              };
            }
            return f;
          })
        );

        setIsLoading(false);
        return true;
      } catch (err) {
        log.error('Failed to save file', { error: err.message, filePath });
        setError(`Failed to save file: ${err.message}`);
        setIsLoading(false);
        return false;
      }
    },
    [openFiles]
  );

  /**
   * Save active file
   *
   * @returns {Promise<boolean>} True if saved successfully
   */
  const saveActiveFile = useCallback(async () => {
    if (!activeFilePath) return false;
    return saveFile(activeFilePath);
  }, [activeFilePath, saveFile]);

  /**
   * Save all files
   *
   * @returns {Promise<boolean>} True if all saved successfully
   */
  const saveAllFiles = useCallback(async () => {
    const dirtyFiles = openFiles.filter((f) => f.isDirty);

    try {
      for (const file of dirtyFiles) {
        await saveFile(file.path);
      }
      return true;
    } catch (err) {
      log.error('Failed to save all files', { error: err.message });
      return false;
    }
  }, [openFiles, saveFile]);

  /**
   * Revert file to original content
   *
   * @param {string} filePath - Path of file to revert
   */
  const revertFile = useCallback((filePath) => {
    setOpenFiles((prev) =>
      prev.map((file) => {
        if (file.path === filePath) {
          return {
            ...file,
            content: file.originalContent,
            isDirty: false,
          };
        }
        return file;
      })
    );
  }, []);

  /**
   * Get dirty files
   *
   * @returns {Array<object>} Array of dirty files
   */
  const getDirtyFiles = useCallback(() => {
    return openFiles.filter((f) => f.isDirty);
  }, [openFiles]);

  /**
   * Update editor settings
   *
   * @param {object} newSettings - Settings to update
   */
  const updateEditorSettings = useCallback((newSettings) => {
    setEditorSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  /**
   * Set active file by path
   *
   * @param {string} filePath - Path of file to activate
   */
  const setActiveFile = useCallback(
    (filePath) => {
      if (isFileOpen(filePath)) {
        setActiveFilePath(filePath);
      }
    },
    [isFileOpen]
  );

  // Context value
  const value = {
    // State
    openFiles,
    activeFilePath,
    activeFile: getActiveFile(),
    isLoading,
    error,
    editorSettings,

    // Queries
    isFileOpen,
    getDirtyFiles,

    // Actions
    openFile,
    closeFile,
    closeAllFiles,
    updateFileContent,
    saveFile,
    saveActiveFile,
    saveAllFiles,
    revertFile,
    setActiveFile,
    updateEditorSettings,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};

export default EditorContext;
