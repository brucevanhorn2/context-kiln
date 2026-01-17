/**
 * Context Kiln Constants
 *
 * Central location for:
 * - Model pricing and specifications
 * - Token limits and thresholds
 * - Default settings
 * - File type mappings
 */

// ============================================================================
// AI PROVIDER MODELS
// ============================================================================

/**
 * Anthropic (Claude) models
 * Pricing as of January 2026
 */
export const ANTHROPIC_MODELS = {
  'claude-opus-4-5-20251101': {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      inputPerMToken: 15.00,   // $15 per million input tokens
      outputPerMToken: 75.00,  // $75 per million output tokens
    },
    description: 'Most powerful model, best for complex tasks',
    recommended: false,
  },
  'claude-3-7-sonnet-20250219': {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      inputPerMToken: 3.00,
      outputPerMToken: 15.00,
    },
    description: 'Balanced performance and cost',
    recommended: false,
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude Sonnet 3.5',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      inputPerMToken: 3.00,
      outputPerMToken: 15.00,
    },
    description: 'Balanced performance and cost (slightly older)',
    recommended: true, // Default recommended model
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      inputPerMToken: 0.80,
      outputPerMToken: 4.00,
    },
    description: 'Fastest and most cost-effective',
    recommended: false,
  },
};

/**
 * OpenAI (GPT) models
 * Pricing as of January 2026
 */
export const OPENAI_MODELS = {
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    pricing: {
      inputPerMToken: 10.00,
      outputPerMToken: 30.00,
    },
    description: 'Latest GPT-4 with vision',
    recommended: true,
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    pricing: {
      inputPerMToken: 30.00,
      outputPerMToken: 60.00,
    },
    description: 'Original GPT-4',
    recommended: false,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16384,
    pricing: {
      inputPerMToken: 0.50,
      outputPerMToken: 1.50,
    },
    description: 'Fast and cost-effective',
    recommended: false,
  },
};

/**
 * Ollama (Local) models
 * No API costs - runs locally
 */
export const OLLAMA_MODELS = {
  'llama3.1': {
    id: 'llama3.1',
    name: 'Llama 3.1',
    provider: 'ollama',
    contextWindow: 8192,
    pricing: {
      inputPerMToken: 0,
      outputPerMToken: 0,
    },
    description: 'Local - Meta Llama 3.1',
    recommended: true,
  },
  'codellama': {
    id: 'codellama',
    name: 'Code Llama',
    provider: 'ollama',
    contextWindow: 16384,
    pricing: {
      inputPerMToken: 0,
      outputPerMToken: 0,
    },
    description: 'Local - Specialized for code',
    recommended: false,
  },
  'mistral': {
    id: 'mistral',
    name: 'Mistral',
    provider: 'ollama',
    contextWindow: 8192,
    pricing: {
      inputPerMToken: 0,
      outputPerMToken: 0,
    },
    description: 'Local - Mistral AI model',
    recommended: false,
  },
};

/**
 * LM Studio (Local) models
 * No API costs - runs locally via LM Studio
 */
export const LMSTUDIO_MODELS = {
  'local-model': {
    id: 'local-model',
    name: 'Local Model',
    provider: 'lmstudio',
    contextWindow: 8192,
    pricing: {
      inputPerMToken: 0,
      outputPerMToken: 0,
    },
    description: 'Local - Any model loaded in LM Studio',
    recommended: true,
  },
};

/**
 * Local (Embedded) Models - Phase E
 * GGUF files loaded directly via node-llama-cpp
 */
export const LOCAL_MODELS = {
  'no-model-loaded': {
    id: 'no-model-loaded',
    name: 'No Model Loaded',
    provider: 'local',
    contextWindow: 0,
    pricing: {
      inputPerMToken: 0,
      outputPerMToken: 0,
    },
    description: 'Use File > Load Model to load a GGUF file',
    recommended: false,
  },
};

/**
 * All models combined
 */
export const ALL_MODELS = {
  ...ANTHROPIC_MODELS,
  ...OPENAI_MODELS,
  ...OLLAMA_MODELS,
  ...LMSTUDIO_MODELS,
  ...LOCAL_MODELS,
};

// ============================================================================
// TOKEN LIMITS AND THRESHOLDS
// ============================================================================

/**
 * Token limits and warning thresholds
 */
export const TOKEN_LIMITS = {
  // Maximum context to send (leave room for response)
  MAX_CONTEXT_TOKENS: 150000,

  // Warning threshold (80% of max)
  WARNING_THRESHOLD: 120000,

  // Danger threshold (90% of max)
  DANGER_THRESHOLD: 135000,

  // Automatic archive threshold (trigger archive when approaching limit)
  AUTO_ARCHIVE_THRESHOLD: 100000,

  // Rough estimate: characters per token
  CHARS_PER_TOKEN: 4,

  // Overhead for formatting per file (markdown, code blocks, etc.)
  FILE_FORMATTING_OVERHEAD: 75,
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS = {
  // AI Provider
  activeProvider: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-20241022',

  // Token Management
  maxContextTokens: TOKEN_LIMITS.MAX_CONTEXT_TOKENS,
  autoArchiveThreshold: TOKEN_LIMITS.AUTO_ARCHIVE_THRESHOLD,
  showTokenWarnings: true,

  // Layout
  layoutPreset: 'default', // 'default', 'horizontal', 'vertical'

  // Editor
  editorFontSize: 14,
  editorTheme: 'vs-dark',
  editorTabSize: 2,
  editorWordWrap: true,

  // Context
  includeLineNumbers: true,
  includeMetadata: true,
  contextFormat: 'markdown', // 'markdown', 'xml', 'plain'

  // Session
  createDefaultSession: true,
  defaultSessionName: 'General Development',
};

// ============================================================================
// LAYOUT PRESETS
// ============================================================================

/**
 * Layout preset configurations
 */
export const LAYOUT_PRESETS = {
  default: {
    id: 'default',
    name: 'Default (3-pane)',
    description: 'File tree | Chat/Editor | Context tools',
    panes: {
      fileTree: { visible: true, size: '20%', position: 'left' },
      chat: { visible: true, size: '55%', position: 'center' },
      editor: { visible: false, size: '0%', position: 'center' },
      contextTools: { visible: true, size: '25%', position: 'right' },
    },
  },
  horizontal: {
    id: 'horizontal',
    name: 'Horizontal Split',
    description: 'Chat above, editor below',
    panes: {
      fileTree: { visible: true, size: '20%', position: 'left' },
      chat: { visible: true, size: '50%', position: 'center-top' },
      editor: { visible: true, size: '50%', position: 'center-bottom' },
      contextTools: { visible: true, size: '25%', position: 'right' },
    },
  },
  vertical: {
    id: 'vertical',
    name: 'Vertical Split (Ultrawide)',
    description: 'All panes side by side',
    panes: {
      fileTree: { visible: true, size: '15%', position: 'left' },
      chat: { visible: true, size: '35%', position: 'center-left' },
      editor: { visible: true, size: '35%', position: 'center-right' },
      contextTools: { visible: true, size: '15%', position: 'right' },
    },
  },
  chatFocus: {
    id: 'chatFocus',
    name: 'Chat Focus',
    description: 'Maximize chat area',
    panes: {
      fileTree: { visible: true, size: '15%', position: 'left' },
      chat: { visible: true, size: '70%', position: 'center' },
      editor: { visible: false, size: '0%', position: 'center' },
      contextTools: { visible: true, size: '15%', position: 'right' },
    },
  },
  editorFocus: {
    id: 'editorFocus',
    name: 'Editor Focus',
    description: 'Maximize editor area',
    panes: {
      fileTree: { visible: true, size: '15%', position: 'left' },
      chat: { visible: false, size: '0%', position: 'center' },
      editor: { visible: true, size: '70%', position: 'center' },
      contextTools: { visible: true, size: '15%', position: 'right' },
    },
  },
};

// ============================================================================
// FILE TYPE LANGUAGE MAPPINGS
// ============================================================================

/**
 * File extension to Monaco Editor language mapping
 * Used for syntax highlighting
 */
export const FILE_LANGUAGE_MAP = {
  // JavaScript / TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Java / JVM
  java: 'java',
  kt: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',

  // C-family
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',

  // Other compiled
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  m: 'objective-c',

  // Scripting
  rb: 'ruby',
  php: 'php',
  pl: 'perl',
  lua: 'lua',
  r: 'r',

  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  bat: 'bat',
  cmd: 'bat',

  // Data / Config
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  conf: 'ini',

  // Markup
  md: 'markdown',
  markdown: 'markdown',
  rst: 'restructuredtext',
  tex: 'latex',

  // Database
  sql: 'sql',

  // Frameworks
  vue: 'vue',
  svelte: 'svelte',

  // Other
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  proto: 'protobuf',
};

/**
 * Get language for file extension
 *
 * @param {string} filename - File name or extension
 * @returns {string} Monaco language identifier
 */
export function getLanguageForFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_LANGUAGE_MAP[ext] || 'plaintext';
}

/**
 * Calculate cost from token usage
 *
 * @param {string} modelId - Model ID
 * @param {number} inputTokens - Input tokens used
 * @param {number} outputTokens - Output tokens used
 * @returns {number} Cost in USD
 */
export function calculateCost(modelId, inputTokens, outputTokens) {
  const model = ALL_MODELS[modelId];

  if (!model || !model.pricing) {
    return 0;
  }

  const inputCost = (inputTokens / 1000000) * model.pricing.inputPerMToken;
  const outputCost = (outputTokens / 1000000) * model.pricing.outputPerMToken;

  return inputCost + outputCost;
}

/**
 * Format cost as string
 *
 * @param {number} costUsd - Cost in USD
 * @returns {string} Formatted cost (e.g., "$0.0234" or "$0.00")
 */
export function formatCost(costUsd) {
  if (costUsd === 0) {
    return '$0.00';
  }

  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }

  return `$${costUsd.toFixed(2)}`;
}
