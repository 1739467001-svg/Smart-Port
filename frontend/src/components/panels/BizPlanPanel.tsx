import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { computeRoi, fmtCNY } from '../../sim/roi';
import {
  projectFinancials, ARPA, TARGETS, MARKET_TIERS, MARKET_NOTE, MODEL, GTM, MOAT,
  FUNDING, ROADMAP, COMMITMENTS, ACTION_PLAN,
} from '../../sim/bizplan';
import styles from './BizPlanPanel.module.css';

/* ═══════════════════════════════════════════════
   BizPlanPanel — 商业计划 & 落地承诺

   Feeds the finals-scoring sections (商业计划与成长性 +
   落地意愿). Economics reuse the ROI model so the whole
   pitch tells one number-consistent story.
   ═══════════════════════════════════════════════ */

const roi = computeRoi();
const fin = projectFinancials();

export function BizPlanPanel() {
  const open = useAppStore((s) => s.bizPanelOpen);
  const close = useAppStore((s) => s.closeBizPanel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!open) return null;

  const kpis = [
    { v: fmtCNY(roi.annualBenefit), l: '单客户年化效益' },
    { v: `${roi.paybackMonths.toFixed(1)} 个月`, l: '客户回收期' },
    { v: fmtCNY(ARPA), l: '客单价 ARPA / 年' },
    { v: fmtCNY(fin[2].arr), l: 'Y3 ARR（40 客户）' },
  ];

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.page} onClick={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>数字员工 · BUSINESS PLAN</div>
            <div className={styles.title}><span className={styles.emoji}>📈</span> 商业计划 & 落地承诺</div>
            <div className={styles.sub}>港口数字员工 · 把降本增效做成可订阅的产品</div>
          </div>
          <button className={styles.close} onClick={close}>← 返回</button>
        </div>

        <div className={styles.kpis}>
          {kpis.map((k) => (
            <div key={k.l} className={styles.kpi}>
              <div className={styles.kpiVal}>{k.v}</div>
              <div className={styles.kpiLabel}>{k.l}</div>
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>市场空间 MARKET</div>
            <div className={styles.tiers}>
              {MARKET_TIERS.map((t) => (
                <div key={t.k} className={styles.tier}>
                  <div className={styles.tierK}>{t.k}</div>
                  <div className={styles.tierV}>{t.v}</div>
                  <div className={styles.tierNote}>{t.note}</div>
                </div>
              ))}
            </div>
            <div className={styles.targets}>
              {TARGETS.map((t) => <span key={t} className={styles.chip}>{t}</span>)}
            </div>
            <div className={styles.note}>{MARKET_NOTE}</div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>商业模式 MODEL</div>
            <ul className={styles.list}>
              {MODEL.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardTitle}>客户拓展路径 GO-TO-MARKET</div>
            <div className={styles.gtm}>
              {GTM.map((g, i) => (
                <div key={g.s} className={styles.gtmStep}>
                  <div className={styles.gtmS}>{g.s}</div>
                  <div className={styles.gtmD}>{g.d}</div>
                  {i < GTM.length - 1 && <span className={styles.gtmArrow}>→</span>}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>竞争壁垒 MOAT</div>
            <ul className={styles.list}>
              {MOAT.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>财务与融资 FINANCIALS</div>
            <div className={styles.fin}>
              {fin.map((y) => (
                <div key={y.year} className={styles.finRow}>
                  <span className={styles.finYear}>{y.year}</span>
                  <span className={styles.finCust}>{y.customers} 客户</span>
                  <span className={styles.finArr}>{fmtCNY(y.arr)} ARR</span>
                </div>
              ))}
            </div>
            <div className={styles.funding}>
              种子轮用途：{FUNDING.map((f) => `${f.k} ${f.pct}%`).join(' · ')}
            </div>
          </section>

          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardTitle}>成长路线 ROADMAP</div>
            <div className={styles.roadmap}>
              {ROADMAP.map((r) => (
                <div key={r.t} className={styles.milestone}>
                  <div className={styles.mT}>{r.t}</div>
                  <div className={styles.mD}>{r.d}</div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.wide} ${styles.commit}`}>
            <div className={styles.cardTitle}>落地承诺 COMMITMENT · 赛后 3–6 个月可执行</div>
            <div className={styles.commitChips}>
              {COMMITMENTS.map((c) => <span key={c} className={styles.commitChip}>✓ {c}</span>)}
            </div>
            <div className={styles.timeline}>
              {ACTION_PLAN.map((a) => (
                <div key={a.m} className={styles.tl}>
                  <div className={styles.tlM}>{a.m}</div>
                  <div className={styles.tlT}>{a.t}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.foot}>* 市场规模为公开量级估算；财务为自下而上（客户数 × 客单价）简测，口径可调。按 Esc 返回。</div>
      </div>
    </div>
  );
}
