import React from 'react';
import { Splitter, Tabs, Button, Tooltip, message } from 'antd';
import { FileOutlined, SaveOutlined, SaveFilled } from '@ant-design/icons';
import ChatInterface from '../ChatInterface';
import EditorTab from './EditorTab';
import { useEditor } from '../contexts/EditorContext';

/**
 * CenterPanel - Split view with chat on top and editor tabs on bottom
 *
 * Features:
 * - Chat interface (top pane, always visible)
 * - Editor tabs (bottom pane, shows when files are open)
 * - Resizable split between chat and editor
 * - Dynamic editor tabs for open files
 * - Close button on editor tabs
 * - Dirty indicator (unsaved changes)
 */
function CenterPanel() {
  const {
    openFiles,
    activeFilePath,
    activeFile,
    setActiveFile,
    closeFile,
    saveFile,
    saveAllFiles,
    getDirtyFiles,
  } = useEditor();

  // Get dirty files for Save All button
  const dirtyFiles = getDirtyFiles();

  /**
   * Handle tab change
   */
  const handleTabChange = (key) => {
    setActiveFile(key);
  };

  /**
   * Handle editor tab close
   */
  const handleTabClose = async (targetKey) => {
    await closeFile(targetKey, false);
  };

  /**
   * Handle save current file
   */
  const handleSave = async () => {
    if (!activeFilePath || !activeFile?.isDirty) return;

    const success = await saveFile(activeFilePath);
    if (success) {
      message.success('File saved');
    } else {
      message.error('Failed to save file');
    }
  };

  /**
   * Handle save all files
   */
  const handleSaveAll = async () => {
    if (dirtyFiles.length === 0) return;

    const success = await saveAllFiles();
    if (success) {
      message.success(`Saved ${dirtyFiles.length} file(s)`);
    } else {
      message.error('Failed to save some files');
    }
  };

  /**
   * Build tab items for open files
   */
  const tabItems = openFiles.map((file) => ({
    key: file.path,
    label: (
      <span>
        <FileOutlined style={{ marginRight: 4 }} />
        {file.path.split(/[/\\]/).pop()}
        {file.isDirty && (
          <span style={{ marginLeft: 4, color: '#ff9800' }}>●</span>
        )}
      </span>
    ),
    closable: true,
    children: <EditorTab filePath={file.path} />,
  }));

  const hasOpenFiles = openFiles.length > 0;

  return (
    <Splitter
      layout="vertical"
      style={{ height: '100%', width: '100%' }}
    >
      {/* Chat pane (top) */}
      <Splitter.Pane
        defaultSize="50%"
        min="20%"
        max="80%"
        style={{ overflow: 'hidden' }}
      >
        <ChatInterface />
      </Splitter.Pane>

      {/* Editor pane (bottom) - always rendered, shows empty state when no files */}
      <Splitter.Pane
        defaultSize="50%"
        min="100px"
        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {hasOpenFiles ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Editor Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: '#252526',
                borderBottom: '1px solid #333',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '11px', color: '#888' }}>
                {activeFile ? (
                  <span>
                    {activeFile.path}
                    {activeFile.isDirty && (
                      <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                        (unsaved)
                      </span>
                    )}
                  </span>
                ) : (
                  'No file selected'
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Tooltip title="Save (Ctrl+S)">
                  <Button
                    type="text"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={!activeFile?.isDirty}
                    style={{
                      color: activeFile?.isDirty ? '#d4d4d4' : '#666',
                    }}
                  >
                    Save
                  </Button>
                </Tooltip>
                <Tooltip title="Save All">
                  <Button
                    type="text"
                    size="small"
                    icon={<SaveFilled />}
                    onClick={handleSaveAll}
                    disabled={dirtyFiles.length === 0}
                    style={{
                      color: dirtyFiles.length > 0 ? '#d4d4d4' : '#666',
                    }}
                  >
                    Save All {dirtyFiles.length > 0 && `(${dirtyFiles.length})`}
                  </Button>
                </Tooltip>
              </div>
            </div>

            <Tabs
              type="editable-card"
              activeKey={activeFilePath}
              onChange={handleTabChange}
              onEdit={(targetKey, action) => {
                if (action === 'remove') {
                  handleTabClose(targetKey);
                }
              }}
              hideAdd
              items={tabItems}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
              tabBarStyle={{
                margin: 0,
                background: '#252526',
                borderBottom: '1px solid #333',
                flexShrink: 0,
              }}
            />
          </div>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '13px',
              background: '#1e1e1e',
            }}
          >
            Double-click a file to open it in the editor
          </div>
        )}
      </Splitter.Pane>
    </Splitter>
  );
}

export default CenterPanel;
