import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Splitter, Button, Select, Alert } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined, LayoutOutlined, CloseOutlined } from '@ant-design/icons';
import FileTree from './FileTree';
import CenterPanel from './components/CenterPanel';
import ContextTools from './ContextTools';
import SettingsModal from './components/SettingsModal';
import SessionSelector from './components/SessionSelector';
import { LAYOUT_PRESETS } from './utils/constants';
import './Layout.css';

// Import context providers
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { EditorProvider, useEditor } from './contexts/EditorContext';
import { UsageTrackingProvider } from './contexts/UsageTrackingContext';
import { ClaudeProvider } from './contexts/ClaudeContext';

const { Header, Content } = AntLayout;

// Inner component that can use EditorContext
function LayoutInner() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [treeData, setTreeData] = useState(null);
  const [openFolderPath, setOpenFolderPath] = useState(null);
  const [contextFiles, setContextFiles] = useState([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentLayout, setCurrentLayout] = useState('default');
  const [error, setError] = useState(null);

  // Access contexts
  const { openFile } = useEditor();
  const { currentSession } = useSession();
  const { getSetting, setSetting } = useSettings();

  const handleAddContextFile = (filePath, isDirectory) => {
    // Calculate relative path from the opened folder
    const relativePath = filePath.replace(openFolderPath + '\\', '').replace(openFolderPath + '/', '');

    // Check if file already exists
    const exists = contextFiles.some(f => f.path === filePath);
    if (exists) return;

    setContextFiles([
      ...contextFiles,
      {
        id: filePath,
        path: filePath,
        relativePath,
        isDirectory,
        filename: relativePath.split(/[\/\\]/).pop(),
      },
    ]);
  };

  const handleRemoveContextFile = (fileId) => {
    setContextFiles(contextFiles.filter(f => f.id !== fileId));
  };

  // Get current layout configuration
  const layoutConfig = LAYOUT_PRESETS[currentLayout] || LAYOUT_PRESETS.default;

  /**
   * Load saved layout preference on mount
   */
  useEffect(() => {
    const savedLayout = getSetting('layoutPreset', 'default');
    setCurrentLayout(savedLayout);
  }, [getSetting]);

  /**
   * Save layout preference when it changes
   */
  useEffect(() => {
    if (currentLayout !== 'default') {
      setSetting('layoutPreset', currentLayout);
    }
  }, [currentLayout, setSetting]);

  useEffect(() => {
    // Listen for folder open events from Electron main process
    if (window.electron) {
      window.electron.onFolderOpened(async (data) => {
        try {
          setError(null);
          setTreeData(data.data);
          setOpenFolderPath(data.path);
          // Clear context files when a new folder is opened
          setContextFiles([]);

          // Get or create project in database
          const project = await window.electron.getOrCreateProject(data.path);
          setCurrentProjectId(project.id);
        } catch (err) {
          console.error('Failed to open folder:', err);
          setError(`Failed to open project: ${err.message || 'Unknown error'}`);
          setTreeData(null);
          setOpenFolderPath(null);
          setCurrentProjectId(null);
        }
      });

      // Listen for settings menu command (Ctrl+,)
      window.electron.onOpenSettings(() => {
        setSettingsModalVisible(true);
      });
    }
  }, []);

  return (
    <SettingsProvider>
      <SessionProvider>
        <EditorProvider>
          <UsageTrackingProvider>
            <ClaudeProvider>
              <AntLayout style={{ height: '100vh' }}>
                <Header
                  style={{
                    background: '#1f1f1f',
                    color: '#fff',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #333',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Context Kiln</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <SessionSelector
                      projectPath={openFolderPath}
                      projectId={currentProjectId}
                    />
                    <Select
                      value={currentLayout}
                      onChange={setCurrentLayout}
                      size="small"
                      style={{ width: '180px' }}
                      suffixIcon={<LayoutOutlined />}
                    >
                      {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                        <Select.Option key={key} value={key}>
                          {preset.name}
                        </Select.Option>
                      ))}
                    </Select>
                    <Button
                      type="default"
                      icon={<SettingOutlined />}
                      onClick={() => setSettingsModalVisible(true)}
                      size="small"
                    >
                      Settings
                    </Button>
                  </div>
                </Header>

                {/* Error Banner */}
                {error && (
                  <Alert
                    message="Error"
                    description={error}
                    type="error"
                    closable
                    onClose={() => setError(null)}
                    style={{
                      margin: '8px',
                      borderRadius: '4px',
                    }}
                    showIcon
                  />
                )}

      <Content style={{ flex: 1, overflow: 'hidden' }}>
        <Splitter
          key={currentLayout}
          style={{ height: '100%', width: '100%' }}
          onResizeEnd={() => {}}
        >
          <Splitter.Pane
            defaultSize={leftCollapsed ? '0%' : layoutConfig.panes.fileTree.size}
            resizable={!leftCollapsed}
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px',
                borderRight: '1px solid #333',
                background: '#252526',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>EXPLORER</span>
              <button
                onClick={() => setLeftCollapsed(!leftCollapsed)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {leftCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#1e1e1e' }}>
              <FileTree
                treeData={treeData}
                openFolderPath={openFolderPath}
                onAddContextFile={handleAddContextFile}
                onOpenFile={openFile}
              />
            </div>
          </Splitter.Pane>

          <Splitter.Pane
            defaultSize={layoutConfig.panes.chat.size}
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden', background: '#1e1e1e' }}>
              <CenterPanel />
            </div>
          </Splitter.Pane>

          <Splitter.Pane
            defaultSize={rightCollapsed ? '0%' : layoutConfig.panes.contextTools.size}
            resizable={!rightCollapsed}
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px',
                borderLeft: '1px solid #333',
                background: '#252526',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>CONTEXT TOOLS</span>
              <button
                onClick={() => setRightCollapsed(!rightCollapsed)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {rightCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#1e1e1e' }}>
              <ContextTools
                contextFiles={contextFiles}
                onRemoveContextFile={handleRemoveContextFile}
                onAddContextFile={handleAddContextFile}
                openFolderPath={openFolderPath}
                onOpenFile={openFile}
                projectId={currentProjectId}
                sessionId={currentSession?.uuid}
              />
            </div>
          </Splitter.Pane>
        </Splitter>
      </Content>
              </AntLayout>

              {/* Settings Modal */}
              <SettingsModal
                visible={settingsModalVisible}
                onClose={() => setSettingsModalVisible(false)}
              />
            </ClaudeProvider>
          </UsageTrackingProvider>
        </EditorProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}

// Outer Layout component that wraps with providers
function Layout() {
  return (
    <SettingsProvider>
      <SessionProvider>
        <EditorProvider>
          <UsageTrackingProvider>
            <ClaudeProvider>
              <LayoutInner />
            </ClaudeProvider>
          </UsageTrackingProvider>
        </EditorProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}

export default Layout;
