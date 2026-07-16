import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { AgentType } from '../../types';
import { computeRoi, fmtCNY, OPTIMIZER_EVIDENCE, DEFAULT_ROI_ASSUMPTIONS } from '../../sim/roi';
import styles from './RoiPanel.module.css';

/* ═══════════════════════════════════════════════
   RoiPanel — 数字员工降本增效测算 (ROI)

   Opened from the top bar. Turns the digital-workforce
   story into 产业价值 the judges can score: a headline
   KPI row, the REAL optimizer evidence, and a line-item
   breakdown where every ¥ carries its derivation formula.
   All numbers come from src/sim/roi.ts (unit-tested).
   ═══════════════════════════════════════════════ */

const OWNER_COLOR: Record<AgentType, string> = {
  data: 'var(--color-ocean)',
  stowage: 'var(--color-crane)',
  safety: 'var(--color-safety)',
  dispatch: 'var(--color-agv)',
  execution: 'var(--color-exec)',
};

const roi = computeRoi();
const a = DEFAULT_ROI_ASSUMPTIONS;
const wanTEU = (a.annualThroughputTEU / 1e4).toFixed(0);

export function RoiPanel() {
  const open = useAppStore((s) => s.roiPanelOpen);
  const close = useAppStore((s) => s.closeRoiPanel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!open) return null;

  const kpis = [
    { v: fmtCNY(roi.annualBenefit), l: '年化综合效益', hint: `按 ${wanTEU} 万 TEU/年` },
    { v: `${roi.paybackMonths.toFixed(1)} 个月`, l: '投资回收期', hint: `平台成本 ${fmtCNY(a.platformCostYear)}/年` },
    { v: `${roi.roiRatio.toFixed(1)}×`, l: '投资回报 ROI', hint: '年化效益 / 平台成本' },
    { v: `¥${roi.costPerTeuSaved.toFixed(1)}`, l: '单箱综合降本 /TEU', hint: '保守口径' },
  ];

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.page} onClick={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>数字员工 · 产业价值</div>
            <div className={styles.title}>
              <span className={styles.emoji}>📊</span> 降本增效测算 · ROI
            </div>
            <div className={styles.sub}>
              以一座年吞吐 {wanTEU} 万 TEU 的中型自动化码头保守测算 · 口径可调
            </div>
          </div>
          <button className={styles.close} onClick={close}>← 返回</button>
        </div>

        <div className={styles.kpis}>
          {kpis.map((k) => (
            <div key={k.l} className={styles.kpi}>
              <div className={styles.kpiVal}>{k.v}</div>
              <div className={styles.kpiLabel}>{k.l}</div>
              <div className={styles.kpiHint}>{k.hint}</div>
            </div>
          ))}
        </div>

        <div className={styles.evidence}>
          <span className={styles.evidenceTag}>L3 真实优化器实测</span>
          <span className={styles.evidenceItem}>
            配载利用率 <b>{OPTIMIZER_EVIDENCE.baseUtilPct}%</b> →{' '}
            <b className={styles.up}>{OPTIMIZER_EVIDENCE.optUtilPct}%</b> (+{OPTIMIZER_EVIDENCE.utilGainPP}pp)
          </span>
          <span className={styles.divider} />
          <span className={styles.evidenceItem}>
            重心偏移比 <b>{OPTIMIZER_EVIDENCE.cogRatioBefore}</b> →{' '}
            <b className={styles.up}>{OPTIMIZER_EVIDENCE.cogRatioAfter}</b> (危险→安全)
          </span>
          <span className={styles.divider} />
          <span className={styles.evidenceItem}>
            减负岗位 <b className={styles.up}>{roi.fteReduced}</b> 个 · 7×24
          </span>
        </div>

        <div className={styles.lines}>
          <div className={styles.linesTitle}>效益构成 · 每项均含推导公式</div>
          {roi.lines.map((ln) => (
            <div key={ln.key} className={styles.line}>
              <span
                className={styles.dot}
                style={{ background: OWNER_COLOR[ln.owner], boxShadow: `0 0 6px ${OWNER_COLOR[ln.owner]}` }}
              />
              <div className={styles.lineBody}>
                <div className={styles.lineLabel}>{ln.label}</div>
                <div className={styles.lineFormula}>{ln.formula}</div>
              </div>
              <div className={styles.lineVal}>
                {fmtCNY(ln.annualValue)}<span className={styles.perYear}>/年</span>
              </div>
            </div>
          ))}
          <div className={styles.total}>
            <span>年化综合效益</span>
            <span className={styles.totalVal}>
              {fmtCNY(roi.annualBenefit)}<span className={styles.perYear}>/年</span>
            </span>
          </div>
        </div>

        <div className={styles.foot}>
          * 均为保守假设，效益随码头吞吐量近似线性放大；单箱综合降本 ¥{roi.costPerTeuSaved.toFixed(1)}/TEU
          远低于行业装卸单价，留足安全边际。按 Esc 或点击空白处返回。
        </div>
      </div>
    </div>
  );
}
