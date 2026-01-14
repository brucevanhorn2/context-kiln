// Map file extensions to colors matching the file icons
// Using darker colors for better contrast with white text
const fileColorMap = {
  // Web/JavaScript
  '.js': '#d4a01a',
  '.jsx': '#0a8db8',
  '.ts': '#1f5ba3',
  '.tsx': '#1f5ba3',
  '.mjs': '#d4a01a',

  // CSS/Styling
  '.css': '#3a2655',
  '.scss': '#704050',
  '.sass': '#704050',
  '.less': '#1a2a40',

  // Markup
  '.html': '#8b2914',
  '.xml': '#053a38',
  '.svg': '#996600',

  // Data Formats
  '.json': '#997700',
  '.yaml': '#7a0d12',
  '.yml': '#7a0d12',
  '.toml': '#6b6a00',

  // Python
  '.py': '#1f4666',
  '.pyx': '#1f4666',

  // Backend
  '.php': '#3e4661',
  '.go': '#007a8a',
  '.rs': '#7a2616',
  '.rb': '#7a1e1b',
  '.java': '#003a4a',
  '.c': '#556375',
  '.cpp': '#8b1a3a',

  // Documentation
  '.md': '#051d5a',
  '.markdown': '#051d5a',
  '.txt': '#555555',
  '.pdf': '#990000',

  // Archives
  '.zip': '#7a4202',
  '.tar': '#7a4202',
  '.gz': '#7a4202',
  '.rar': '#7a4202',

  // Images
  '.png': '#2a4980',
  '.jpg': '#2a4980',
  '.jpeg': '#2a4980',
  '.gif': '#2a4980',
  '.webp': '#2a4980',

  // Config
  '.env': '#5a5f66',
  '.gitignore': '#8b2a14',
  '.eslintrc': '#2a1b74',
  '.prettierrc': '#0f1419',
  'package.json': '#7a1f1f',
  'package-lock.json': '#7a1f1f',
};

const folderColor = '#8b7a1f';
const defaultColor = '#666666';

export function getFileColor(filename) {
  const extension = '.' + filename.split('.').pop().toLowerCase();
  const fullName = filename.toLowerCase();

  // Check for full filename match first
  if (fileColorMap[fullName]) {
    return fileColorMap[fullName];
  }

  // Then check by extension
  if (fileColorMap[extension]) {
    return fileColorMap[extension];
  }

  // Default color
  return defaultColor;
}

export function getFolderColor() {
  return folderColor;
}

export default { getFileColor, getFolderColor };
