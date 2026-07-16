import type { AgentType, PortMetrics } from '../types';
import { PROCESS_STAGES } from './processModel';
import type { LoadPlan } from './stowageOptimizer';
import { computeRoi, fmtCNY } from './roi';

/* ═══════════════════════════════════════════════
   Assistant — 让数字员工"开口"的问答引擎

   A grounded, OFFLINE natural-language Q&A engine: the
   digital employees answer questions using the REAL live
   state (metrics, the stowage optimiser result, the
   process pipeline, the ROI model) — not canned strings.

   Why local & deterministic: a 路演 stage can lose the
   network, and the 评审细则 penalises device/network
   failures. This engine needs no key and cannot "翻车",
   yet every answer is computed from real numbers.

   A real LLM can be dropped in later behind the same
   `answer()` signature (see `answer` note) without
   touching the UI.
   ═══════════════════════════════════════════════ */

export interface AssistantContext {
  metrics: PortMetrics;
  processCounts: number[];
  baseline: LoadPlan;
  optimized: LoadPlan;
  agents: { type: AgentType; name: string; role: string; status: string }[];
}

export interface AssistantReply {
  agent: AgentType; // which 数字员工 answers (drives avatar/colour)
  text: string;
  tags?: string[]; // small data chips
}

const riskLabel = (r: string) => (r === 'safe' ? '安全' : r === 'warning' ? '警戒' : '危险');
const statusLabel: Record<string, string> = {
  active: '运行中', computing: '推演中', monitoring: '监控中', standby: '待命', error: '异常',
};

interface Intent {
  key: string;
  agent: AgentType;
  patterns: RegExp[];
  reply: (ctx: AssistantContext, q: string) => { text: string; tags?: string[] };
}

/** Ordered by priority — first pattern match wins. */
const INTENTS: Intent[] = [
  {
    key: 'safety',
    agent: 'safety',
    patterns: [/重心|稳性|倾覆|翻箱风险|安全吗|cog|合规|危险/i],
    reply: (ctx) => {
      const o = ctx.optimized, b = ctx.baseline;
      return {
        text: `我是安全数字员工。当前 AI 配载方案重心偏移比 ${o.cogRatio.toFixed(2)}（≤1 为安全），稳性风险「${riskLabel(o.cog.riskLevel)}」。作为对照，传统人工基线为 ${b.cogRatio.toFixed(2)}「${riskLabel(b.cog.riskLevel)}」——这种方案会被我直接否决。每一个配载方案我都会做三维重心 CoG 校验、危品与超限拦截。`,
        tags: [`重心比 ${o.cogRatio.toFixed(2)}`, `风险 ${riskLabel(o.cog.riskLevel)}`],
      };
    },
  },
  {
    key: 'roi',
    agent: 'dispatch',
    patterns: [/省.*(钱|多少)|多少钱|效益|回报|roi|回收|降本|成本|值多少|赚|投资/i],
    reply: () => {
      const r = computeRoi();
      return {
        text: `从运营账算：一支数字员工班组在一座年吞吐 200 万 TEU 的码头，年化综合效益约 ${fmtCNY(r.annualBenefit)}（人力 ${fmtCNY(r.lines[0].annualValue)} + 翻箱削减 ${fmtCNY(r.lines[1].annualValue)} + 舱位利用 ${fmtCNY(r.lines[2].annualValue)} + 安全规避 ${fmtCNY(r.lines[3].annualValue)}）。平台年成本约 ${fmtCNY(1_200_000)}，投资回收期 ${r.paybackMonths.toFixed(1)} 个月，ROI ${r.roiRatio.toFixed(1)}×，单箱综合降本 ¥${r.costPerTeuSaved.toFixed(1)}/TEU。点顶栏「📊 降本增效」可看每项推导公式。`,
        tags: [`年化 ${fmtCNY(r.annualBenefit)}`, `回收 ${r.paybackMonths.toFixed(1)} 个月`, `ROI ${r.roiRatio.toFixed(1)}×`],
      };
    },
  },
  {
    key: 'flow',
    agent: 'data',
    patterns: [/在途|箱量|环节|哪个.*(最高|最多|最忙|积压)|流程|阶段|排队|积压|堆场|闸口/i],
    reply: (ctx) => {
      const pairs = PROCESS_STAGES.map((st, i) => ({ st, n: ctx.processCounts[i] ?? 0 }));
      const top = [...pairs].sort((a, b) => b.n - a.n).slice(0, 3);
      const total = pairs.reduce((s, p) => s + p.n, 0);
      const list = top.map((p) => `${p.st.name}（${p.st.phase === 'export' ? '出口' : '进口'}·${p.st.zone}）${p.n} 箱`).join('，');
      return {
        text: `我是单证数字员工，实时盯着全流程在途箱量。当前在途合计约 ${total} 箱，在途最多的环节：${list}。堆场类环节停留时间长、天然积压更多，这正是配载数字员工提前规划箱位、压缩翻箱的地方。`,
        tags: top.map((p) => `${p.st.name} ${p.n}`),
      };
    },
  },
  {
    key: 'metrics',
    agent: 'dispatch',
    patterns: [/吞吐|teu|岸桥|agv|安全评分|作业效率|装卸效率|指标|产能/i],
    reply: (ctx, q) => {
      const m = ctx.metrics;
      const focus = /岸桥/.test(q)
        ? `岸桥利用率 ${m.craneUtilization.toFixed(1)}%`
        : /agv/i.test(q)
          ? `AGV 行程 ${m.agvTrips} 次`
          : /安全评分/.test(q)
            ? `安全评分 ${m.safetyScore.toFixed(1)}`
            : `日吞吐 ${m.throughputTEU} TEU`;
      return {
        text: `我是调度数字员工，实时协调岸桥/轨道吊/AGV。你关心的：${focus}。当前全港实时指标 —— 日吞吐 ${m.throughputTEU} TEU、岸桥利用率 ${m.craneUtilization.toFixed(1)}%、AGV 行程 ${m.agvTrips} 次、安全评分 ${m.safetyScore.toFixed(1)}、堆场占用 ${m.yardOccupancy.toFixed(1)}%、平均装卸 ${m.avgLoadTime.toFixed(0)} 分钟。`,
        tags: [`岸桥 ${m.craneUtilization.toFixed(0)}%`, `吞吐 ${m.throughputTEU}`, `安全 ${m.safetyScore.toFixed(1)}`],
      };
    },
  },
  {
    key: 'stowage',
    agent: 'stowage',
    patterns: [/配载|装载|积载|堆叠|码放|利用率|ai.*人工|人工.*ai|优化.*(多少|效果|提升)|好多少|翻盘|装箱/i],
    reply: (ctx) => {
      const o = ctx.optimized, b = ctx.baseline;
      const gain = (o.utilization - b.utilization) * 100;
      return {
        text: `我是配载数字员工，用模拟退火在装载顺序和每箱朝向上做空间推演。容积利用率从人工的 ${(b.utilization * 100).toFixed(1)}% 提升到 ${(o.utilization * 100).toFixed(1)}%（+${gain.toFixed(1)} 个百分点），装载箱数 ${b.placements.length}→${o.placements.length}，同时把重心从 ${b.cogRatio.toFixed(2)} 拉回 ${o.cogRatio.toFixed(2)}——利用率和稳性一次算到位。你可以在 L3 单箱视图切换「传统人工 ↔ AI 优化」亲眼看重心球从红变绿。`,
        tags: [`利用率 +${gain.toFixed(1)}pp`, `${b.placements.length}→${o.placements.length} 箱`],
      };
    },
  },
  {
    key: 'team',
    agent: 'data',
    patterns: [/数字员工|团队|几个|谁在|在做什么|分别|成员|班组|角色|岗位/i],
    reply: (ctx) => {
      const list = ctx.agents.map((a) => `${a.name}（${a.role}，${statusLabel[a.status] ?? a.status}）`).join('、');
      return {
        text: `我们是一支 ${ctx.agents.length} 人的港口数字员工班组，7×24 协同：${list}。作业按「单证清洗 → 配载推演 → 安全审查 → 调度共识 → 执行下发」闭环流转，右侧协同日志能看到我们实时对话。`,
        tags: ctx.agents.map((a) => a.name),
      };
    },
  },
  {
    key: 'intro',
    agent: 'data',
    patterns: [/你是谁|介绍|是什么|干嘛|能做什么|平台|智港|智慧港口/i],
    reply: () => ({
      text: `这里是「智港数字员工」——以多智能体数字员工重构港口作业的智慧港口数字孪生平台。一支 7×24 永不换班的 AI 班组覆盖集装箱进出口全流程，用真实的配载优化算法与重心物理引擎把降本、增效、安全一次做到位。你可以问我：重心安全吗、AI 比人工配载好多少、哪个环节在途箱量最高、一年能省多少钱。`,
    }),
  },
];

// Curated as a 路演 arc: 介绍 → 团队 → 技术 → 安全 → 运营 → 指标 → 价值.
// Every preset is verified to route to an intent with a real-data answer.
const SUGGESTIONS = [
  '介绍一下智港平台',
  '五个数字员工分别在做什么？',
  'AI 比人工配载好多少？',
  '当前配载重心安全吗？',
  '哪个环节在途箱量最高？',
  '岸桥利用率现在多少？',
  '一年能省多少钱？',
];

export function assistantSuggestions(): string[] {
  return SUGGESTIONS;
}

/**
 * Answer a natural-language question from the live context.
 * Deterministic and offline. To swap in a real LLM later, keep
 * this signature and route to the model with `ctx` as grounding.
 */
export function answer(query: string, ctx: AssistantContext): AssistantReply {
  const q = query.trim();
  for (const intent of INTENTS) {
    if (intent.patterns.some((re) => re.test(q))) {
      const { text, tags } = intent.reply(ctx, q);
      return { agent: intent.agent, text, tags };
    }
  }
  return {
    agent: 'data',
    text: `这个问题我先记下了。你可以换个问法，或试试这些：「${SUGGESTIONS.slice(0, 4).join('」「')}」。`,
  };
}
