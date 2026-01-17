import React from 'react';
import { Splitter, Tabs } from 'antd';
import { FileOutlined } from '@ant-design/icons';
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
    setActiveFile,
    closeFile,
  } = useEditor();

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
      <Splitter.Panel
        defaultSize={hasOpenFiles ? '50%' : '100%'}
        min="20%"
        max="80%"
        style={{ overflow: 'hidden' }}
      >
        <ChatInterface />
      </Splitter.Panel>

      {/* Editor pane (bottom) - only show if files are open */}
      {hasOpenFiles && (
        <Splitter.Panel
          defaultSize="50%"
          min="20%"
          max="80%"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
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
              height: '100%',
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
        </Splitter.Panel>
      )}
    </Splitter>
  );
}

export default CenterPanel;
