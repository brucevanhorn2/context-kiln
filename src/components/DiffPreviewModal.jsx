/**
 * Diff Preview Modal
 *
 * Shows a side-by-side diff of proposed file changes.
 * User can approve, reject, or edit the changes manually.
 */

import React, { useState, useMemo } from 'react';
import { Modal, Button, Space, Alert, Tag, Typography } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FileAddOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTool } from '../contexts/ToolContext';
import { useEditor } from '../contexts/EditorContext';
import { getLanguageForFile } from '../utils/constants';

const { Text } = Typography;

/**
 * Diff Preview Modal Component
 */
function DiffPreviewModal() {
  const { activeDiffPreview, approveToolCall, rejectToolCall } = useTool();
  const { openFile } = useEditor();
  const [isEditing, setIsEditing] = useState(false);

  // Close handler
  const handleClose = () => {
    if (!isEditing && activeDiffPreview) {
      rejectToolCall(activeDiffPreview.id, 'User closed the preview');
    }
  };

  // Approve handler
  const handleApprove = () => {
    if (activeDiffPreview) {
      approveToolCall(activeDiffPreview.id);
    }
  };

  // Reject handler
  const handleReject = () => {
    if (activeDiffPreview) {
      rejectToolCall(activeDiffPreview.id, 'User rejected the proposed changes');
    }
  };

  // Edit Manually handler
  const handleEditManually = () => {
    if (activeDiffPreview) {
      // Open file in editor with the proposed content
      openFile(activeDiffPreview.absolutePath || activeDiffPreview.path);

      // Reject the tool call (user will make changes manually)
      rejectToolCall(
        activeDiffPreview.id,
        'User chose to edit manually'
      );
    }
  };

  if (!activeDiffPreview) {
    return null;
  }

  const {
    type,
    path,
    currentContent,
    updatedContent,
    description,
    diff,
  } = activeDiffPreview;

  const isNewFile = type === 'create_file';
  const language = getLanguageForFile(path);

  return (
    <Modal
      open={true}
      title={
        <Space>
          {isNewFile ? <FileAddOutlined /> : <FileTextOutlined />}
          <span>
            {isNewFile ? 'Create New File' : 'Edit File'}: {path}
          </span>
        </Space>
      }
      width={1000}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Description */}
        <Alert
          message={description}
          type="info"
          showIcon
          icon={<FileTextOutlined />}
        />

        {/* Diff Statistics */}
        <Space>
          <Tag color="blue">Lines changed: {diff.changedLines}</Tag>
          <Tag color="green">+{diff.additions} additions</Tag>
          <Tag color="red">-{diff.deletions} deletions</Tag>
        </Space>

        {/* Side-by-side diff */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isNewFile ? '1fr' : '1fr 1fr',
            gap: '16px',
            maxHeight: '500px',
            overflow: 'auto',
          }}
        >
          {!isNewFile && (
            <div>
              <Text strong style={{ color: '#ffffff', marginBottom: '8px', display: 'block' }}>
                Before
              </Text>
              <div
                style={{
                  border: '1px solid #434343',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '450px',
                }}
              >
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  showLineNumbers
                  wrapLines
                  customStyle={{
                    margin: 0,
                    fontSize: '12px',
                    background: '#1e1e1e',
                  }}
                >
                  {currentContent}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          <div>
            <Text strong style={{ color: '#ffffff', marginBottom: '8px', display: 'block' }}>
              {isNewFile ? 'New File Content' : 'After'}
            </Text>
            <div
              style={{
                border: '1px solid #434343',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '450px',
              }}
            >
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers
                wrapLines
                customStyle={{
                  margin: 0,
                  fontSize: '12px',
                  background: '#1e1e1e',
                }}
              >
                {updatedContent}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <Space style={{ marginTop: '16px' }}>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApprove}
            size="large"
          >
            Approve
          </Button>

          <Button
            danger
            icon={<CloseOutlined />}
            onClick={handleReject}
            size="large"
          >
            Reject
          </Button>

          <Button
            icon={<EditOutlined />}
            onClick={handleEditManually}
            size="large"
          >
            Edit Manually
          </Button>
        </Space>

        {/* Help text */}
        <Alert
          message="Review the proposed changes carefully before approving"
          description={
            <div>
              <strong>Approve:</strong> Apply these changes to the file
              <br />
              <strong>Reject:</strong> Discard these changes
              <br />
              <strong>Edit Manually:</strong> Open the file in the editor to make changes yourself
            </div>
          }
          type="warning"
          showIcon
          closable
        />
      </Space>
    </Modal>
  );
}

export default React.memo(DiffPreviewModal);
