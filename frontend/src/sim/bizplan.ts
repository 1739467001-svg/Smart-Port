import { DEFAULT_ROI_ASSUMPTIONS } from './roi';

/* ═══════════════════════════════════════════════
   Business Plan — 商业计划 & 落地承诺 content

   Feeds the finals-scoring sections (商业计划与成长性 20 +
   落地意愿 10). Economics reuse the ROI model so the BP and
   the 降本增效 panel tell one consistent story.
   ═══════════════════════════════════════════════ */

/** Average revenue per account = the platform's annual fee per terminal. */
export const ARPA = DEFAULT_ROI_ASSUMPTIONS.platformCostYear; // ¥ / 客户·年

export interface YearFin {
  year: string;
  customers: number;
  arr: number; // ¥
}

/** Bottom-up 3-year ARR: customers × ARPA. Deliberately simple & auditable. */
export function projectFinancials(): YearFin[] {
  return [
    { year: 'Y1', customers: 3 },
    { year: 'Y2', customers: 12 },
    { year: 'Y3', customers: 40 },
  ].map((p) => ({ ...p, arr: p.customers * ARPA }));
}

export const TARGETS = ['集装箱码头运营商', '港口集团 / 链主企业', '多式联运（海铁）场站'];

export const MARKET_TIERS = [
  { k: 'TAM', v: '全球港口数字化 / 自动化', note: '数百亿元/年 量级' },
  { k: 'SAM', v: '中国集装箱码头智能化', note: '数十亿元/年 量级' },
  { k: 'SOM', v: '3 年可服务 ARR', note: '数千万 → 数亿元' },
];

export const MARKET_NOTE =
  '全球集装箱码头 900+，中国规模以上港口泊位 2800+、专业化集装箱泊位数百个——重复性岗位密集、降本诉求刚性。';

export const MODEL = [
  'SaaS 订阅：按码头 + 按数字员工岗位分档（每个数字员工一份年费）',
  '实施与数据接入服务费（一次性）',
  '增值：新增数字员工岗位 / 跨场景复制（堆场、闸口、海铁）按需开通',
  '单客户经济账：平台年费 ¥120万 → 客户年化效益 ¥912万（ROI 7.6×、回收 1.6 个月），付费意愿刚性',
];

export const GTM = [
  { s: '灯塔客户', d: '1 个标杆码头 PoC' },
  { s: '同集团复制', d: '横向铺开泊位 / 码头' },
  { s: '行业扩散', d: '沿海主要港口' },
  { s: '海外延伸', d: '一带一路 · 多式联运' },
];

export const MOAT = [
  '技术：真实配载优化（模拟退火）+ 三维重心物理引擎，有单元测试、可验证，不是 PPT',
  '产品：多智能体「数字员工」协同闭环（单证→配载→安全→调度→执行），非套壳',
  '数据飞轮：接入码头越多，配载 / 调度模型越准，越用越强',
  '合规：重心 / 危品 / 超限安全拦截，贴合港口作业规范',
];

export const FUNDING = [
  { k: '产品化打磨', pct: 40 },
  { k: '灯塔码头落地与驻场', pct: 35 },
  { k: '核心团队（技术 + 港口专家）', pct: 25 },
];

export const ROADMAP = [
  { t: '0–6 月', d: '灯塔码头 PoC，配载 / 重心 / 调度上线' },
  { t: '6–12 月', d: '同集团复制，3–5 个码头签约' },
  { t: '12–24 月', d: '沿海主要港口扩散，产品矩阵完善' },
  { t: '24 月+', d: '海外港口 + 海铁联运多式联运延伸' },
];

export const COMMITMENTS = [
  '赛区注册公司主体',
  '派驻团队驻场',
  '灯塔码头试点 PoC',
  '签署合作 / 采购意向',
  '长期合作与复制',
];

/** 赛后 3–6 个月可执行行动计划（对应「落地意愿」评分要点）。 */
export const ACTION_PLAN = [
  { m: '第 1 月', t: '注册主体 + 组建驻场团队 + 锁定灯塔码头' },
  { m: '第 2–3 月', t: '灯塔码头 PoC：配载 / 重心 / 调度试运行，打通数据' },
  { m: '第 4–5 月', t: '效果验证（利用率↑ / 翻箱↓ / 降本）+ 试点扩围' },
  { m: '第 6 月', t: '签约转化 + 启动同集团复制' },
];
