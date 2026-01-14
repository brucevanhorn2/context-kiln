import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import { MessageOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons';
import ChatInterface from '../ChatInterface';
import EditorTab from './EditorTab';
import { useEditor } from '../contexts/EditorContext';

/**
 * CenterPanel - Tabbed container for chat and file editor
 *
 * Features:
 * - Chat tab (always present)
 * - Dynamic editor tabs for open files
 * - Close button on editor tabs
 * - Dirty indicator (unsaved changes)
 * - Active tab management
 */
function CenterPanel() {
  const {
    openFiles,
    activeFilePath,
    setActiveFile,
    closeFile,
  } = useEditor();

  const [activeTabKey, setActiveTabKey] = useState('chat');

  /**
   * When a file becomes active, switch to its tab
   */
  useEffect(() => {
    if (activeFilePath) {
      setActiveTabKey(activeFilePath);
    }
  }, [activeFilePath]);

  /**
   * Handle tab change
   */
  const handleTabChange = (key) => {
    setActiveTabKey(key);

    if (key !== 'chat') {
      // Switching to an editor tab
      setActiveFile(key);
    }
  };

  /**
   * Handle editor tab close
   */
  const handleTabClose = async (targetKey) => {
    // Don't allow closing chat tab
    if (targetKey === 'chat') return;

    const success = await closeFile(targetKey, false);

    if (success) {
      // If we closed the active tab, switch to chat
      if (targetKey === activeTabKey) {
        setActiveTabKey('chat');
      }
    }
  };

  /**
   * Build tab items
   */
  const tabItems = [
    // Chat tab (always present)
    {
      key: 'chat',
      label: (
        <span>
          <MessageOutlined />
          Chat
        </span>
      ),
      closable: false,
      children: <ChatInterface />,
    },
    // Editor tabs (one per open file)
    ...openFiles.map((file) => ({
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
    })),
  ];

  return (
    <Tabs
      type="editable-card"
      activeKey={activeTabKey}
      onChange={handleTabChange}
      onEdit={(targetKey, action) => {
        if (action === 'remove') {
          handleTabClose(targetKey);
        }
      }}
      hideAdd // We add tabs by double-clicking files, not with + button
      items={tabItems}
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
  );
}

export default CenterPanel;
