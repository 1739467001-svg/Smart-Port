import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { AgentType } from '../../types';
import { PROCESS_STAGES } from '../../sim/processModel';
import styles from './AgentDetail.module.css';

/* ═══════════════════════════════════════════════
   AgentDetail — 数字员工 detail page (L2 for digital employees)

   Opens when a 数字员工 marker (the glowing "eye") is clicked
   in the port scene. Shows the agent's mission, the
   lifecycle stages it owns (with live in-transit counts),
   its live metrics and filtered comms.
   ═══════════════════════════════════════════════ */

const ICONS: Record<AgentType, string> = {
  data: '📋', stowage: '📦', safety: '🛡️', dispatch: '🚦', execution: '⚡',
};
const COLORS: Record<AgentType, string> = {
  data: 'var(--color-ocean)', stowage: 'var(--color-crane)', safety: 'var(--color-safety)',
  dispatch: 'var(--color-agv)', execution: 'var(--color-exec)',
};
const TYPE_NAME: Record<AgentType, string> = {
  data: '单证', stowage: '配载', safety: '安全', dispatch: '调度', execution: '执行',
};
const STATUS_LABEL: Record<string, string> = {
  active: '运行中', computing: '推演中', monitoring: '监控中', standby: '待命', error: '异常',
};
const STATUS_COLOR: Record<string, string> = {
  active: '#5dcaa5', computing: '#f2a623', monitoring: '#3b8bd4', standby: '#888', error: '#e8593c',
};

const MISSION: Record<AgentType, { tagline: string; duties: string[] }> = {
  data: { tagline: '单证与数据中枢', duties: ['订舱 / 配舱信息接入', '报关 · 海关数据校验', '箱单 EDI 解析与标准化', '为下游数字员工提供干净数据'] },
  stowage: { tagline: '智能配载引擎 · 空间推演', duties: ['堆场箱位规划', '配载计划 BAPLIE 生成', '堆叠顺序 / 翻箱最小化', '装载利用率优化'] },
  safety: { tagline: '安全与合规守门人', duties: ['VGM 过磅核验', '三维重心 CoG 计算', '危品 / 超限拦截', '不安全方案否决'] },
  dispatch: { tagline: '设备调度协调官', duties: ['岸桥 / 轨道吊 / AGV 协同', '作业序列编排', '资源冲突消解', '调度效率优化'] },
  execution: { tagline: '指令执行末端', duties: ['向自动化设备下发指令', '执行状态回传', '异常上报', '闭环确认'] },
};

const METRIC_LABEL: Record<string, string> = {
  processed: '已处理箱单', pending: '待处理', iterations: '推演次数', bestUtilization: '最优利用率 %',
  checksCompleted: '已校验', vetoes: '否决数', tasksAssigned: '派发任务', efficiency: '调度效率 %',
  instructionsSent: '已下发指令', successRate: '成功率 %',
};

const routeLabel = (t: AgentType | 'ALL') => (t === 'ALL' ? 'ALL' : `${TYPE_NAME[t]}员工`);

export function AgentDetail() {
  const agentDetailId = useAppStore((s) => s.agentDetailId);
  const closeAgentDetail = useAppStore((s) => s.closeAgentDetail);
  const agents = useAppStore((s) => s.agents);
  const counts = useAppStore((s) => s.processCounts);
  const messages = useAppStore((s) => s.agentMessages);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAgentDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAgentDetail]);

  if (!agentDetailId) return null;
  const agent = agents.find((a) => a.id === agentDetailId);
  if (!agent) return null;

  const color = COLORS[agent.type];
  const mission = MISSION[agent.type];
  const ownedStages = PROCESS_STAGES.map((st, i) => ({ st, i })).filter(({ st }) => st.owner === agent.type);
  const agentMsgs = messages.filter((m) => m.from === agent.type || m.to === agent.type).slice(0, 8);

  return (
    <div className={styles.backdrop} onClick={closeAgentDetail}>
      <div
        className={styles.page}
        style={{ ['--c' as string]: color }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.close} onClick={closeAgentDetail}>← 返回全港</button>

        <header className={styles.header}>
          <span className={styles.icon}>{ICONS[agent.type]}</span>
          <div className={styles.titleBlock}>
            <div className={styles.name}>{agent.name}</div>
            <div className={styles.role}>{agent.role} · {mission.tagline}</div>
          </div>
          <span
            className={styles.status}
            style={{ color: STATUS_COLOR[agent.status], borderColor: STATUS_COLOR[agent.status] + '55' }}
          >
            ● {STATUS_LABEL[agent.status] ?? agent.status}
          </span>
        </header>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>职责 RESPONSIBILITIES</div>
            <ul className={styles.duties}>
              {mission.duties.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>实时指标 LIVE METRICS</div>
            <div className={styles.metrics}>
              {Object.entries(agent.metrics).map(([k, v]) => (
                <div key={k} className={styles.metric}>
                  <div className={styles.metricVal}>
                    {typeof v === 'number' ? v.toLocaleString() : v}
                  </div>
                  <div className={styles.metricLabel}>{METRIC_LABEL[k] ?? k}</div>
                </div>
              ))}
            </div>
            {agent.lastAction && <div className={styles.lastAction}>最近动作 · {agent.lastAction}</div>}
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardTitle}>负责的全流程阶段 OWNED STAGES · 实时在途箱量</div>
            {ownedStages.length === 0 ? (
              <div className={styles.empty}>—</div>
            ) : (
              <div className={styles.stages}>
                {ownedStages.map(({ st, i }) => (
                  <div key={st.id} className={styles.stage}>
                    <div className={styles.stageCount}>{counts[i] ?? 0}</div>
                    <div className={styles.stageName}>{st.name}</div>
                    <div className={styles.stageZone}>
                      {st.phase === 'export' ? '出口' : '进口'} · {st.zone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardTitle}>通信日志 COMM LOG</div>
            {agentMsgs.length === 0 ? (
              <div className={styles.empty}>暂无相关消息，仿真运行后实时更新</div>
            ) : (
              <div className={styles.logs}>
                {agentMsgs.map((m) => (
                  <div key={m.id} className={styles.log}>
                    <span className={styles.logRoute}>
                      {routeLabel(m.from)} → {routeLabel(m.to)}
                    </span>
                    <span className={styles.logMsg}>{m.content}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.hint}>点击空白处 / 按 Esc / 顶部按钮 返回全港总览</div>
      </div>
    </div>
  );
}
