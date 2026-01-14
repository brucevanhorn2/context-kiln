import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Space, Message } from 'antd';
import { SendOutlined } from '@ant-design/icons';

function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'user',
      content: 'Hello! Can you help me with this project?',
    },
    {
      id: 2,
      type: 'assistant',
      content: 'Of course! I\'m here to help you build your context engineering tools.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: 'This is a simulated response. Replace this with actual AI integration.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
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
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent:
                message.type === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor:
                  message.type === 'user'
                    ? '#0e639c'
                    : '#333333',
                color: '#d4d4d4',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              {message.content}
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
          placeholder="Type your message..."
          style={{
            backgroundColor: '#3c3c3c',
            borderColor: '#555555',
            color: '#d4d4d4',
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          style={{ backgroundColor: '#0e639c', borderColor: '#0e639c' }}
        />
      </Space.Compact>
    </div>
  );
}

export default ChatInterface;
