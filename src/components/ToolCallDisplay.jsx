/**
 * Tool Call Display
 *
 * Shows AI tool calls in the chat interface.
 * Displays tool name, parameters, status, and results.
 */

import React from 'react';
import { Card, Space, Tag, Typography, Button, Descriptions } from 'antd';
import {
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FileAddOutlined,
  FolderOutlined,
  EditOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * Get icon for tool type
 */
function getToolIcon(type) {
  switch (type) {
    case 'read_file':
      return <FileTextOutlined />;
    case 'edit_file':
      return <EditOutlined />;
    case 'create_file':
      return <FileAddOutlined />;
    case 'list_files':
      return <FolderOutlined />;
    default:
      return <ToolOutlined />;
  }
}

/**
 * Get status icon and color
 */
function getStatusInfo(status) {
  switch (status) {
    case 'pending':
      return {
        icon: <ClockCircleOutlined />,
        color: 'orange',
        text: 'Waiting for approval',
      };
    case 'approved':
      return {
        icon: <CheckCircleOutlined />,
        color: 'green',
        text: 'Approved',
      };
    case 'rejected':
      return {
        icon: <CloseCircleOutlined />,
        color: 'red',
        text: 'Rejected',
      };
    case 'executed':
      return {
        icon: <CheckCircleOutlined />,
        color: 'blue',
        text: 'Completed',
      };
    case 'error':
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'red',
        text: 'Error',
      };
    default:
      return {
        icon: <ClockCircleOutlined />,
        color: 'default',
        text: status,
      };
  }
}

/**
 * Format tool call parameters for display
 */
function formatParameters(toolCall) {
  const { type, path, description, pattern, recursive } = toolCall;

  const items = [];

  if (path) {
    items.push({ label: 'File', children: <Text code>{path}</Text> });
  }

  if (description) {
    items.push({ label: 'Description', children: description });
  }

  if (type === 'list_files') {
    if (pattern) {
      items.push({ label: 'Pattern', children: <Text code>{pattern}</Text> });
    }
    if (recursive !== undefined) {
      items.push({
        label: 'Recursive',
        children: recursive ? 'Yes' : 'No',
      });
    }
  }

  return items;
}

/**
 * Format tool call result for display
 */
function formatResult(toolCall) {
  const { type, result, error } = toolCall;

  if (error) {
    return (
      <Alert
        type="error"
        message="Tool execution failed"
        description={error}
        showIcon
      />
    );
  }

  if (!result) {
    return null;
  }

  const items = [];

  if (type === 'read_file') {
    items.push(
      { label: 'Lines Read', children: result.lines },
      { label: 'Total Lines', children: result.total_lines },
      { label: 'File Size', children: `${Math.round(result.size / 1024)}KB` }
    );
  } else if (type === 'edit_file') {
    items.push(
      { label: 'Lines Changed', children: result.lines_changed },
      { label: 'Additions', children: `+${result.additions}` },
      { label: 'Deletions', children: `-${result.deletions}` }
    );
  } else if (type === 'create_file') {
    items.push(
      { label: 'Lines', children: result.lines },
      { label: 'Size', children: `${Math.round(result.size / 1024)}KB` }
    );
  } else if (type === 'list_files') {
    items.push(
      { label: 'Files Found', children: result.count },
      {
        label: 'Truncated',
        children: result.truncated ? 'Yes (too many results)' : 'No',
      }
    );
  }

  return items.length > 0 ? (
    <Descriptions
      size="small"
      column={1}
      items={items}
      style={{ marginTop: '8px' }}
    />
  ) : null;
}

/**
 * Tool Call Display Component
 */
function ToolCallDisplay({ toolCall }) {
  if (!toolCall) {
    return null;
  }

  const statusInfo = getStatusInfo(toolCall.status);
  const parameterItems = formatParameters(toolCall);
  const resultContent = formatResult(toolCall);

  return (
    <Card
      size="small"
      style={{
        marginBottom: '8px',
        background: '#1e1e1e',
        borderColor: '#434343',
      }}
      title={
        <Space>
          {getToolIcon(toolCall.type)}
          <Text strong style={{ color: '#ffffff' }}>
            {toolCall.type.replace('_', ' ')}
          </Text>
        </Space>
      }
      extra={
        <Tag color={statusInfo.color} icon={statusInfo.icon}>
          {statusInfo.text}
        </Tag>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Parameters */}
        {parameterItems.length > 0 && (
          <Descriptions size="small" column={1} items={parameterItems} />
        )}

        {/* Result */}
        {resultContent}

        {/* Rejection reason */}
        {toolCall.status === 'rejected' && toolCall.rejectionReason && (
          <Alert
            type="warning"
            message="Rejected"
            description={toolCall.rejectionReason}
            showIcon
            size="small"
          />
        )}
      </Space>
    </Card>
  );
}

export default React.memo(ToolCallDisplay);
