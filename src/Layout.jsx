import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Splitter } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import FileTree from './FileTree';
import ChatInterface from './ChatInterface';
import ContextTools from './ContextTools';
import './Layout.css';

const { Header, Content } = AntLayout;

function Layout() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [treeData, setTreeData] = useState(null);
  const [openFolderPath, setOpenFolderPath] = useState(null);
  const [contextFiles, setContextFiles] = useState([]);

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

  useEffect(() => {
    // Listen for folder open events from Electron main process
    if (window.electron) {
      window.electron.onFolderOpened((data) => {
        setTreeData(data.data);
        setOpenFolderPath(data.path);
        // Clear context files when a new folder is opened
        setContextFiles([]);
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
        <div style={{ fontSize: '12px', color: '#999' }}>VS Code-like Editor</div>
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
            <div
              style={{
                padding: '8px',
                borderRight: '1px solid #333',
                borderBottom: '1px solid #333',
                background: '#252526',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              CHAT
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#1e1e1e' }}>
              <ChatInterface />
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
              />
            </div>
          </Splitter.Pane>
        </Splitter>
      </Content>
    </AntLayout>
  );
}

export default Layout;
