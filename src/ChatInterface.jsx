import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Space, Alert, Spin } from 'antd';
import { SendOutlined, StopOutlined, RobotOutlined } from '@ant-design/icons';
import { useClaude } from './contexts/ClaudeContext';
import DiffPreviewModal from './components/DiffPreviewModal';

function ChatInterface() {
  const {
    messages,
    isStreaming,
    error,
    currentProvider,
    currentModel,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useClaude();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isStreaming) return;

    const message = inputValue;
    setInputValue('');

    try {
      await sendMessage(message);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
      }}
    >
      {/* Provider Info */}
      <div
        style={{
          padding: '8px 12px',
          marginBottom: '12px',
          background: '#2a2a2a',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <RobotOutlined />
        <span>
          {currentProvider} / {currentModel}
        </span>
        {messages.length === 0 && (
          <span style={{ marginLeft: 'auto', color: '#666' }}>
            No API key configured - Go to Settings
          </span>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          style={{ marginBottom: '12px' }}
        />
      )}

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#666',
              marginTop: '50px',
              fontSize: '14px',
            }}
          >
            <p>Welcome to Context Kiln!</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Send a message to start chatting with Claude.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent:
                message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor:
                  message.role === 'user' ? '#0e639c' : '#333333',
                color: '#d4d4d4',
                fontSize: '13px',
                lineHeight: '1.5',
                position: 'relative',
              }}
            >
              {message.content}
              {message.isStreaming && (
                <Spin
                  size="small"
                  style={{ marginLeft: '8px', verticalAlign: 'middle' }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSendMessage}
          placeholder={
            isStreaming ? 'Waiting for response...' : 'Type your message...'
          }
          disabled={isStreaming}
          style={{
            backgroundColor: '#3c3c3c',
            borderColor: '#555555',
            color: '#d4d4d4',
          }}
        />
        {isStreaming ? (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={stopStreaming}
            title="Stop generating"
          >
            Stop
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            style={{ backgroundColor: '#0e639c', borderColor: '#0e639c' }}
          />
        )}
      </Space.Compact>

      {/* Diff Preview Modal */}
      <DiffPreviewModal />
    </div>
  );
}

export default ChatInterface;
