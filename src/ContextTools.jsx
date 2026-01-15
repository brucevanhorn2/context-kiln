import React, { useState } from 'react';
import { Tabs, Tag, Button, Space, Flex } from 'antd';
import { CodeOutlined, DollarOutlined, ToolOutlined } from '@ant-design/icons';
import { getFileColor, getFolderColor } from './fileColors';
import UsageTracker from './components/UsageTracker';

function ContextTools({
  contextFiles = [],
  onRemoveContextFile = null,
  onAddContextFile = null,
  onOpenFile = null,
  projectId = null,
  sessionId = null,
}) {
  const [activeTab, setActiveTab] = useState('1');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.className === 'drop-zone') {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onAddContextFile && data.filePath) {
        onAddContextFile(data.filePath, data.isDirectory);
      }
    } catch (err) {
      console.error('Failed to parse dragged data:', err);
    }
  };

  const getFileTagColor = (file) => {
    if (file.isDirectory) {
      return getFolderColor();
    }
    return getFileColor(file.filename);
  };

  const renderContextTab = () => {
    if (contextFiles.length === 0) {
      return (
        <div
          className="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            padding: '32px 16px',
            border: isDragOver ? '2px dashed #0e639c' : '2px dashed #555',
            borderRadius: '4px',
            textAlign: 'center',
            backgroundColor: isDragOver ? 'rgba(14, 99, 156, 0.1)' : 'transparent',
            transition: 'all 0.2s',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#999999', fontSize: '14px', marginBottom: '8px' }}>
            Drag files or folders here
          </div>
          <div style={{ color: '#666666', fontSize: '12px' }}>
            to add them to the context
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '8px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drop zone at top - always visible */}
        <div
          className="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            padding: '8px',
            marginBottom: '8px',
            border: isDragOver ? '2px dashed #0e639c' : '2px dashed #555',
            borderRadius: '4px',
            textAlign: 'center',
            backgroundColor: isDragOver ? 'rgba(14, 99, 156, 0.1)' : 'transparent',
            transition: 'all 0.2s',
            fontSize: '11px',
            color: '#888888',
            flexShrink: 0,
          }}
        >
          {contextFiles.length === 0
            ? 'Drag files or folders here'
            : 'Drop more files here'}
        </div>

        {/* Scrollable files list */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          {contextFiles.length === 0 ? (
            <div
              style={{
                padding: '16px 8px',
                textAlign: 'center',
                color: '#666666',
                fontSize: '12px',
              }}
            >
              No files selected
            </div>
          ) : (
            <Flex gap="small" wrap style={{ padding: '4px' }}>
              {contextFiles.map((file) => {
                return (
                  <Tag
                    key={file.id}
                    closable
                    style={{
                      flex: 'none',
                      userSelect: 'none',
                      color: '#fff',
                      backgroundColor: getFileTagColor(file),
                      border: 'none',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: !file.isDirectory ? 'pointer' : 'default',
                    }}
                    title={file.relativePath + ' (double-click to open)'}
                    onClose={() => {
                      if (onRemoveContextFile) {
                        onRemoveContextFile(file.id);
                      }
                    }}
                    onDoubleClick={() => {
                      // Double-click to open file in editor
                      if (!file.isDirectory && onOpenFile) {
                        onOpenFile(file.path);
                      }
                    }}
                  >
                    {file.relativePath}
                  </Tag>
                );
              })}
            </Flex>
          )}
        </div>
      </div>
    );
  };

  const items = [
    {
      key: '1',
      label: (
        <span>
          <CodeOutlined /> Context
        </span>
      ),
      children: renderContextTab(),
    },
    {
      key: '2',
      label: (
        <span>
          <DollarOutlined /> Usage
        </span>
      ),
      children: <UsageTracker projectId={projectId} sessionId={sessionId} />,
    },
    {
      key: '3',
      label: (
        <span>
          <ToolOutlined /> Tools
        </span>
      ),
      children: (
        <div style={{ padding: '12px' }}>
          <h4 style={{ color: '#d4d4d4', margin: '0 0 12px 0' }}>
            Engineering Tools
          </h4>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="default" size="small" block>
              Extract Variables
            </Button>
            <Button type="default" size="small" block>
              Generate Types
            </Button>
            <Button type="default" size="small" block>
              Add Documentation
            </Button>
            <Button type="default" size="small" block>
              Refactor Code
            </Button>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px', height: '100%' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        size="small"
        tabBarStyle={{
          backgroundColor: '#252526',
          borderBottom: '1px solid #333',
          margin: 0,
        }}
        style={{
          backgroundColor: '#1e1e1e',
        }}
      />
    </div>
  );
}

export default ContextTools;
