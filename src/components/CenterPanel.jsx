import React, { useState, useEffect } from 'react';
import { Splitter, Tabs, Empty } from 'antd';
import { MessageOutlined, FileOutlined } from '@ant-design/icons';
import ChatInterface from '../ChatInterface';
import EditorTab from './EditorTab';
import { useEditor } from '../contexts/EditorContext';

/**
 * CenterPanel - Split view with chat (top) and editor (bottom)
 *
 * Features:
 * - Chat interface always visible at top
 * - File editor tabs at bottom (when files are open)
 * - Resizable horizontal split
 * - Multiple editor tabs with close buttons
 * - Dirty indicator (unsaved changes)
 */
function CenterPanel() {
  const {
    openFiles,
    activeFilePath,
    setActiveFile,
    closeFile,
  } = useEditor();

  const [activeEditorTab, setActiveEditorTab] = useState(null);

  /**
   * When a file becomes active, switch to its tab
   */
  useEffect(() => {
    if (activeFilePath) {
      setActiveEditorTab(activeFilePath);
    }
  }, [activeFilePath]);

  /**
   * Handle editor tab change
   */
  const handleEditorTabChange = (key) => {
    setActiveEditorTab(key);
    setActiveFile(key);
  };

  /**
   * Handle editor tab close
   */
  const handleEditorTabClose = async (targetKey) => {
    const success = await closeFile(targetKey, false);

    if (success) {
      // If we closed the active tab, switch to another open file or null
      if (targetKey === activeEditorTab) {
        const remainingFiles = openFiles.filter(f => f.path !== targetKey);
        if (remainingFiles.length > 0) {
          setActiveEditorTab(remainingFiles[0].path);
          setActiveFile(remainingFiles[0].path);
        } else {
          setActiveEditorTab(null);
        }
      }
    }
  };

  /**
   * Build editor tab items
   */
  const editorTabItems = openFiles.map((file) => ({
    key: file.path,
    label: (
      <span>
        <FileOutlined />
        {file.path.split(/[/\\]/).pop()}
        {file.isDirty && (
          <span style={{ marginLeft: '4px', color: '#ff9800' }}>●</span>
        )}
      </span>
    ),
    closable: true,
    children: <EditorTab filePath={file.path} />,
  }));

  // If no files are open, show chat only (full height)
  if (openFiles.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '8px 16px',
            background: '#252526',
            borderBottom: '1px solid #333',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#d4d4d4',
          }}
        >
          <MessageOutlined style={{ marginRight: '8px' }} />
          CHAT
        </div>
        {/* Chat Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface />
        </div>
      </div>
    );
  }

  // Files are open - show split view
  return (
    <Splitter
      style={{ height: '100%', width: '100%' }}
      layout="vertical"
    >
      {/* Chat Pane (Top) */}
      <Splitter.Pane
        defaultSize="50%"
        min="20%"
        max="80%"
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: '8px 16px',
            background: '#252526',
            borderBottom: '1px solid #333',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#d4d4d4',
          }}
        >
          <MessageOutlined style={{ marginRight: '8px' }} />
          CHAT
        </div>
        {/* Chat Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface />
        </div>
      </Splitter.Pane>

      {/* Editor Pane (Bottom) */}
      <Splitter.Pane
        defaultSize="50%"
        min="20%"
        max="80%"
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Editor Tabs */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            type="editable-card"
            activeKey={activeEditorTab}
            onChange={handleEditorTabChange}
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                handleEditorTabClose(targetKey);
              }
            }}
            hideAdd
            items={editorTabItems}
            style={{
              height: '100%',
              background: '#1e1e1e',
            }}
            tabBarStyle={{
              margin: 0,
              background: '#252526',
              borderBottom: '1px solid #333',
            }}
          />
        </div>
      </Splitter.Pane>
    </Splitter>
  );
}

export default CenterPanel;
