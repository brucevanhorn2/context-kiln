// This file runs in the Electron main process and scans directories
// It will be called via IPC from the renderer process

const fs = require('fs');
const path = require('path');

// List of directories to ignore
const ignoredDirs = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.cache',
  '.venv',
  '__pycache__',
  '.egg-info',
]);

// List of files to ignore
const ignoredFiles = new Set([
  '.DS_Store',
  'Thumbs.db',
  '.env.local',
]);

function shouldIgnore(name, isDirectory) {
  if (isDirectory && ignoredDirs.has(name)) {
    return true;
  }
  if (!isDirectory && ignoredFiles.has(name)) {
    return true;
  }
  // Ignore hidden files/folders starting with . except for common config files
  if (name.startsWith('.') && !['gitignore', 'env', 'eslintrc', 'prettierrc', 'babelrc'].includes(name.substring(1))) {
    return true;
  }
  return false;
}

function getFileIcon(filename) {
  // Return icon data as string to pass via IPC
  const ext = path.extname(filename).toLowerCase();

  const iconMap = {
    '.js': 'javascript',
    '.jsx': 'react',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.html': 'html',
    '.yaml': 'yaml',
    '.yml': 'yaml',
  };

  if (filename === 'package.json') return 'json';
  if (filename === '.gitignore') return 'git';

  return iconMap[ext] || 'file';
}

function scanDirectory(dirPath, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => !shouldIgnore(entry.name, entry.isDirectory()))
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const key = fullPath.replace(/\\/g, '/'); // Normalize path for keys

        const node = {
          title: entry.name,
          key,
          isFile: entry.isFile(),
          filePath: fullPath,
        };

        if (entry.isDirectory()) {
          node.children = scanDirectory(fullPath, maxDepth, currentDepth + 1);
          node.children = node.children.length > 0 ? node.children : undefined;
        } else {
          node.icon = getFileIcon(entry.name);
        }

        return node;
      })
      .sort((a, b) => {
        // Directories first, then files, both alphabetically
        if ((a.children !== undefined) !== (b.children !== undefined)) {
          return (b.children !== undefined) - (a.children !== undefined);
        }
        return a.title.localeCompare(b.title);
      });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

module.exports = { scanDirectory };
