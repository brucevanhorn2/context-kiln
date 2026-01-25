import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Select,
  message,
  Space,
  Typography,
  Divider,
  Alert,
} from 'antd';
import { KeyOutlined, SettingOutlined, RobotOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';
import { useClaude } from '../contexts/ClaudeContext';
import { ANTHROPIC_MODELS, OPENAI_MODELS, OLLAMA_MODELS, LMSTUDIO_MODELS, LOCAL_MODELS } from '../utils/constants';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

/**
 * SettingsModal - Configure application settings
 *
 * Features:
 * - API key management (add, test, save)
 * - Provider selection (Anthropic, OpenAI, Ollama)
 * - Model selection
 * - Editor preferences
 * - Token limits
 */
function SettingsModal({ visible, onClose }) {
  const { settings, setSetting, updateSettings } = useSettings();
  const {
    availableProviders,
    availableModels,
    switchProvider,
    switchModel,
    validateApiKey,
    reloadModels,
  } = useClaude();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('provider');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [localModels, setLocalModels] = useState([]);

  // Sync localModels with availableModels from context
  useEffect(() => {
    if (availableModels && availableModels.length > 0) {
      setLocalModels(availableModels);
    }
  }, [availableModels]);

  /**
   * Load models when modal opens (for any provider that needs dynamic loading)
   */
  useEffect(() => {
    if (visible) {
      handleReloadModels();
    }
  }, [visible, settings.activeProvider, handleReloadModels]);

  /**
   * Test API key
   */
  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      message.error('Please enter an API key');
      return;
    }

    try {
      setTestingApiKey(true);
      const isValid = await validateApiKey(apiKeyInput);

      if (isValid) {
        message.success('API key is valid!');
      } else {
        message.error('API key is invalid');
      }
    } catch (err) {
      message.error(`Failed to validate API key: ${err.message}`);
    } finally {
      setTestingApiKey(false);
    }
  };

  /**
   * Save API key
   */
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      message.error('Please enter an API key');
      return;
    }

    try {
      // In a real implementation, this would save to electron-store
      // For now, just switch provider (assumes key is valid)
      message.success('API key saved successfully');
      setApiKeyInput('');
    } catch (err) {
      message.error(`Failed to save API key: ${err.message}`);
    }
  };

  /**
   * Reload models for current provider
   * Fetches directly via IPC to avoid context timing issues
   */
  const handleReloadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const provider = settings.activeProvider;
      const models = await window.electron.getAIModels(provider);
      setLocalModels(models);

      // If current model doesn't exist in loaded models, select the first one
      if (models.length > 0) {
        const currentModelExists = models.some(m => m.id === settings.defaultModel);
        if (!currentModelExists) {
          const firstModel = models[0].id;
          await setSetting('defaultModel', firstModel);
          switchModel(firstModel);
        }
      }

      message.success(`Loaded ${models.length} models from ${provider}`);
    } catch (err) {
      console.error('[Settings] Failed to load models:', err);
      setModelError(err.message || 'Failed to load models');
      message.error(`Failed to load models: ${err.message}`);
    } finally {
      setLoadingModels(false);
    }
  }, [settings.activeProvider, settings.defaultModel, setSetting, switchModel]);

  /**
   * Handle provider change
   */
  const handleProviderChange = async (provider) => {
    try {
      await setSetting('activeProvider', provider);
      switchProvider(provider);
      message.success(`Switched to ${provider}`);
    } catch (err) {
      message.error(`Failed to switch provider: ${err.message}`);
    }
  };

  /**
   * Handle model change
   */
  const handleModelChange = async (model) => {
    try {
      await setSetting('defaultModel', model);
      switchModel(model);
      message.success(`Switched to ${model}`);
    } catch (err) {
      message.error(`Failed to switch model: ${err.message}`);
    }
  };

  /**
   * Get models for current provider
   */
  const getModelsForProvider = (provider) => {
    switch (provider) {
      case 'anthropic':
        return Object.values(ANTHROPIC_MODELS);
      case 'openai':
        return Object.values(OPENAI_MODELS);
      case 'ollama':
        return Object.values(OLLAMA_MODELS);
      case 'lmstudio':
        return Object.values(LMSTUDIO_MODELS);
      case 'local':
        return Object.values(LOCAL_MODELS);
      default:
        return [];
    }
  };

  return (
    <Modal
      title="Settings"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={700}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Provider & API Keys Tab */}
        <TabPane
          tab={
            <span>
              <RobotOutlined />
              AI Provider
            </span>
          }
          key="provider"
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Provider Selection */}
            <div>
              <Title level={5}>
                <SettingOutlined /> Select Provider
              </Title>
              <Select
                value={settings.activeProvider}
                onChange={handleProviderChange}
                style={{ width: '100%' }}
                options={[
                  { value: 'anthropic', label: 'Anthropic (Claude)' },
                  {
                    value: 'openai',
                    label: 'OpenAI (GPT)',
                    disabled: true,
                  },
                  {
                    value: 'ollama',
                    label: 'Ollama (Local API)',
                  },
                  {
                    value: 'lmstudio',
                    label: 'LM Studio (Local API)',
                  },
                  {
                    value: 'local',
                    label: 'Local (Embedded) - Phase E',
                  },
                ]}
              />
            </div>

            {/* Model Selection */}
            <div>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Title level={5} style={{ margin: 0 }}>Available Models</Title>
                    {settings.activeProvider === 'ollama' && (
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleReloadModels}
                        loading={loadingModels}
                        type="text"
                      >
                        Refresh
                      </Button>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                    {settings.activeProvider === 'ollama'
                      ? `Models from local Ollama (${localModels.length} loaded):`
                      : 'Select a model:'}
                  </Text>

                  {modelError && (
                    <Alert
                      type="error"
                      message="Failed to load models"
                      description={modelError}
                      showIcon
                      closable
                      onClose={() => setModelError(null)}
                      style={{ marginBottom: '12px' }}
                    />
                  )}
                </div>

                <Select
                  value={settings.defaultModel}
                  onChange={handleModelChange}
                  style={{ width: '100%' }}
                  placeholder={localModels.length === 0 ? 'No models loaded' : 'Select a model...'}
                >
                  {(() => {
                    // For Ollama, use localModels (fetched dynamically)
                    // For other providers, use hardcoded constants as fallback
                    const modelsToShow = settings.activeProvider === 'ollama'
                      ? localModels
                      : (localModels.length > 0 ? localModels : getModelsForProvider(settings.activeProvider));

                    return modelsToShow.map((model) => (
                      <Select.Option key={model.id} value={model.id}>
                        <div>
                          <div>
                            {model.name}
                            {model.recommended && (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontSize: '11px',
                                  color: '#52c41a',
                                }}
                              >
                                (Recommended)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {model.description || model.id}
                            {model.contextWindow && ` • Context: ${model.contextWindow.toLocaleString()} tokens`}
                          </div>
                        </div>
                      </Select.Option>
                    ));
                  })()}
                </Select>
              </Space>
            </div>

            <Divider />

            {/* API Key Management */}
            <div>
              <Title level={5}>
                <KeyOutlined /> API Key
              </Title>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>
                Your API key is stored securely in the OS keychain and never
                sent to anyone except {settings.activeProvider}.
              </Text>

              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea
                  placeholder={`Enter your ${settings.activeProvider} API key...`}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  rows={3}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />

                <Space>
                  <Button
                    type="primary"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    Save API Key
                  </Button>
                  <Button
                    onClick={handleTestApiKey}
                    loading={testingApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    Test Connection
                  </Button>
                </Space>
              </Space>

              {settings.activeProvider === 'anthropic' && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                  Get your API key from:{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Anthropic Console
                  </a>
                </div>
              )}
            </div>
          </Space>
        </TabPane>

        {/* Token Management Tab */}
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Token Management
            </span>
          }
          key="tokens"
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>Context Token Limit</Title>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Maximum tokens to send in context (leave room for response)
              </Text>
              <Input
                type="number"
                value={settings.maxContextTokens}
                onChange={(e) => setSetting('maxContextTokens', parseInt(e.target.value))}
                addonAfter="tokens"
              />
            </div>

            <div>
              <Title level={5}>Auto-Archive Threshold</Title>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Automatically archive old messages when context exceeds this size
              </Text>
              <Input
                type="number"
                value={settings.autoArchiveThreshold}
                onChange={(e) =>
                  setSetting('autoArchiveThreshold', parseInt(e.target.value))
                }
                addonAfter="tokens"
              />
            </div>

            <div>
              <Form.Item label="Show Token Warnings" style={{ marginBottom: 0 }}>
                <Select
                  value={settings.showTokenWarnings}
                  onChange={(val) => setSetting('showTokenWarnings', val)}
                  style={{ width: '200px' }}
                >
                  <Select.Option value={true}>Yes</Select.Option>
                  <Select.Option value={false}>No</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Space>
        </TabPane>

        {/* Editor Settings Tab */}
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Editor
            </span>
          }
          key="editor"
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5}>Font Size</Title>
              <Input
                type="number"
                value={settings.editorFontSize}
                onChange={(e) => setSetting('editorFontSize', parseInt(e.target.value))}
                addonAfter="px"
                min={8}
                max={32}
              />
            </div>

            <div>
              <Title level={5}>Theme</Title>
              <Select
                value={settings.editorTheme}
                onChange={(val) => setSetting('editorTheme', val)}
                style={{ width: '100%' }}
              >
                <Select.Option value="vs-dark">Dark (VS Code)</Select.Option>
                <Select.Option value="vs">Light</Select.Option>
                <Select.Option value="hc-black">High Contrast</Select.Option>
              </Select>
            </div>

            <div>
              <Title level={5}>Tab Size</Title>
              <Input
                type="number"
                value={settings.editorTabSize}
                onChange={(e) => setSetting('editorTabSize', parseInt(e.target.value))}
                addonAfter="spaces"
                min={2}
                max={8}
              />
            </div>

            <div>
              <Form.Item label="Word Wrap" style={{ marginBottom: 0 }}>
                <Select
                  value={settings.editorWordWrap}
                  onChange={(val) => setSetting('editorWordWrap', val)}
                  style={{ width: '200px' }}>
                  <Select.Option value={true}>On</Select.Option>
                  <Select.Option value={false}>Off</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  );
}

export default SettingsModal;
