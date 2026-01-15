import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Spin, Alert, Button, Space, Tooltip } from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  SearchOutlined,
  AlignLeftOutlined,
} from '@ant-design/icons';
import { useEditor } from '../contexts/EditorContext';
import { useSettings } from '../contexts/SettingsContext';

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
const EditorTab = React.memo(function EditorTab({ filePath }) {
  const {
    openFiles,
    updateFileContent,
    saveFile,
    editorSettings,
  } = useEditor();

  const { settings } = useSettings();
  const editorRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Find the file
  const file = openFiles.find((f) => f.path === filePath);

  /**
   * Handle editor mount
   */
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+S save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      await handleSave();
    });

    // Track undo/redo availability
    const model = editor.getModel();
    if (model) {
      model.onDidChangeContent(() => {
        const viewState = editor.saveViewState();
        setCanUndo(model.canUndo());
        setCanRedo(model.canRedo());
      });
    }

    // Focus editor
    editor.focus();
  };

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

    const success = await saveFile(filePath);
    if (success) {
      // Show brief success indicator (could add toast notification)
      console.log(`Saved: ${filePath}`);
    }
  };

  /**
   * Toolbar actions - trigger Monaco commands
   */
  const toolbarActions = {
    undo: () => {
      editorRef.current?.trigger('toolbar', 'undo', null);
    },
    redo: () => {
      editorRef.current?.trigger('toolbar', 'redo', null);
    },
    cut: () => {
      editorRef.current?.trigger('toolbar', 'editor.action.clipboardCutAction', null);
    },
    copy: () => {
      editorRef.current?.trigger('toolbar', 'editor.action.clipboardCopyAction', null);
    },
    paste: () => {
      editorRef.current?.trigger('toolbar', 'editor.action.clipboardPasteAction', null);
    },
    find: () => {
      editorRef.current?.trigger('toolbar', 'actions.find', null);
    },
    format: () => {
      editorRef.current?.trigger('toolbar', 'editor.action.formatDocument', null);
    },
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
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
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

      {/* Toolbar */}
      <div
        style={{
          background: '#252526',
          borderBottom: '1px solid #333',
          padding: '4px 8px',
          flexShrink: 0,
        }}
      >
        <Space size="small">
          <Tooltip title="Save (Ctrl+S)">
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!file.isDirty}
              type={file.isDirty ? 'primary' : 'default'}
            />
          </Tooltip>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={toolbarActions.undo}
              disabled={!canUndo}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={toolbarActions.redo}
              disabled={!canRedo}
            />
          </Tooltip>
          <Tooltip title="Cut (Ctrl+X)">
            <Button
              size="small"
              icon={<ScissorOutlined />}
              onClick={toolbarActions.cut}
            />
          </Tooltip>
          <Tooltip title="Copy (Ctrl+C)">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={toolbarActions.copy}
            />
          </Tooltip>
          <Tooltip title="Paste (Ctrl+V)">
            <Button
              size="small"
              icon={<SnippetsOutlined />}
              onClick={toolbarActions.paste}
            />
          </Tooltip>
          <Tooltip title="Find (Ctrl+F)">
            <Button
              size="small"
              icon={<SearchOutlined />}
              onClick={toolbarActions.find}
            />
          </Tooltip>
          <Tooltip title="Format Document">
            <Button
              size="small"
              icon={<AlignLeftOutlined />}
              onClick={toolbarActions.format}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Monaco Editor - takes remaining space */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
      </div>

      {/* File info bar - fixed height at bottom */}
      <div
        style={{
          background: '#252526',
          borderTop: '1px solid #333',
          padding: '4px 12px',
          fontSize: '11px',
          color: '#888',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div>{file.relativePath || filePath}</div>
        <div>
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
});

export default EditorTab;
