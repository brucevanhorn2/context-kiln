import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * UsageTrackingContext - Track token usage and costs
 *
 * Responsibilities:
 * - Query usage statistics from database
 * - Real-time usage updates
 * - Cost calculations
 * - Export usage data
 *
 * Usage Views:
 * - Project usage (all sessions in current project)
 * - Session usage (current session only)
 * - API key usage (per-key totals)
 * - Global usage (all projects, all time)
 *
 * Uses DatabaseService via IPC (window.electron.getUsageStats)
 */

const UsageTrackingContext = createContext(null);

/**
 * Hook to access UsageTrackingContext
 * @returns {object} Context value
 */
export const useUsageTracking = () => {
  const context = useContext(UsageTrackingContext);
  if (!context) {
    throw new Error('useUsageTracking must be used within UsageTrackingProvider');
  }
  return context;
};

/**
 * Usage stats format:
 * {
 *   totalInputTokens: number,
 *   totalOutputTokens: number,
 *   totalCost: number,
 *   requestCount: number,
 *   byModel: {
 *     [modelId]: { inputTokens, outputTokens, cost, count }
 *   },
 *   byProvider: {
 *     [provider]: { inputTokens, outputTokens, cost, count }
 *   }
 * }
 */

export const UsageTrackingProvider = ({ children }) => {
  // State
  const [projectUsage, setProjectUsage] = useState(null);
  const [sessionUsage, setSessionUsage] = useState(null);
  const [apiKeyUsage, setApiKeyUsage] = useState(null);
  const [globalUsage, setGlobalUsage] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'day', 'week', 'month', 'all'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Current context (set by parent components)
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentApiKeyId, setCurrentApiKeyId] = useState(null);

  /**
   * Refresh project usage
   */
  const refreshProjectUsage = useCallback(async () => {
    if (!currentProjectId) {
      setProjectUsage(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const usage = await window.electron.getUsageStats('project', {
        projectId: currentProjectId,
        timeRange,
      });

      setProjectUsage(usage);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh project usage:', err);
      setError('Failed to load project usage');
      setIsLoading(false);
    }
  }, [currentProjectId, timeRange]);

  /**
   * Refresh session usage
   */
  const refreshSessionUsage = useCallback(async () => {
    if (!currentSessionId) {
      setSessionUsage(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const usage = await window.electron.getUsageStats('session', {
        sessionId: currentSessionId,
      });

      setSessionUsage(usage);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh session usage:', err);
      setError('Failed to load session usage');
      setIsLoading(false);
    }
  }, [currentSessionId]);

  /**
   * Refresh API key usage
   */
  const refreshApiKeyUsage = useCallback(async () => {
    if (!currentApiKeyId) {
      setApiKeyUsage(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const usage = await window.electron.getUsageStats('api-key', {
        apiKeyId: currentApiKeyId,
        timeRange,
      });

      setApiKeyUsage(usage);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh API key usage:', err);
      setError('Failed to load API key usage');
      setIsLoading(false);
    }
  }, [currentApiKeyId, timeRange]);

  /**
   * Refresh global usage
   */
  const refreshGlobalUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const usage = await window.electron.getUsageStats('global', {
        timeRange,
      });

      setGlobalUsage(usage);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh global usage:', err);
      setError('Failed to load global usage');
      setIsLoading(false);
    }
  }, [timeRange]);

  /**
   * Refresh all usage stats
   */
  const refreshAllUsage = useCallback(async () => {
    await Promise.all([
      refreshProjectUsage(),
      refreshSessionUsage(),
      refreshApiKeyUsage(),
      refreshGlobalUsage(),
    ]);
  }, [
    refreshProjectUsage,
    refreshSessionUsage,
    refreshApiKeyUsage,
    refreshGlobalUsage,
  ]);

  /**
   * Auto-refresh when context changes
   */
  useEffect(() => {
    refreshProjectUsage();
  }, [refreshProjectUsage]);

  useEffect(() => {
    refreshSessionUsage();
  }, [refreshSessionUsage]);

  useEffect(() => {
    refreshApiKeyUsage();
  }, [refreshApiKeyUsage]);

  useEffect(() => {
    refreshGlobalUsage();
  }, [refreshGlobalUsage]);

  /**
   * Set time range and refresh
   *
   * @param {string} range - Time range ('day', 'week', 'month', 'all')
   */
  const setTimeRangeAndRefresh = useCallback(
    async (range) => {
      setTimeRange(range);
      // Refresh will happen automatically via useEffect
    },
    []
  );

  /**
   * Export usage data
   *
   * @param {string} type - Type of usage ('project', 'session', 'api-key', 'global')
   * @param {string} format - Export format ('csv', 'json')
   * @returns {Promise<string>} Exported data as string
   */
  const exportUsage = useCallback(
    async (type, format = 'json') => {
      let data = null;

      switch (type) {
        case 'project':
          data = projectUsage;
          break;
        case 'session':
          data = sessionUsage;
          break;
        case 'api-key':
          data = apiKeyUsage;
          break;
        case 'global':
          data = globalUsage;
          break;
        default:
          throw new Error(`Unknown usage type: ${type}`);
      }

      if (!data) {
        throw new Error('No data to export');
      }

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        // TODO: Implement CSV export
        throw new Error('CSV export not yet implemented');
      } else {
        throw new Error(`Unknown export format: ${format}`);
      }
    },
    [projectUsage, sessionUsage, apiKeyUsage, globalUsage]
  );

  /**
   * Get total tokens used
   *
   * @param {string} type - Type of usage
   * @returns {number} Total tokens
   */
  const getTotalTokens = useCallback(
    (type) => {
      let usage = null;

      switch (type) {
        case 'project':
          usage = projectUsage;
          break;
        case 'session':
          usage = sessionUsage;
          break;
        case 'api-key':
          usage = apiKeyUsage;
          break;
        case 'global':
          usage = globalUsage;
          break;
        default:
          return 0;
      }

      if (!usage) return 0;

      return usage.totalInputTokens + usage.totalOutputTokens;
    },
    [projectUsage, sessionUsage, apiKeyUsage, globalUsage]
  );

  /**
   * Get total cost
   *
   * @param {string} type - Type of usage
   * @returns {number} Total cost in USD
   */
  const getTotalCost = useCallback(
    (type) => {
      let usage = null;

      switch (type) {
        case 'project':
          usage = projectUsage;
          break;
        case 'session':
          usage = sessionUsage;
          break;
        case 'api-key':
          usage = apiKeyUsage;
          break;
        case 'global':
          usage = globalUsage;
          break;
        default:
          return 0;
      }

      if (!usage) return 0;

      return usage.totalCost || 0;
    },
    [projectUsage, sessionUsage, apiKeyUsage, globalUsage]
  );

  /**
   * Get request count
   *
   * @param {string} type - Type of usage
   * @returns {number} Request count
   */
  const getRequestCount = useCallback(
    (type) => {
      let usage = null;

      switch (type) {
        case 'project':
          usage = projectUsage;
          break;
        case 'session':
          usage = sessionUsage;
          break;
        case 'api-key':
          usage = apiKeyUsage;
          break;
        case 'global':
          usage = globalUsage;
          break;
        default:
          return 0;
      }

      if (!usage) return 0;

      return usage.requestCount || 0;
    },
    [projectUsage, sessionUsage, apiKeyUsage, globalUsage]
  );

  // Context value
  const value = {
    // State
    projectUsage,
    sessionUsage,
    apiKeyUsage,
    globalUsage,
    timeRange,
    isLoading,
    error,

    // Current context
    currentProjectId,
    currentSessionId,
    currentApiKeyId,
    setCurrentProjectId,
    setCurrentSessionId,
    setCurrentApiKeyId,

    // Actions
    refreshProjectUsage,
    refreshSessionUsage,
    refreshApiKeyUsage,
    refreshGlobalUsage,
    refreshAllUsage,
    setTimeRangeAndRefresh,
    exportUsage,

    // Convenience methods
    getTotalTokens,
    getTotalCost,
    getRequestCount,
  };

  return (
    <UsageTrackingContext.Provider value={value}>
      {children}
    </UsageTrackingContext.Provider>
  );
};

export default UsageTrackingContext;
