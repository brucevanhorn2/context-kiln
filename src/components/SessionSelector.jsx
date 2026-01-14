import React, { useState } from 'react';
import { Select, Button, Modal, Input, message, Space, Typography } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { useSession } from '../contexts/SessionContext';

const { Text } = Typography;

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
          style={{ minWidth: '200px' }}
          size="small"
        >
          {activeSessions.map((session) => (
            <Select.Option key={session.uuid} value={session.uuid}>
              {session.name}
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
