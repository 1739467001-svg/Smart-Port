import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { AgentType } from '../../types';
import styles from './AgentPanel.module.css';

const AGENT_ICONS: Record<AgentType, string> = {
  data: '📋',
  stowage: '📦',
  safety: '🛡️',
  dispatch: '🚦',
  execution: '⚡',
};

const AGENT_COLORS: Record<AgentType, string> = {
  data: 'var(--color-ocean)',
  stowage: 'var(--color-crane)',
  safety: 'var(--color-safety)',
  dispatch: 'var(--color-agv)',
  execution: 'var(--color-exec)',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#5dcaa5',
  computing: '#f2a623',
  monitoring: '#3b8bd4',
  standby: '#666',
  error: '#e8593c',
};

const AGENT_DETAILS: Record<AgentType, string> = {
  data: '实时监听订单网关，已处理 2,847 条箱单数据。当前正在清洗第 F-2024-0892 批次…',
  stowage: '智能配载引擎运算中：Bay #7 第 12,847 次空间推演。当前最优利用率 87.3%…',
  safety: '三维重心监控正常。CoG 偏移 [x: 0.3m, y: 0.1m] 在安全阈值内。无否决事件。',
  dispatch: '协调 3 台岸桥 + 6 台 AGV。当前调度效率 94.2%，无资源冲突。',
  execution: '待命。上一批指令 #D-0891 已下发至 ARMG-03 和 AGV-05。等待新共识…',
};

interface CommLog {
  from: string;
  to: string;
  msg: string;
  time: string;
  color: string;
}

const INITIAL_LOGS: CommLog[] = [
  { from: '配载员工', to: '安全员工', msg: 'Bay#7 方案 v12847 提交审查', time: '00:03', color: 'var(--color-crane)' },
  { from: '安全员工', to: '配载员工', msg: 'CoG 通过 ✓ 方案批准', time: '00:03', color: 'var(--color-safety)' },
  { from: '调度员工', to: '执行员工', msg: '共识达成，执行 Bay#7', time: '00:02', color: 'var(--color-agv)' },
  { from: '执行员工', to: 'ARMG-03', msg: '指令集 #D-0892 已下发', time: '00:01', color: 'var(--color-exec)' },
  { from: '单证员工', to: 'ALL', msg: '新批次 F-0893 数据就绪', time: 'NOW', color: 'var(--color-ocean)' },
];

export function AgentPanel() {
  const agents = useAppStore((s) => s.agents);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const selectAgent = useAppStore((s) => s.selectAgent);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const [logs] = useState<CommLog[]>(INITIAL_LOGS);

  if (!rightPanelOpen) return null;

  return (
    <aside className={styles.panel}>
      <div className={styles.sectionTitle}>数字员工 · DIGITAL WORKFORCE</div>

      {agents.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        const color = AGENT_COLORS[agent.type];

        return (
          <div
            key={agent.id}
            className={`${styles.agentCard} ${isSelected ? styles.agentCardActive : ''}`}
            style={{
              borderLeftColor: isSelected ? color : 'transparent',
              background: isSelected ? color + '0a' : undefined,
            }}
            onClick={() => selectAgent(isSelected ? null : agent.id)}
          >
            <div className={styles.agentHeader}>
              <span className={styles.agentIcon}>{AGENT_ICONS[agent.type]}</span>
              <span className={styles.agentName} style={{ color }}>
                {agent.name}
              </span>
              <span
                className={styles.statusDot}
                style={{
                  background: STATUS_COLORS[agent.status],
                  boxShadow: `0 0 6px ${STATUS_COLORS[agent.status]}`,
                }}
              />
            </div>
            <div className={styles.agentRole}>{agent.role}</div>

            {isSelected && (
              <div className={styles.agentDetail} style={{ borderTopColor: color + '22' }}>
                {AGENT_DETAILS[agent.type]}
              </div>
            )}
          </div>
        );
      })}

      {/* Communication Log */}
      <div className={styles.logSection}>
        <div className={styles.sectionTitle}>数字员工协同 · COMM LOG</div>
        {logs.map((log, i) => (
          <div key={i} className={styles.logEntry} style={{ borderLeftColor: log.color + '44' }}>
            <div className={styles.logFrom} style={{ color: log.color }}>
              {log.from} → {log.to}
            </div>
            <div className={styles.logMsg}>{log.msg}</div>
            <div className={styles.logTime}>{log.time}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
