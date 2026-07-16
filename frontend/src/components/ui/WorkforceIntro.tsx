import { useAppStore } from '../../stores/appStore';
import { computeRoi, fmtCNY } from '../../sim/roi';
import styles from './WorkforceIntro.module.css';

/* ═══════════════════════════════════════════════
   WorkforceIntro — 数字员工天团上岗 opening overlay

   The 路演 opener: introduces the five digital
   employees and leads with the headline ROI so the
   产业价值 lands in the first five seconds, before the
   3D twin is even touched.
   ═══════════════════════════════════════════════ */

const CREW = [
  { icon: '📋', name: '单证数字员工', desc: '订舱报关 · 箱单标准化', color: 'var(--color-ocean)' },
  { icon: '📦', name: '配载数字员工', desc: '智能配载 · 装载优化', color: 'var(--color-crane)' },
  { icon: '🛡️', name: '安全数字员工', desc: '重心校验 · 合规拦截', color: 'var(--color-safety)' },
  { icon: '🚦', name: '调度数字员工', desc: '设备协同 · 序列编排', color: 'var(--color-agv)' },
  { icon: '⚡', name: '执行数字员工', desc: '指令下发 · 闭环回传', color: 'var(--color-exec)' },
];

const roi = computeRoi();

export function WorkforceIntro() {
  const open = useAppStore((s) => s.introOpen);
  const dismiss = useAppStore((s) => s.dismissIntro);
  const openRoi = useAppStore((s) => s.openRoiPanel);

  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>智慧港口数字孪生 · SMARTPORT DIGITAL WORKFORCE</div>
        <h1 className={styles.title}>数字员工天团 · 上岗</h1>
        <p className={styles.lead}>
          一支 <b>7×24 永不换班</b> 的港口 AI 班组，覆盖 单证 → 配载 → 安全 → 调度 → 执行 集装箱进出口全流程
        </p>

        <div className={styles.crew}>
          {CREW.map((c) => (
            <div key={c.name} className={styles.member} style={{ ['--mc' as string]: c.color }}>
              <span className={styles.mIcon}>{c.icon}</span>
              <div className={styles.mName}>{c.name}</div>
              <div className={styles.mDesc}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <b>{fmtCNY(roi.annualBenefit)}</b><span>年化综合效益</span>
          </div>
          <div className={styles.stat}>
            <b>{roi.paybackMonths.toFixed(1)} 个月</b><span>投资回收期</span>
          </div>
          <div className={styles.stat}>
            <b>{roi.fteReduced} 个岗位</b><span>7×24 减负</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={dismiss}>进入数字孪生驾驶舱 →</button>
          <button
            className={styles.secondary}
            onClick={() => {
              dismiss();
              openRoi();
            }}
          >
            查看降本增效测算
          </button>
        </div>
      </div>
    </div>
  );
}
