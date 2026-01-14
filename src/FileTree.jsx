import React, { useState, useEffect } from 'react';
import { Tree, Empty } from 'antd';
import { getFileIcon, getFolderIcon } from './fileIcons';

function FileTree({ treeData = null, openFolderPath = null, onAddContextFile = null }) {
  const [data, setData] = useState(treeData);
  const [expandedKeys, setExpandedKeys] = useState([]);

  // Custom title renderer that supports drag
  const createDraggableTitle = (node) => {
    const isDirectory = node.children && node.children.length > 0;

    return (
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('application/json', JSON.stringify({
            filePath: node.key,
            isDirectory,
            filename: node.title,
          }));
        }}
        style={{
          cursor: 'grab',
          userSelect: 'none',
          padding: '2px 4px',
          borderRadius: '2px',
        }}
        onMouseDown={(e) => {
          // Allow text selection on click but not dragging
          e.stopPropagation();
        }}
      >
        {node.title}
      </span>
    );
  };

  // Add icons to tree data recursively
  const enrichTreeWithIcons = (nodes) => {
    if (!nodes) return [];
    return nodes.map((node) => {
      const enrichedNode = { ...node };

      if (node.children && node.children.length > 0) {
        // It's a folder
        enrichedNode.icon = getFolderIcon();
        enrichedNode.children = enrichTreeWithIcons(node.children);
      } else {
        // It's a file
        enrichedNode.icon = getFileIcon(node.title);
      }

      // Add draggable title
      enrichedNode.title = createDraggableTitle(node);

      return enrichedNode;
    });
  };

  useEffect(() => {
    const enrichedData = enrichTreeWithIcons(treeData);
    setData(enrichedData);
    if (enrichedData && enrichedData.length > 0) {
      // Auto-expand first level
      setExpandedKeys(enrichedData.map((item) => item.key));
    }
  }, [treeData]);

  const onSelect = (selectedKeys, info) => {
    console.log('selected', selectedKeys);
    console.log('selected node', info);
  };

  const onExpand = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
  };

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
        onSelect={onSelect}
        treeData={data}
        style={{ color: '#d4d4d4', fontSize: '13px' }}
      />
    </div>
  );
}

export default FileTree;
