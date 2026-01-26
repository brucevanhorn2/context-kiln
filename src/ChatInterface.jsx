import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Space, Spin, Select } from 'antd';
import { SendOutlined, StopOutlined, RobotOutlined, WarningOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useClaude } from './contexts/ClaudeContext';
import DiffPreviewModal from './components/DiffPreviewModal';
import MessageContent from './components/MessageContent';

function ChatInterface() {
  const {
    messages,
    isStreaming,
    error,
    currentProvider,
    currentModel,
    availableModels,
    sendMessage,
    stopStreaming,
    clearMessages,
    clearError,
    switchModel,
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
      {/* Provider Info with Model Selector */}
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
        <span>{currentProvider} /</span>
        <Select
          value={currentModel}
          onChange={switchModel}
          size="small"
          style={{ minWidth: '180px' }}
          dropdownStyle={{ background: '#2a2a2a' }}
          disabled={isStreaming}
        >
          {availableModels.map((model) => (
            <Select.Option key={model.id || model} value={model.id || model}>
              {model.name || model.id || model}
            </Select.Option>
          ))}
        </Select>
        {messages.length === 0 && (
          <span style={{ marginLeft: 'auto', color: '#666' }}>
            No API key configured - Go to Settings
          </span>
        )}
      </div>

      {/* Error Message - styled like a chat message */}
      {error && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#4a2c2c',
              border: '1px solid #6b3a3a',
              color: '#e8b4b4',
              fontSize: '13px',
              lineHeight: '1.5',
              position: 'relative',
            }}
          >
            <button
              onClick={clearError}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#8b5a5a',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                fontSize: '14px',
              }}
              title="Dismiss"
            >
              <CloseOutlined />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingRight: '20px' }}>
              <WarningOutlined style={{ color: '#cf6679' }} />
              <span style={{ fontWeight: 500, color: '#cf6679' }}>Connection Error</span>
            </div>
            <div style={{ color: '#d4a5a5' }}>
              {error.includes('Not Found') || error.includes('ECONNREFUSED')
                ? `Unable to reach the ${currentProvider} backend. Please ensure the service is running.`
                : error}
            </div>
          </div>
        </div>
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
        {messages.map((message, index) => {
          // Check if this is the last assistant message (for spinner display)
          const isLastMessage = index === messages.length - 1;
          const isActivelyStreaming = isLastMessage && message.role === 'assistant' && isStreaming;
          const isCompleted = message.role === 'assistant' && !isStreaming && message.tokens;

          return (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent:
                message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              className="message-content"
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor:
                  message.role === 'user' ? '#0e639c' : '#333333',
                color: '#d4d4d4',
                fontSize: '13px',
                lineHeight: '1.5',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <MessageContent content={message.content} />
              {isActivelyStreaming && (
                <Spin
                  size="small"
                  style={{ marginLeft: '8px', verticalAlign: 'middle' }}
                />
              )}
              {isCompleted && (
                <CheckCircleOutlined
                  style={{
                    marginLeft: '8px',
                    verticalAlign: 'middle',
                    color: '#52c41a',
                    fontSize: '12px',
                  }}
                  title={`${message.tokens.output || message.tokens.outputTokens || 0} tokens`}
                />
              )}
            </div>
          </div>
        );
        })}
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
