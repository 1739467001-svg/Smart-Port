import { Fragment } from 'react';
import { useAppStore } from '../../stores/appStore';
import { PROCESS_STAGES, EXPORT_END } from '../../sim/processModel';
import type { AgentType } from '../../types';
import styles from './ProcessFlowBar.module.css';

/* ═══════════════════════════════════════════════
   ProcessFlowBar — container lifecycle dashboard

   The "digital" twin of the 3D physical flow: every
   lifecycle stage with its live in-transit count,
   coloured by the OC agent that owns it. Reads the
   process model from the store.
   ═══════════════════════════════════════════════ */

const AGENT_COLOR: Record<AgentType, string> = {
  data: 'var(--color-ocean)',
  lobster: 'var(--color-crane)',
  safety: 'var(--color-safety)',
  dispatch: 'var(--color-agv)',
  execution: 'var(--color-exec)',
};

export function ProcessFlowBar() {
  const counts = useAppStore((s) => s.processCounts);

  return (
    <div className={styles.bar}>
      <div className={styles.header}>
        <span className={styles.title}>集装箱全流程 · CONTAINER LIFECYCLE</span>
        <span className={styles.sub}>在途箱量 · 颜色 = 负责的 OC 智能体</span>
      </div>

      <div className={styles.track}>
        {PROCESS_STAGES.map((st, i) => (
          <Fragment key={st.id}>
            <div
              className={styles.stage}
              style={{ ['--c' as string]: AGENT_COLOR[st.owner] }}
            >
              <div className={styles.count}>{counts[i] ?? 0}</div>
              <div className={styles.name}>{st.name}</div>
              <div className={styles.zone}>{st.zone}</div>
            </div>

            {i < PROCESS_STAGES.length - 1 &&
              (i === EXPORT_END ? (
                <div className={styles.pivot}>
                  <span className={styles.ship}>🚢</span>
                  <span className={styles.pivotLabel}>海运</span>
                </div>
              ) : (
                <div className={styles.arrow}>›</div>
              ))}
          </Fragment>
        ))}
      </div>

      <div className={styles.phases}>
        <span className={styles.exportTag}>▸ 出口链 EXPORT</span>
        <span className={styles.importTag}>进口链 IMPORT ◂</span>
      </div>
    </div>
  );
}
