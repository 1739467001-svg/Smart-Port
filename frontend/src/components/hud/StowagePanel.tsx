import { useAppStore } from '../../stores/appStore';
import type { LoadPlan } from '../../sim/stowageOptimizer';
import styles from './StowagePanel.module.css';

/* ═══════════════════════════════════════════════
   StowagePanel — L3 manual-vs-AI stowage control

   The visible face of the 堆叠 OC optimizer. Flipping
   the toggle rebuilds the container scene with the other
   plan, so the cargo re-stacks and the CoG marker moves
   (critical → safe) in real time. All numbers come from
   the real optimiser, not constants.
   ═══════════════════════════════════════════════ */

const fmtPct = (v: number) => (v * 100).toFixed(1) + '%';

const RISK_LABEL: Record<string, string> = { safe: '安全', warning: '警戒', critical: '危险' };
const RISK_COLOR: Record<string, string> = { safe: '#2ecc71', warning: '#f2a623', critical: '#e74c3c' };

export function StowagePanel() {
  const mode = useAppStore((s) => s.stowageMode);
  const setMode = useAppStore((s) => s.setStowageMode);
  const baseline = useAppStore((s) => s.stowageBaseline);
  const optimized = useAppStore((s) => s.stowageOptimized);

  const plan: LoadPlan = mode === 'ai' ? optimized : baseline;
  const loaded = plan.placements.length;
  const total = loaded + plan.leftOut.length;
  const risk = plan.cog.riskLevel;
  const utilGain = (optimized.utilization - baseline.utilization) * 100;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.icon}>🦞</span>
        <div>
          <div className={styles.title}>配载优化 · STOWAGE</div>
          <div className={styles.sub}>堆叠 OC · Lobster Agent</div>
        </div>
      </div>

      <div className={styles.toggle}>
        <button
          className={`${styles.tab} ${mode === 'manual' ? styles.tabActiveManual : ''}`}
          onClick={() => setMode('manual')}
        >
          传统人工
        </button>
        <button
          className={`${styles.tab} ${mode === 'ai' ? styles.tabActiveAi : ''}`}
          onClick={() => setMode('ai')}
        >
          AI 优化
        </button>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.val} style={{ color: 'var(--color-ocean)' }}>{fmtPct(plan.utilization)}</div>
          <div className={styles.lbl}>容积利用率</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.val} style={{ color: RISK_COLOR[risk] }}>{plan.cogRatio.toFixed(2)}</div>
          <div className={styles.lbl}>重心偏移比 ≤1 安全</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.val} style={{ color: RISK_COLOR[risk] }}>● {RISK_LABEL[risk]}</div>
          <div className={styles.lbl}>稳性风险</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.val}>
            {loaded}
            <span className={styles.dim}>/{total}</span>
          </div>
          <div className={styles.lbl}>已装 / 总箱</div>
        </div>
      </div>

      <div className={styles.foot}>
        {mode === 'ai'
          ? `AI 较人工配载利用率 +${utilGain.toFixed(1)} 个百分点，并把重心拉回安全区`
          : '人工配载：重心严重偏移，存在倾覆与翻箱风险'}
      </div>
    </div>
  );
}
