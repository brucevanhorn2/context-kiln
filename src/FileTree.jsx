import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tree, Empty } from 'antd';
import { getFileIcon, getFolderIcon } from './fileIcons';
import { createLogger } from './utils/logger';

const log = createLogger('FileTree');

function FileTree({ treeData = null, openFolderPath = null, onAddContextFile = null, onOpenFile = null }) {
  const [data, setData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);

  // Track last click for double-click detection
  const lastClickRef = useRef({ key: null, time: 0 });

  // Add icons to tree data recursively
  const enrichTreeWithIcons = useCallback((nodes) => {
    if (!nodes) return [];
    return nodes.map((node) => {
      const enrichedNode = { ...node };

      if (node.children && node.children.length > 0) {
        enrichedNode.icon = getFolderIcon();
        enrichedNode.children = enrichTreeWithIcons(node.children);
        enrichedNode.isDirectory = true;
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

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: '32px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Empty
          description="No Folder Opened"
          style={{
            color: '#999999',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px' }}>
      <Tree
        showIcon
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        onSelect={handleSelect}
        treeData={data}
        titleRender={titleRender}
        style={{ color: '#d4d4d4', fontSize: '13px' }}
      />
    </div>
  );
}

export default FileTree;
