import React, { useState } from 'react';
import { Select, Button, Modal, Input, message, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, FolderOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { useSession } from '../contexts/SessionContext';

const { Text } = Typography;

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Format full date for tooltip
 */
function formatFullDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * SessionSelector - Select and manage sessions
 *
 * Features:
 * - Display current session
 * - Switch between sessions
 * - Create new session
 * - Shows session list in dropdown
 */
function SessionSelector({ projectPath, projectId }) {
  const {
    currentSession,
    sessions,
    createSession,
    switchSession,
    isLoading,
  } = useSession();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);

  /**
   * Handle session switch
   */
  const handleSessionChange = async (uuid) => {
    try {
      await switchSession(uuid);
    } catch (err) {
      message.error(`Failed to switch session: ${err.message}`);
    }
  };

  /**
   * Handle create new session
   */
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      message.error('Please enter a session name');
      return;
    }

    try {
      setCreating(true);
      await createSession(newSessionName.trim(), true);
      message.success(`Session "${newSessionName}" created`);
      setCreateModalVisible(false);
      setNewSessionName('');
    } catch (err) {
      message.error(`Failed to create session: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Don't render if no project selected
  if (!projectPath || !projectId) {
    return (
      <div style={{ fontSize: '12px', color: '#666' }}>
        <FolderOutlined /> No project opened
      </div>
    );
  }

  // Get active sessions
  const activeSessions = sessions.filter((s) => !s.isArchived);

  return (
    <>
      <Space size="small">
        {/* Session Selector */}
        <Select
          value={currentSession?.uuid}
          onChange={handleSessionChange}
          loading={isLoading}
          placeholder="Select session..."
          style={{ minWidth: '280px' }}
          size="small"
          optionLabelProp="label"
          dropdownStyle={{ minWidth: '350px' }}
        >
          {activeSessions.map((session) => (
            <Select.Option
              key={session.uuid}
              value={session.uuid}
              label={session.name}
            >
              <Tooltip
                title={
                  <div>
                    <div><strong>Created:</strong> {formatFullDate(session.createdAt)}</div>
                    <div><strong>Last used:</strong> {formatFullDate(session.lastAccessed)}</div>
                  </div>
                }
                placement="left"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontWeight: 500, color: '#d4d4d4' }}>
                    {session.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', display: 'flex', gap: '12px' }}>
                    <span>
                      <ClockCircleOutlined style={{ marginRight: '4px' }} />
                      Started: {formatDate(session.createdAt)}
                    </span>
                    <span>
                      <MessageOutlined style={{ marginRight: '4px' }} />
                      Last: {formatDate(session.lastAccessed)}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Select.Option>
          ))}
        </Select>

        {/* Create New Session Button */}
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
          title="Create new session"
        >
          New
        </Button>
      </Space>

      {/* Create Session Modal */}
      <Modal
        title="Create New Session"
        open={createModalVisible}
        onOk={handleCreateSession}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewSessionName('');
        }}
        confirmLoading={creating}
        okText="Create"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text>Session Name</Text>
            <Input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onPressEnter={handleCreateSession}
              placeholder="e.g., Feature-Auth, Bug-Fix-123"
              autoFocus
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Sessions help organize your work and manage context effectively
            </Text>
          </div>

          <div style={{ fontSize: '12px', color: '#888' }}>
            <div>Session files will be created at:</div>
            <div style={{ fontFamily: 'monospace', marginTop: '4px', wordBreak: 'break-all' }}>
              {projectPath}\.context-kiln\sessions\{newSessionName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'session-name'}
            </div>
          </div>
        </Space>
      </Modal>
    </>
  );
}

export default SessionSelector;
