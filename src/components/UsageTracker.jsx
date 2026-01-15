import React, { useState, useEffect } from 'react';
import { Tabs, Select, Spin } from 'antd';
import {
  DollarOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useUsageTracking } from '../contexts/UsageTrackingContext';

const { TabPane } = Tabs;

/**
 * UsageTracker - Display token usage and costs
 *
 * Features:
 * - View usage by project, session, API key, or globally
 * - Display token counts (input/output)
 * - Show costs in USD
 * - Request counts
 * - Time range filters (day/week/month/all)
 * - Per-model breakdown
 */
const UsageTracker = React.memo(function UsageTracker({ projectId, sessionId }) {
  const {
    projectUsage,
    sessionUsage,
    globalUsage,
    timeRange,
    isLoading,
    setCurrentProjectId,
    setCurrentSessionId,
    setTimeRangeAndRefresh,
  } = useUsageTracking();

  const [activeTab, setActiveTab] = useState('session');

  /**
   * Set current context IDs when component mounts
   */
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [projectId, sessionId, setCurrentProjectId, setCurrentSessionId]);

  /**
   * Format cost for display
   */
  const formatCost = (cost) => {
    if (!cost || cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  /**
   * Render usage stats
   */
  const renderUsageStats = (usage, title) => {
    if (isLoading) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Spin />
        </div>
      );
    }

    if (!usage) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          No usage data available
        </div>
      );
    }

    return (
      <div style={{ padding: '12px' }}>
        <h4 style={{ color: '#d4d4d4', margin: '0 0 16px 0', fontSize: '14px' }}>
          {title}
        </h4>

        {/* Summary Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Total Tokens
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0e639c' }}>
              {((usage.totalInputTokens || 0) + (usage.totalOutputTokens || 0)).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              In: {(usage.totalInputTokens || 0).toLocaleString()} • Out:{' '}
              {(usage.totalOutputTokens || 0).toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Total Cost
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
              {formatCost(usage.totalCost)}
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Requests
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4d4d4' }}>
              {usage.requestCount || 0}
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Avg per Request
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff9800' }}>
              {usage.requestCount > 0
                ? formatCost((usage.totalCost || 0) / usage.requestCount)
                : '$0.00'}
            </div>
          </div>
        </div>

        {/* Breakdown by Model */}
        {usage.byModel && Object.keys(usage.byModel).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#aaa',
              }}
            >
              By Model
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(usage.byModel).map(([modelId, modelUsage]) => (
                <div
                  key={modelId}
                  style={{
                    padding: '8px 12px',
                    background: '#2a2a2a',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      color: '#d4d4d4',
                    }}
                  >
                    {modelId}
                  </div>
                  <div
                    style={{
                      color: '#888',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {modelUsage.inputTokens?.toLocaleString() || 0} in •{' '}
                      {modelUsage.outputTokens?.toLocaleString() || 0} out
                    </span>
                    <span style={{ color: '#52c41a' }}>
                      {formatCost(modelUsage.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Time Range Filter */}
      {activeTab !== 'session' && (
        <div style={{ padding: '12px', paddingBottom: '8px' }}>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#888' }}>
            Time Range
          </div>
          <Select
            value={timeRange}
            onChange={setTimeRangeAndRefresh}
            style={{ width: '100%' }}
            size="small"
          >
            <Select.Option value="day">Last 24 Hours</Select.Option>
            <Select.Option value="week">Last 7 Days</Select.Option>
            <Select.Option value="month">Last 30 Days</Select.Option>
            <Select.Option value="all">All Time</Select.Option>
          </Select>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        style={{ flex: 1, overflow: 'hidden' }}
        tabBarStyle={{ paddingLeft: '12px', margin: 0 }}
      >
        <TabPane
          tab={
            <span>
              <ThunderboltOutlined /> Session
            </span>
          }
          key="session"
        >
          <div style={{ overflowY: 'auto', height: '100%' }}>
            {renderUsageStats(sessionUsage, 'Current Session Usage')}
          </div>
        </TabPane>

        <TabPane
          tab={
            <span>
              <ApiOutlined /> Project
            </span>
          }
          key="project"
        >
          <div style={{ overflowY: 'auto', height: '100%' }}>
            {renderUsageStats(projectUsage, 'Project Usage')}
          </div>
        </TabPane>

        <TabPane
          tab={
            <span>
              <GlobalOutlined /> Global
            </span>
          }
          key="global"
        >
          <div style={{ overflowY: 'auto', height: '100%' }}>
            {renderUsageStats(globalUsage, 'Global Usage')}
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
});

export default UsageTracker;
