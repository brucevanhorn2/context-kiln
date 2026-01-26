import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyOutlined, CheckOutlined, EditOutlined } from '@ant-design/icons';
import { Tooltip, message } from 'antd';
import { useEditor } from '../contexts/EditorContext';

/**
 * CodeBlock - Code block with copy and insert buttons
 */
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const { insertAtCursor, hasActiveEditor } = useEditor();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInsert = () => {
    if (!hasActiveEditor()) {
      message.warning('No file open in editor. Open a file first.');
      return;
    }

    const success = insertAtCursor(children);
    if (success) {
      setInserted(true);
      setTimeout(() => setInserted(false), 2000);
    } else {
      message.error('Failed to insert code');
    }
  };

  const buttonStyle = {
    background: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    color: '#d4d4d4',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.2s',
  };

  return (
    <div style={{ position: 'relative', margin: '8px 0' }}>
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          zIndex: 1,
        }}
      >
        <Tooltip title="Insert at cursor in editor">
          <button
            onClick={handleInsert}
            style={{
              ...buttonStyle,
              background: inserted ? '#52c41a' : '#3c3c3c',
            }}
          >
            {inserted ? <CheckOutlined /> : <EditOutlined />}
            {inserted ? 'Inserted!' : 'Insert'}
          </button>
        </Tooltip>
        <Tooltip title="Copy to clipboard">
          <button
            onClick={handleCopy}
            style={{
              ...buttonStyle,
              background: copied ? '#52c41a' : '#3c3c3c',
            }}
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </Tooltip>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '12px',
          paddingTop: '36px', // Space for buttons
          borderRadius: '6px',
          fontSize: '12px',
          lineHeight: '1.5',
          backgroundColor: '#1e1e1e',
          border: '1px solid #3c3c3c',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * MessageContent - Renders markdown content with syntax highlighting
 *
 * Features:
 * - Markdown formatting (headers, lists, bold, italic, etc.)
 * - Syntax-highlighted code blocks with copy button
 * - Inline code styling
 * - Link handling
 */
function MessageContent({ content }) {
  if (!content) return null;

  return (
    <ReactMarkdown
      components={{
        // Code blocks with syntax highlighting and copy button
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          if (!inline && (match || String(children).includes('\n'))) {
            return (
              <CodeBlock language={language}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          }

          // Inline code
          return (
            <code
              style={{
                backgroundColor: '#2d2d2d',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                color: '#ce9178',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },

        // Paragraphs
        p({ children }) {
          return (
            <p style={{ margin: '8px 0', lineHeight: '1.6' }}>
              {children}
            </p>
          );
        },

        // Headers
        h1({ children }) {
          return <h1 style={{ fontSize: '1.4em', margin: '16px 0 8px', fontWeight: 600 }}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 style={{ fontSize: '1.2em', margin: '14px 0 6px', fontWeight: 600 }}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 style={{ fontSize: '1.1em', margin: '12px 0 4px', fontWeight: 600 }}>{children}</h3>;
        },

        // Lists
        ul({ children }) {
          return (
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {children}
            </ol>
          );
        },
        li({ children }) {
          return <li style={{ margin: '4px 0' }}>{children}</li>;
        },

        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4fc3f7', textDecoration: 'none' }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              {children}
            </a>
          );
        },

        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote
              style={{
                borderLeft: '3px solid #4fc3f7',
                paddingLeft: '12px',
                margin: '8px 0',
                color: '#aaa',
                fontStyle: 'italic',
              }}
            >
              {children}
            </blockquote>
          );
        },

        // Horizontal rule
        hr() {
          return (
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid #444',
                margin: '16px 0',
              }}
            />
          );
        },

        // Tables
        table({ children }) {
          return (
            <table
              style={{
                borderCollapse: 'collapse',
                margin: '8px 0',
                width: '100%',
                fontSize: '12px',
              }}
            >
              {children}
            </table>
          );
        },
        th({ children }) {
          return (
            <th
              style={{
                border: '1px solid #444',
                padding: '8px',
                backgroundColor: '#2d2d2d',
                textAlign: 'left',
              }}
            >
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td
              style={{
                border: '1px solid #444',
                padding: '8px',
              }}
            >
              {children}
            </td>
          );
        },

        // Strong/Bold
        strong({ children }) {
          return <strong style={{ fontWeight: 600, color: '#fff' }}>{children}</strong>;
        },

        // Emphasis/Italic
        em({ children }) {
          return <em style={{ fontStyle: 'italic' }}>{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// Memoize to prevent unnecessary re-renders during streaming
export default memo(MessageContent);
