import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Spin, Alert, Button, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useEditor } from '../contexts/EditorContext';
import { useSettings } from '../contexts/SettingsContext';
import MessageContent from './MessageContent';

/**
 * EditorTab - Monaco Editor wrapper for a single file
 *
 * Features:
 * - Monaco Editor with VS Code quality
 * - Syntax highlighting (40+ languages)
 * - Auto-save on Ctrl+S
 * - Theme support (dark/light)
 * - Settings integration (font size, tab size, word wrap)
 */
function EditorTab({ filePath }) {
  const {
    openFiles,
    updateFileContent,
    saveFile,
    editorSettings,
    registerActiveEditor,
    unregisterActiveEditor,
  } = useEditor();

  const { settings } = useSettings();
  const editorRef = useRef(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Find the file
  const file = openFiles.find((f) => f.path === filePath);

  // Check if this is a markdown file
  const isMarkdown = file?.language === 'markdown' || filePath?.endsWith('.md');

  /**
   * Handle editor mount
   */
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register with EditorContext so other components can insert text
    registerActiveEditor(editor);

    // Add Ctrl+S save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      await handleSave();
    });

    // Focus editor
    editor.focus();
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Unregister editor when component unmounts
      unregisterActiveEditor();
    };
  }, [unregisterActiveEditor]);

  /**
   * Handle content change
   */
  const handleChange = (value) => {
    if (value !== undefined) {
      updateFileContent(filePath, value);
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!file?.isDirty) return;

    await saveFile(filePath);
  };

  /**
   * Handle Ctrl+S from outside editor (global shortcut)
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file?.isDirty, filePath]);

  if (!file) {
    return (
      <Alert
        message="File Not Found"
        description={`Could not load file: ${filePath}`}
        type="error"
        style={{ margin: '20px' }}
      />
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Markdown preview toggle */}
      {isMarkdown && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: file.isDirty ? '120px' : '8px',
            zIndex: 10,
          }}
        >
          <Tooltip title={isPreviewMode ? 'Edit markdown' : 'Preview markdown'}>
            <Button
              type="default"
              size="small"
              icon={isPreviewMode ? <EditOutlined /> : <EyeOutlined />}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              style={{
                background: '#3c3c3c',
                border: '1px solid #555',
                color: '#d4d4d4',
              }}
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Dirty indicator */}
      {file.isDirty && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#ff9800',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          Unsaved Changes
        </div>
      )}

      {/* Show either preview or editor */}
      {isMarkdown && isPreviewMode ? (
        <div
          style={{
            height: '100%',
            overflow: 'auto',
            padding: '20px 40px',
            background: '#1e1e1e',
            paddingBottom: '40px', // Space for info bar
          }}
        >
          <MessageContent content={file.content} />
        </div>
      ) : (
        <Editor
          height="100%"
          language={file.language}
          value={file.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={settings.editorTheme || 'vs-dark'}
          loading={<Spin size="large" style={{ marginTop: '100px' }} />}
          options={{
            fontSize: settings.editorFontSize || 14,
            tabSize: settings.editorTabSize || 2,
            wordWrap: settings.editorWordWrap ? 'on' : 'off',
            minimap: editorSettings.minimap || { enabled: true },
            lineNumbers: editorSettings.lineNumbers || 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            parameterHints: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      )}

      {/* File info bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#252526',
          borderTop: '1px solid #333',
          padding: '4px 12px',
          fontSize: '11px',
          color: '#888',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>{file.relativePath || filePath}</div>
        <div>
          {isMarkdown && isPreviewMode && (
            <span style={{ marginRight: '12px', color: '#4fc3f7' }}>
              PREVIEW
            </span>
          )}
          <span style={{ marginRight: '12px' }}>
            {file.language.toUpperCase()}
          </span>
          <span style={{ marginRight: '12px' }}>
            Lines: {file.metadata?.lines || 0}
          </span>
          <span>
            {file.isDirty ? 'Modified' : 'Saved'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default EditorTab;
