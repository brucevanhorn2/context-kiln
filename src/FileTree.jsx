import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tree, Empty, Modal, Input, Dropdown, message } from 'antd';
import { FileAddOutlined, FolderAddOutlined } from '@ant-design/icons';
import { getFileIcon, getFolderIcon } from './fileIcons';
import { createLogger } from './utils/logger';

const log = createLogger('FileTree');

const path = {
  join: (...parts) => parts.join('/').replace(/\/+/g, '/'),
  dirname: (p) => p.split('/').slice(0, -1).join('/') || '/',
  basename: (p) => p.split('/').pop(),
};

function FileTree({ treeData = null, openFolderPath = null, onAddContextFile = null, onOpenFile = null }) {
  const [data, setData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);

  // Track last click for double-click detection
  const lastClickRef = useRef({ key: null, time: 0 });

  // Modal state for New File / New Folder
  const [newFileModalVisible, setNewFileModalVisible] = useState(false);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParentPath, setNewItemParentPath] = useState(null);
  const [inputError, setInputError] = useState('');

  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuNode, setContextMenuNode] = useState(null);

  // Add icons to tree data recursively
  const enrichTreeWithIcons = useCallback((nodes) => {
    if (!nodes) return [];
    return nodes.map((node) => {
      const enrichedNode = { ...node };
      // Use isFile property from scanner (isFile: false means directory)
      const isDirectory = node.isFile === false;

      if (isDirectory) {
        enrichedNode.icon = getFolderIcon();
        enrichedNode.isDirectory = true;
        if (node.children) {
          enrichedNode.children = enrichTreeWithIcons(node.children);
        }
      } else {
        enrichedNode.icon = getFileIcon(node.title);
        enrichedNode.isDirectory = false;
      }

      return enrichedNode;
    });
  }, []);

  useEffect(() => {
    const enrichedData = enrichTreeWithIcons(treeData);
    setData(enrichedData);
    if (enrichedData && enrichedData.length > 0) {
      setExpandedKeys(enrichedData.map((item) => item.key));
    }
  }, [treeData, enrichTreeWithIcons]);

  const onExpand = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
  };

  // Validate file/folder name
  const validateName = useCallback((name) => {
    if (!name || !name.trim()) {
      return 'Name cannot be empty';
    }
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return 'Name contains invalid characters';
    }
    return '';
  }, []);

  // Open modal for new file
  const openNewFileModal = useCallback((parentPath = null) => {
    setNewItemParentPath(parentPath || openFolderPath);
    setNewItemName('');
    setInputError('');
    setNewFileModalVisible(true);
  }, [openFolderPath]);

  // Open modal for new folder
  const openNewFolderModal = useCallback((parentPath = null) => {
    setNewItemParentPath(parentPath || openFolderPath);
    setNewItemName('');
    setInputError('');
    setNewFolderModalVisible(true);
  }, [openFolderPath]);

  // Create new file
  const handleCreateFile = useCallback(async () => {
    const error = validateName(newItemName);
    if (error) {
      setInputError(error);
      return;
    }

    try {
      const filePath = path.join(newItemParentPath, newItemName.trim());
      await window.electron.createFile(filePath, '');
      message.success(`Created file: ${newItemName}`);
      setNewFileModalVisible(false);
      // Open the newly created file
      if (onOpenFile) {
        onOpenFile(filePath);
      }
    } catch (err) {
      log.error('Failed to create file', err);
      message.error(`Failed to create file: ${err.message}`);
    }
  }, [newItemName, newItemParentPath, validateName, onOpenFile]);

  // Create new folder
  const handleCreateFolder = useCallback(async () => {
    const error = validateName(newItemName);
    if (error) {
      setInputError(error);
      return;
    }

    try {
      const folderPath = path.join(newItemParentPath, newItemName.trim());
      await window.electron.createDirectory(folderPath);
      message.success(`Created folder: ${newItemName}`);
      setNewFolderModalVisible(false);
    } catch (err) {
      log.error('Failed to create folder', err);
      message.error(`Failed to create folder: ${err.message}`);
    }
  }, [newItemName, newItemParentPath, validateName]);

  // Handle right-click on tree node
  const handleRightClick = useCallback(({ event, node }) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuNode(node);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  }, []);

  // Context menu items
  const getContextMenuItems = useCallback(() => {
    if (!contextMenuNode) return [];
    const isDirectory = contextMenuNode?.isDirectory;
    const parentPath = isDirectory ? contextMenuNode.key : path.dirname(contextMenuNode.key);

    return [
      {
        key: 'newFile',
        label: 'New File',
        icon: <FileAddOutlined />,
        onClick: () => {
          openNewFileModal(parentPath);
          setContextMenuVisible(false);
        },
      },
      {
        key: 'newFolder',
        label: 'New Folder',
        icon: <FolderAddOutlined />,
        onClick: () => {
          openNewFolderModal(parentPath);
          setContextMenuVisible(false);
        },
      },
    ];
  }, [contextMenuNode, openNewFileModal, openNewFolderModal]);

  /**
   * Handle select - detect double-clicks via timing
   */
  const handleSelect = useCallback((selectedKeys, info) => {
    const now = Date.now();
    const nodeKey = info.node?.key;
    const isDirectory = info.node?.isDirectory;

    log.debug('Select', { nodeKey, isDirectory });

    // Check if this is a double-click (same node clicked within 400ms)
    if (
      lastClickRef.current.key === nodeKey &&
      now - lastClickRef.current.time < 400
    ) {
      log.info('Double-click detected', { nodeKey });

      // Only open files, not directories
      if (!isDirectory && onOpenFile) {
        log.info('Opening file', { nodeKey });
        onOpenFile(nodeKey);
      }

      // Reset to prevent triple-click triggering
      lastClickRef.current = { key: null, time: 0 };
    } else {
      // Record this click
      lastClickRef.current = { key: nodeKey, time: now };
    }
  }, [onOpenFile]);

  /**
   * Custom title renderer for drag support
   */
  const titleRender = useCallback((nodeData) => {
    const handleDragStart = (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify({
        filePath: nodeData.key,
        isDirectory: nodeData.isDirectory,
        filename: nodeData.title,
      }));
    };

    return (
      <span
        draggable
        onDragStart={handleDragStart}
        style={{
          userSelect: 'none',
          padding: '2px 4px',
          borderRadius: '2px',
        }}
      >
        {nodeData.title}
      </span>
    );
  }, []);

  // Header toolbar with New File / New Folder buttons
  const renderToolbar = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '4px',
        padding: '4px 8px',
        borderBottom: '1px solid #333',
      }}
    >
      <button
        onClick={() => openNewFileModal()}
        disabled={!openFolderPath}
        title="New File"
        style={{
          background: 'none',
          border: 'none',
          color: openFolderPath ? '#d4d4d4' : '#666',
          cursor: openFolderPath ? 'pointer' : 'not-allowed',
          padding: '4px 6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => openFolderPath && (e.target.style.background = '#333')}
        onMouseLeave={(e) => (e.target.style.background = 'none')}
      >
        <FileAddOutlined />
      </button>
      <button
        onClick={() => openNewFolderModal()}
        disabled={!openFolderPath}
        title="New Folder"
        style={{
          background: 'none',
          border: 'none',
          color: openFolderPath ? '#d4d4d4' : '#666',
          cursor: openFolderPath ? 'pointer' : 'not-allowed',
          padding: '4px 6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => openFolderPath && (e.target.style.background = '#333')}
        onMouseLeave={(e) => (e.target.style.background = 'none')}
      >
        <FolderAddOutlined />
      </button>
    </div>
  );

  // Modals for creating files/folders
  const renderModals = () => (
    <>
      <Modal
        title="New File"
        open={newFileModalVisible}
        onOk={handleCreateFile}
        onCancel={() => setNewFileModalVisible(false)}
        okText="Create"
        destroyOnClose
      >
        <Input
          placeholder="Enter file name"
          value={newItemName}
          onChange={(e) => {
            setNewItemName(e.target.value);
            setInputError('');
          }}
          onPressEnter={handleCreateFile}
          status={inputError ? 'error' : ''}
          autoFocus
        />
        {inputError && (
          <div style={{ color: '#ff4d4f', marginTop: '4px', fontSize: '12px' }}>
            {inputError}
          </div>
        )}
        <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
          Creating in: {newItemParentPath}
        </div>
      </Modal>

      <Modal
        title="New Folder"
        open={newFolderModalVisible}
        onOk={handleCreateFolder}
        onCancel={() => setNewFolderModalVisible(false)}
        okText="Create"
        destroyOnClose
      >
        <Input
          placeholder="Enter folder name"
          value={newItemName}
          onChange={(e) => {
            setNewItemName(e.target.value);
            setInputError('');
          }}
          onPressEnter={handleCreateFolder}
          status={inputError ? 'error' : ''}
          autoFocus
        />
        {inputError && (
          <div style={{ color: '#ff4d4f', marginTop: '4px', fontSize: '12px' }}>
            {inputError}
          </div>
        )}
        <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
          Creating in: {newItemParentPath}
        </div>
      </Modal>
    </>
  );

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setContextMenuVisible(false);
    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuVisible]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {renderToolbar()}
        <div
          style={{
            padding: '32px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Empty
            description="No Folder Opened"
            style={{
              color: '#999999',
            }}
          />
        </div>
        {renderModals()}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderToolbar()}
      <div style={{ padding: '8px', flex: 1, overflow: 'auto' }}>
        <Tree
          showIcon
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          onSelect={handleSelect}
          onRightClick={handleRightClick}
          treeData={data}
          titleRender={titleRender}
          style={{ color: '#d4d4d4', fontSize: '13px' }}
        />
        {/* Context menu */}
        {contextMenuVisible && (
          <Dropdown
            menu={{ items: getContextMenuItems() }}
            open={contextMenuVisible}
            onOpenChange={setContextMenuVisible}
          >
            <div
              style={{
                position: 'fixed',
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                width: 1,
                height: 1,
              }}
            />
          </Dropdown>
        )}
      </div>
      {renderModals()}
    </div>
  );
}

export default FileTree;
