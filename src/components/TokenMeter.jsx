import React, { useMemo } from 'react';
import { Tooltip, Progress } from 'antd';
import { ThunderboltOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useClaude } from '../contexts/ClaudeContext';
import { ALL_MODELS, formatCost } from '../utils/constants';

/**
 * TokenMeter - Real-time token usage display
 *
 * Shows:
 * - Context window usage (used/total with progress bar)
 * - Session statistics (total tokens, cost)
 * - Performance metrics (tokens/second for last response)
 *
 * This is a core Context Kiln feature for token budget management.
 */
function TokenMeter() {
  const {
    messages,
    currentModel,
    currentProvider,
    contextFiles,
    isStreaming,
  } = useClaude();

  // Get model info for context window size
  const modelInfo = ALL_MODELS[currentModel] || {
    contextWindow: 200000, // Default fallback
    pricing: { inputPerMToken: 0, outputPerMToken: 0 },
  };

  // Calculate session totals from all messages
  const sessionStats = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let lastResponseTokens = 0;
    let lastResponseTime = null;
    let lastTokensPerSecond = null;

    for (const msg of messages) {
      if (msg.tokens) {
        if (msg.role === 'user') {
          totalInputTokens += msg.tokens.input || msg.tokens.inputTokens || 0;
        } else if (msg.role === 'assistant') {
          const outputTokens = msg.tokens.output || msg.tokens.outputTokens || 0;
          totalOutputTokens += outputTokens;

          // Track last response for performance metrics
          if (!msg.isStreaming) {
            lastResponseTokens = outputTokens;

            // Calculate tokens/second if we have timing info
            if (msg.startTime && msg.endTime) {
              const durationSec = (msg.endTime - msg.startTime) / 1000;
              if (durationSec > 0) {
                lastTokensPerSecond = Math.round(outputTokens / durationSec);
              }
            } else if (msg.durationMs) {
              const durationSec = msg.durationMs / 1000;
              if (durationSec > 0) {
                lastTokensPerSecond = Math.round(outputTokens / durationSec);
              }
            }
          }
        }
      }

      if (msg.cost) {
        totalCost += msg.cost;
      }
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      lastResponseTokens,
      lastTokensPerSecond,
    };
  }, [messages]);

  // Estimate current context size (files + recent messages)
  const estimatedContextTokens = useMemo(() => {
    // Rough estimation: 4 chars per token
    const CHARS_PER_TOKEN = 4;
    const FILE_OVERHEAD = 75; // Formatting overhead per file

    let tokens = 0;

    // Count context files
    for (const file of contextFiles) {
      if (file.content) {
        tokens += Math.ceil(file.content.length / CHARS_PER_TOKEN) + FILE_OVERHEAD;
      }
    }

    // Count recent messages (last 5 for context)
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.content) {
        tokens += Math.ceil(msg.content.length / CHARS_PER_TOKEN);
      }
    }

    return tokens;
  }, [contextFiles, messages]);

  // Calculate context window usage percentage
  const contextUsagePercent = Math.min(
    100,
    Math.round((estimatedContextTokens / modelInfo.contextWindow) * 100)
  );

  // Determine status color based on usage
  const getStatusColor = (percent) => {
    if (percent >= 90) return '#f5222d'; // Red - critical
    if (percent >= 70) return '#fa8c16'; // Orange - warning
    if (percent >= 50) return '#fadb14'; // Yellow - caution
    return '#52c41a'; // Green - healthy
  };

  const statusColor = getStatusColor(contextUsagePercent);

  // Format large numbers
  const formatTokens = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '6px 12px',
        background: '#252526',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#999',
      }}
    >
      {/* Context Window Meter */}
      <Tooltip
        title={
          <div>
            <div><strong>Context Window Usage</strong></div>
            <div>Used: ~{formatTokens(estimatedContextTokens)} tokens</div>
            <div>Available: {formatTokens(modelInfo.contextWindow)} tokens</div>
            <div>Remaining: ~{formatTokens(modelInfo.contextWindow - estimatedContextTokens)} tokens</div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
              Note: Estimate based on content. Actual may vary ±10%.
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
          <span style={{ color: '#666' }}>Context:</span>
          <Progress
            percent={contextUsagePercent}
            size="small"
            strokeColor={statusColor}
            trailColor="#3c3c3c"
            showInfo={false}
            style={{ width: '80px', margin: 0 }}
          />
          <span style={{ color: statusColor, fontWeight: 500 }}>
            {contextUsagePercent}%
          </span>
        </div>
      </Tooltip>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: '#444' }} />

      {/* Session Tokens */}
      <Tooltip
        title={
          <div>
            <div><strong>Session Token Usage</strong></div>
            <div>Input: {formatTokens(sessionStats.totalInputTokens)} tokens</div>
            <div>Output: {formatTokens(sessionStats.totalOutputTokens)} tokens</div>
            <div>Total: {formatTokens(sessionStats.totalTokens)} tokens</div>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ThunderboltOutlined style={{ color: '#666' }} />
          <span>
            {formatTokens(sessionStats.totalTokens)} tok
          </span>
        </div>
      </Tooltip>

      {/* Cost (only show if non-zero) */}
      {sessionStats.totalCost > 0 && (
        <Tooltip title={`Session cost: ${formatCost(sessionStats.totalCost)}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarOutlined style={{ color: '#666' }} />
            <span>{formatCost(sessionStats.totalCost)}</span>
          </div>
        </Tooltip>
      )}

      {/* Performance (tokens/sec) - show if available */}
      {sessionStats.lastTokensPerSecond && !isStreaming && (
        <>
          <div style={{ width: '1px', height: '16px', background: '#444' }} />
          <Tooltip
            title={
              <div>
                <div><strong>Last Response Performance</strong></div>
                <div>{sessionStats.lastResponseTokens} tokens generated</div>
                <div>{sessionStats.lastTokensPerSecond} tokens/second</div>
              </div>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#52c41a' }}>
              <ClockCircleOutlined />
              <span>{sessionStats.lastTokensPerSecond} tok/s</span>
            </div>
          </Tooltip>
        </>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <>
          <div style={{ width: '1px', height: '16px', background: '#444' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1890ff' }}>
            <span className="streaming-dot" />
            <span>Streaming...</span>
          </div>
        </>
      )}
    </div>
  );
}

export default TokenMeter;
