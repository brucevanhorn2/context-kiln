import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_SETTINGS } from '../utils/constants';

/**
 * SettingsContext - Manage application settings
 *
 * Responsibilities:
 * - Load settings from database on mount
 * - Update settings
 * - Persist settings to database
 * - Provide settings to all components
 *
 * Settings include:
 * - AI provider configuration
 * - Editor preferences
 * - Layout preferences
 * - Token management settings
 * - UI preferences
 *
 * Uses DatabaseService via IPC (window.electron.getSettings, window.electron.setSetting)
 */

const SettingsContext = createContext(null);

/**
 * Hook to access SettingsContext
 * @returns {object} Context value
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  // State - initialize with defaults
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load settings from database on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all settings from database
        const dbSettings = await window.electron.getSettings();

        // Merge with defaults (in case new settings were added)
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...dbSettings,
        };

        setSettings(mergedSettings);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings');
        // Use defaults on error
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  /**
   * Get a single setting value
   *
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Setting value
   */
  const getSetting = useCallback(
    (key, defaultValue = null) => {
      return settings[key] !== undefined ? settings[key] : defaultValue;
    },
    [settings]
  );

  /**
   * Update a single setting
   *
   * @param {string} key - Setting key
   * @param {*} value - New value
   */
  const setSetting = useCallback(async (key, value) => {
    try {
      setError(null);

      // Update in database
      await window.electron.setSetting(key, value);

      // Update local state
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
      setError(`Failed to update setting: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Update multiple settings at once
   *
   * @param {object} newSettings - Object of key-value pairs to update
   */
  const updateSettings = useCallback(async (newSettings) => {
    try {
      setError(null);

      // Update each setting in database
      for (const [key, value] of Object.entries(newSettings)) {
        await window.electron.setSetting(key, value);
      }

      // Update local state
      setSettings((prev) => ({
        ...prev,
        ...newSettings,
      }));
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(`Failed to update settings: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetSettings = useCallback(async () => {
    try {
      setError(null);

      // Update each default setting in database
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await window.electron.setSetting(key, value);
      }

      // Update local state
      setSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError(`Failed to reset settings: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Reset a single setting to default
   *
   * @param {string} key - Setting key
   */
  const resetSetting = useCallback(
    async (key) => {
      const defaultValue = DEFAULT_SETTINGS[key];

      if (defaultValue === undefined) {
        console.warn(`No default value for setting: ${key}`);
        return;
      }

      await setSetting(key, defaultValue);
    },
    [setSetting]
  );

  // Context value
  const value = {
    // State
    settings,
    isLoading,
    error,

    // Queries
    getSetting,

    // Actions
    setSetting,
    updateSettings,
    resetSettings,
    resetSetting,

    // Convenience getters for common settings
    activeProvider: settings.activeProvider,
    defaultModel: settings.defaultModel,
    layoutPreset: settings.layoutPreset,
    maxContextTokens: settings.maxContextTokens,
    autoArchiveThreshold: settings.autoArchiveThreshold,
    editorFontSize: settings.editorFontSize,
    editorTheme: settings.editorTheme,
    editorTabSize: settings.editorTabSize,
    editorWordWrap: settings.editorWordWrap,
    includeLineNumbers: settings.includeLineNumbers,
    includeMetadata: settings.includeMetadata,
    contextFormat: settings.contextFormat,
    showTokenWarnings: settings.showTokenWarnings,
    createDefaultSession: settings.createDefaultSession,
    defaultSessionName: settings.defaultSessionName,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
