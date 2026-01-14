import React from 'react';
import {
  FileOutlined,
  FolderOutlined,
  JavaScriptOutlined,
  PythonOutlined,
  FileTextOutlined,
  FileImageOutlined,
  FileZipOutlined,
} from '@ant-design/icons';

const fileTypeIcons = {
  // Web/JavaScript
  '.js': <JavaScriptOutlined style={{ color: '#f7df1e' }} />,
  '.jsx': <JavaScriptOutlined style={{ color: '#61dafb' }} />,
  '.ts': <FileOutlined style={{ color: '#3178c6' }} />,
  '.tsx': <FileOutlined style={{ color: '#3178c6' }} />,
  '.mjs': <JavaScriptOutlined style={{ color: '#f7df1e' }} />,

  // CSS/Styling
  '.css': <FileOutlined style={{ color: '#563d7c' }} />,
  '.scss': <FileOutlined style={{ color: '#c6538c' }} />,
  '.sass': <FileOutlined style={{ color: '#c6538c' }} />,
  '.less': <FileOutlined style={{ color: '#1d365d' }} />,

  // Markup
  '.html': <FileOutlined style={{ color: '#e34c26' }} />,
  '.xml': <FileOutlined style={{ color: '#0b7261' }} />,
  '.svg': <FileImageOutlined style={{ color: '#ffb13d' }} />,

  // Data Formats
  '.json': <FileOutlined style={{ color: '#fcdc00' }} />,
  '.yaml': <FileOutlined style={{ color: '#cb171e' }} />,
  '.yml': <FileOutlined style={{ color: '#cb171e' }} />,
  '.toml': <FileOutlined style={{ color: '#b0b000' }} />,

  // Python
  '.py': <PythonOutlined style={{ color: '#3776ab' }} />,
  '.pyx': <PythonOutlined style={{ color: '#3776ab' }} />,

  // Backend
  '.php': <FileOutlined style={{ color: '#777bb4' }} />,
  '.go': <FileOutlined style={{ color: '#00add8' }} />,
  '.rs': <FileOutlined style={{ color: '#ce422b' }} />,
  '.rb': <FileOutlined style={{ color: '#cc342d' }} />,
  '.java': <FileOutlined style={{ color: '#007396' }} />,
  '.c': <FileOutlined style={{ color: '#a8b9cc' }} />,
  '.cpp': <FileOutlined style={{ color: '#f34b7d' }} />,

  // Documentation
  '.md': <FileTextOutlined style={{ color: '#083fa1' }} />,
  '.markdown': <FileTextOutlined style={{ color: '#083fa1' }} />,
  '.txt': <FileTextOutlined style={{ color: '#999999' }} />,
  '.pdf': <FileOutlined style={{ color: '#f40000' }} />,

  // Archives
  '.zip': <FileZipOutlined style={{ color: '#d97706' }} />,
  '.tar': <FileZipOutlined style={{ color: '#d97706' }} />,
  '.gz': <FileZipOutlined style={{ color: '#d97706' }} />,
  '.rar': <FileZipOutlined style={{ color: '#d97706' }} />,

  // Images
  '.png': <FileImageOutlined style={{ color: '#4b7bec' }} />,
  '.jpg': <FileImageOutlined style={{ color: '#4b7bec' }} />,
  '.jpeg': <FileImageOutlined style={{ color: '#4b7bec' }} />,
  '.gif': <FileImageOutlined style={{ color: '#4b7bec' }} />,
  '.webp': <FileImageOutlined style={{ color: '#4b7bec' }} />,

  // Config
  '.env': <FileOutlined style={{ color: '#9ca3af' }} />,
  '.gitignore': <FileOutlined style={{ color: '#f34f29' }} />,
  '.eslintrc': <FileOutlined style={{ color: '#4b32c3' }} />,
  '.prettierrc': <FileOutlined style={{ color: '#1a202c' }} />,
  'package.json': <FileOutlined style={{ color: '#cb3837' }} />,
  'package-lock.json': <FileOutlined style={{ color: '#cb3837' }} />,
};

export function getFileIcon(filename) {
  const extension = '.' + filename.split('.').pop().toLowerCase();
  const fullName = filename.toLowerCase();

  // Check for full filename match first (for special files like package.json)
  if (fileTypeIcons[fullName]) {
    return fileTypeIcons[fullName];
  }

  // Then check by extension
  if (fileTypeIcons[extension]) {
    return fileTypeIcons[extension];
  }

  // Default icon
  return <FileOutlined style={{ color: '#999999' }} />;
}

export function getFolderIcon() {
  return <FolderOutlined style={{ color: '#dcb239' }} />;
}

export default { getFileIcon, getFolderIcon };
