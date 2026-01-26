import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Splitter, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons';
import FileTree from './FileTree';
import CenterPanel from './components/CenterPanel';
import ContextTools from './ContextTools';
import SettingsModal from './components/SettingsModal';
import SessionSelector from './components/SessionSelector';
import TokenMeter from './components/TokenMeter';
import './Layout.css';

// Import context providers
import { SettingsProvider } from './contexts/SettingsContext';
import { SessionProvider } from './contexts/SessionContext';
import { EditorProvider, useEditor } from './contexts/EditorContext';
import { UsageTrackingProvider } from './contexts/UsageTrackingContext';
import { ToolProvider } from './contexts/ToolContext';
import { ClaudeProvider, useClaude } from './contexts/ClaudeContext';

const { Header, Content } = AntLayout;

// Inner component that can use EditorContext and ClaudeContext
function LayoutInner() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [treeData, setTreeData] = useState(null);
  const [openFolderPath, setOpenFolderPath] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Access EditorContext
  const { openFile } = useEditor();

  // Access ClaudeContext for context files (so they're actually sent to the AI)
  const { contextFiles, addContextFile, removeContextFile, clearContextFiles } = useClaude();

  const handleAddContextFile = async (filePath, isDirectory) => {
    // Calculate relative path from the opened folder
    const relativePath = filePath.replace(openFolderPath + '\\', '').replace(openFolderPath + '/', '');

    // Read file content if it's not a directory
    let content = '';
    if (!isDirectory && window.electron) {
      try {
        content = await window.electron.readFile(filePath);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }

    // Add to ClaudeContext (which handles deduplication)
    addContextFile({
      id: filePath,
      path: filePath,
      relativePath,
      isDirectory,
      filename: relativePath.split(/[\/\\]/).pop(),
      content, // Include the actual file content!
    });
  };

  const handleRemoveContextFile = (fileId) => {
    removeContextFile(fileId);
  };

  useEffect(() => {
    // Listen for folder open events from Electron main process
    if (window.electron) {
      window.electron.onFolderOpened(async (data) => {
        setTreeData(data.data);
        setOpenFolderPath(data.path);
        // Clear context files when a new folder is opened
        clearContextFiles();

        // Get or create project in database
        try {
          const project = await window.electron.getOrCreateProject(data.path);
          setCurrentProjectId(project.id);
        } catch (err) {
          console.error('Failed to get/create project:', err);
        }
      });

      // Listen for settings menu command (Ctrl+,)
      window.electron.onOpenSettings(() => {
        setSettingsModalVisible(true);
      });
    }
  }, []);

  return (
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

        {/* Token Meter - center of header for visibility */}
        <TokenMeter />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SessionSelector
            projectPath={openFolderPath}
            projectId={currentProjectId}
          />
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

      <Content style={{ flex: 1, overflow: 'hidden' }}>
        <Splitter
          style={{ height: '100%', width: '100%' }}
          onResizeEnd={() => {}}
        >
          <Splitter.Pane
            defaultSize={leftCollapsed ? '0%' : '20%'}
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
            defaultSize="55%"
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
            defaultSize={rightCollapsed ? '0%' : '25%'}
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
              />
            </div>
          </Splitter.Pane>
        </Splitter>
      </Content>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
    </AntLayout>
  );
}

// Outer Layout component that wraps with providers
function Layout() {
  return (
    <SettingsProvider>
      <SessionProvider>
        <EditorProvider>
          <UsageTrackingProvider>
            <ToolProvider>
              <ClaudeProvider>
                <LayoutInner />
              </ClaudeProvider>
            </ToolProvider>
          </UsageTrackingProvider>
        </EditorProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}

export default Layout;
