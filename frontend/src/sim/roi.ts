import type { AgentType } from '../types';

/* ═══════════════════════════════════════════════
   ROI Model — 数字员工降本增效测算

   A transparent, defensible value model for a
   digital-workforce deployment on one container
   terminal. Every line item carries the formula
   that produced it, so the number can be defended
   in front of judges ("这个数怎么来的" → 有公式).

   Design principle — honesty over hype:
   the stowage optimiser measures a +28pp utilisation
   jump in the L3 demo, but that is a lab result on a
   deliberately-naive baseline. The MONEY model instead
   uses a conservative *deployed* uplift (see
   `deployedUtilGainPP`), well below the lab figure, so
   the ¥ headline stays credible at fleet scale.
   ═══════════════════════════════════════════════ */

export interface RoiAssumptions {
  /** 年吞吐量 (TEU) — 测算口径：一座中型自动化码头 */
  annualThroughputTEU: number;
  /** 数字员工覆盖的岗位类数 */
  laborRolesCovered: number;
  /** 维持 7×24 三班倒（含轮休）每类岗位的人力系数 (人/岗) */
  ftePerRoleForShift: number;
  /** 数字员工可减负比例（保守，非全替代） */
  offloadRatio: number;
  /** 综合用工成本 (¥/人·年，含社保与管理摊销) */
  laborCostPerFteYear: number;
  /** 人工配载/堆存下的翻箱率 */
  rehandleRateManual: number;
  /** 配载数字员工规划下的翻箱率 */
  rehandleRateAI: number;
  /** 单次装卸/搬倒作业成本 (¥/move) */
  costPerMove: number;
  /** 部署级积载率提升 (个百分点) — 保守取值，远低于 L3 实测 */
  deployedUtilGainPP: number;
  /** 每释放 1 TEU 有效箱位产能的边际收益 (¥/TEU) */
  capacityMarginPerTeu: number;
  /** 安全合规带来的年化风险规避 (¥/年，如滞期/理赔/事故) */
  safetyRiskAvoidedYear: number;
  /** 平台年成本 (¥/年，订阅 + 运维) */
  platformCostYear: number;
}

export const DEFAULT_ROI_ASSUMPTIONS: RoiAssumptions = {
  annualThroughputTEU: 2_000_000,
  laborRolesCovered: 5,
  ftePerRoleForShift: 4,
  offloadRatio: 0.4,
  laborCostPerFteYear: 180_000,
  rehandleRateManual: 0.14,
  rehandleRateAI: 0.08,
  costPerMove: 35,
  deployedUtilGainPP: 8,
  capacityMarginPerTeu: 18,
  safetyRiskAvoidedYear: 600_000,
  platformCostYear: 1_200_000,
};

/** Real, measured evidence from the L3 stowage optimiser (seed 1, 4000 iters).
    Displayed as proof the engine works — NOT used to inflate the ¥ model. */
export const OPTIMIZER_EVIDENCE = {
  baseUtilPct: 43.7,
  optUtilPct: 71.9,
  utilGainPP: 28.1,
  cogRatioBefore: 3.6,
  cogRatioAfter: 0.4,
  riskBefore: 'critical' as const,
  riskAfter: 'safe' as const,
};

export interface RoiLine {
  key: string;
  label: string;
  owner: AgentType; // 主要贡献的数字员工（用于配色）
  formula: string;  // 人类可读的推导过程
  annualValue: number; // ¥/年
}

export interface RoiResult {
  lines: RoiLine[];
  annualBenefit: number; // ¥/年
  fteReduced: number;
  costPerTeuSaved: number; // ¥/TEU
  paybackMonths: number;
  roiRatio: number; // 年化效益 / 平台年成本
}

const wan = (v: number) => (v / 1e4).toFixed(0);

export function computeRoi(a: RoiAssumptions = DEFAULT_ROI_ASSUMPTIONS): RoiResult {
  // 1) 人力成本优化 — 数字员工 7×24 承接重复性岗位
  const fteReduced = Math.round(a.laborRolesCovered * a.ftePerRoleForShift * a.offloadRatio);
  const laborValue = fteReduced * a.laborCostPerFteYear;

  // 2) 智能配载 · 翻箱作业削减 — 配载数字员工减少无效搬倒
  const rehandleMovesCut = Math.round(a.annualThroughputTEU * (a.rehandleRateManual - a.rehandleRateAI));
  const rehandleValue = rehandleMovesCut * a.costPerMove;

  // 3) 舱位利用率提升 — 同等货量释放箱位产能
  const releasedCapacity = Math.round((a.annualThroughputTEU * a.deployedUtilGainPP) / 100);
  const utilValue = releasedCapacity * a.capacityMarginPerTeu;

  // 4) 安全合规 · 风险规避 — 安全数字员工拦截不安全方案
  const safetyValue = a.safetyRiskAvoidedYear;

  const lines: RoiLine[] = [
    {
      key: 'labor',
      label: '人力成本优化 · 7×24 无人化',
      owner: 'execution',
      formula: `${a.laborRolesCovered} 岗 × ${a.ftePerRoleForShift} 人/岗(三班倒) × 减负 ${(a.offloadRatio * 100).toFixed(0)}% ≈ ${fteReduced} 个岗位 × ¥${wan(a.laborCostPerFteYear)}万/年`,
      annualValue: laborValue,
    },
    {
      key: 'rehandle',
      label: '智能配载 · 翻箱作业削减',
      owner: 'stowage',
      formula: `翻箱率 ${(a.rehandleRateManual * 100).toFixed(0)}%→${(a.rehandleRateAI * 100).toFixed(0)}% × ${(a.annualThroughputTEU / 1e4).toFixed(0)}万 TEU × ¥${a.costPerMove}/move = 少 ${(rehandleMovesCut / 1e4).toFixed(1)}万 次搬倒`,
      annualValue: rehandleValue,
    },
    {
      key: 'utilization',
      label: '舱位利用率提升 · 产能释放',
      owner: 'stowage',
      formula: `部署级积载率 +${a.deployedUtilGainPP}pp(保守，L3 实测 +${OPTIMIZER_EVIDENCE.utilGainPP}pp) × ${(a.annualThroughputTEU / 1e4).toFixed(0)}万 TEU × ¥${a.capacityMarginPerTeu}/TEU`,
      annualValue: utilValue,
    },
    {
      key: 'safety',
      label: '安全合规 · 风险规避',
      owner: 'safety',
      formula: `重心/危品/超限拦截，年化规避滞期与理赔损失（保守 ¥${wan(a.safetyRiskAvoidedYear)}万/年）`,
      annualValue: safetyValue,
    },
  ];

  const annualBenefit = lines.reduce((s, l) => s + l.annualValue, 0);
  const costPerTeuSaved = annualBenefit / a.annualThroughputTEU;
  const paybackMonths = a.platformCostYear > 0 ? (12 * a.platformCostYear) / annualBenefit : 0;
  const roiRatio = a.platformCostYear > 0 ? annualBenefit / a.platformCostYear : 0;

  return { lines, annualBenefit, fteReduced, costPerTeuSaved, paybackMonths, roiRatio };
}

/** ¥ formatter: 万 below 1亿, otherwise 亿 (2 decimals). */
export function fmtCNY(v: number): string {
  if (v >= 1e8) return `¥${(v / 1e8).toFixed(2)}亿`;
  return `¥${Math.round(v / 1e4)}万`;
}
