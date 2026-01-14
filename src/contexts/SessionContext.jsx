import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * SessionContext - Manage sessions for current project
 *
 * Responsibilities:
 * - Track current session
 * - List all sessions for project
 * - Create new sessions
 * - Load/switch sessions
 * - Rename sessions
 * - Archive sessions
 *
 * Session Structure:
 * <project>/.context-kiln/sessions/<session-name>/
 * ├── session.json
 * ├── context.md
 * ├── decisions.md
 * ├── README.md
 * ├── conversation-history/
 * └── artifacts/
 *
 * Uses SessionService via IPC (window.electron.createSession, etc.)
 */

const SessionContext = createContext(null);

/**
 * Hook to access SessionContext
 * @returns {object} Context value
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

/**
 * Session format:
 * {
 *   uuid: string,
 *   name: string,
 *   folderName: string,
 *   folderPath: string,
 *   projectId: number,
 *   createdAt: string,
 *   lastAccessed: string,
 *   isArchived: boolean
 * }
 */

export const SessionProvider = ({ children }) => {
  // State
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentProjectPath, setCurrentProjectPath] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load sessions for current project
   */
  const loadSessions = useCallback(async () => {
    if (!currentProjectId) {
      setSessions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const projectSessions = await window.electron.listSessions(
        currentProjectId
      );

      setSessions(projectSessions || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions');
      setSessions([]);
      setIsLoading(false);
    }
  }, [currentProjectId]);

  /**
   * Auto-load sessions when project changes
   */
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * Set current project (from parent component)
   *
   * @param {string} projectPath - Absolute path to project folder
   * @param {number} projectId - Project ID from database
   */
  const setProject = useCallback((projectPath, projectId) => {
    setCurrentProjectPath(projectPath);
    setCurrentProjectId(projectId);
    setCurrentSession(null); // Clear session when project changes
  }, []);

  /**
   * Create new session
   *
   * @param {string} sessionName - User-friendly session name
   * @param {boolean} setAsCurrent - Set as current session (default: true)
   * @returns {Promise<object>} Created session
   */
  const createSession = useCallback(
    async (sessionName, setAsCurrent = true) => {
      if (!currentProjectPath || !currentProjectId) {
        throw new Error('No project selected');
      }

      try {
        setIsLoading(true);
        setError(null);

        // Create via IPC
        const newSession = await window.electron.createSession(
          currentProjectPath,
          sessionName,
          currentProjectId
        );

        // Reload sessions list
        await loadSessions();

        // Set as current if requested
        if (setAsCurrent) {
          setCurrentSession(newSession);
        }

        setIsLoading(false);
        return newSession;
      } catch (err) {
        console.error('Failed to create session:', err);
        setError(`Failed to create session: ${err.message}`);
        setIsLoading(false);
        throw err;
      }
    },
    [currentProjectPath, currentProjectId, loadSessions]
  );

  /**
   * Load session by UUID
   *
   * @param {string} uuid - Session UUID
   * @param {boolean} setAsCurrent - Set as current session (default: true)
   * @returns {Promise<object>} Loaded session
   */
  const loadSession = useCallback(
    async (uuid, setAsCurrent = true) => {
      if (!currentProjectPath) {
        throw new Error('No project selected');
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load via IPC
        const session = await window.electron.loadSession(
          uuid,
          currentProjectPath
        );

        // Set as current if requested
        if (setAsCurrent) {
          setCurrentSession(session);
        }

        setIsLoading(false);
        return session;
      } catch (err) {
        console.error('Failed to load session:', err);
        setError(`Failed to load session: ${err.message}`);
        setIsLoading(false);
        throw err;
      }
    },
    [currentProjectPath]
  );

  /**
   * Switch to different session
   *
   * @param {string} uuid - Session UUID to switch to
   */
  const switchSession = useCallback(
    async (uuid) => {
      // If already current, do nothing
      if (currentSession && currentSession.uuid === uuid) {
        return;
      }

      await loadSession(uuid, true);
    },
    [currentSession, loadSession]
  );

  /**
   * Rename session
   *
   * @param {string} uuid - Session UUID
   * @param {string} newName - New session name
   */
  const renameSession = useCallback(
    async (uuid, newName) => {
      if (!currentProjectPath) {
        throw new Error('No project selected');
      }

      try {
        setIsLoading(true);
        setError(null);

        // Rename via IPC
        await window.electron.renameSession(uuid, newName, currentProjectPath);

        // Update current session if it's the one being renamed
        if (currentSession && currentSession.uuid === uuid) {
          setCurrentSession((prev) => ({
            ...prev,
            name: newName,
          }));
        }

        // Reload sessions list
        await loadSessions();

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to rename session:', err);
        setError(`Failed to rename session: ${err.message}`);
        setIsLoading(false);
        throw err;
      }
    },
    [currentProjectPath, currentSession, loadSessions]
  );

  /**
   * Archive session
   *
   * @param {string} uuid - Session UUID
   */
  const archiveSession = useCallback(
    async (uuid) => {
      try {
        setIsLoading(true);
        setError(null);

        // Archive via IPC
        await window.electron.archiveSession(uuid);

        // If archiving current session, clear it
        if (currentSession && currentSession.uuid === uuid) {
          setCurrentSession(null);
        }

        // Reload sessions list
        await loadSessions();

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to archive session:', err);
        setError(`Failed to archive session: ${err.message}`);
        setIsLoading(false);
        throw err;
      }
    },
    [currentSession, loadSessions]
  );

  /**
   * Get active (non-archived) sessions
   *
   * @returns {Array<object>} Active sessions
   */
  const getActiveSessions = useCallback(() => {
    return sessions.filter((s) => !s.isArchived);
  }, [sessions]);

  /**
   * Get archived sessions
   *
   * @returns {Array<object>} Archived sessions
   */
  const getArchivedSessions = useCallback(() => {
    return sessions.filter((s) => s.isArchived);
  }, [sessions]);

  /**
   * Check if a session exists
   *
   * @param {string} uuid - Session UUID
   * @returns {boolean} True if session exists
   */
  const sessionExists = useCallback(
    (uuid) => {
      return sessions.some((s) => s.uuid === uuid);
    },
    [sessions]
  );

  /**
   * Get session by UUID (from loaded sessions)
   *
   * @param {string} uuid - Session UUID
   * @returns {object|null} Session or null
   */
  const getSessionByUuid = useCallback(
    (uuid) => {
      return sessions.find((s) => s.uuid === uuid) || null;
    },
    [sessions]
  );

  /**
   * Check if there's an active session
   *
   * @returns {boolean} True if session is active
   */
  const hasActiveSession = useCallback(() => {
    return currentSession !== null;
  }, [currentSession]);

  /**
   * Create default session if none exists
   * Called when opening a project
   */
  const ensureDefaultSession = useCallback(
    async (defaultSessionName = 'General Development') => {
      if (sessions.length === 0 && currentProjectPath && currentProjectId) {
        try {
          await createSession(defaultSessionName, true);
        } catch (err) {
          console.error('Failed to create default session:', err);
        }
      }
    },
    [sessions, currentProjectPath, currentProjectId, createSession]
  );

  // Context value
  const value = {
    // State
    currentSession,
    sessions,
    currentProjectPath,
    currentProjectId,
    isLoading,
    error,

    // Project management
    setProject,

    // Session lifecycle
    createSession,
    loadSession,
    switchSession,
    renameSession,
    archiveSession,
    loadSessions,

    // Queries
    getActiveSessions,
    getArchivedSessions,
    sessionExists,
    getSessionByUuid,
    hasActiveSession,

    // Utilities
    ensureDefaultSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export default SessionContext;
