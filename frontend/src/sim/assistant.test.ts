import { describe, it, expect } from 'vitest';
import { answer, assistantSuggestions, type AssistantContext } from './assistant';
import { optimizeStowage, generateManifest } from './stowageOptimizer';
import { CONTAINER_DIMS } from './stability';
import { INITIAL_COUNTS } from './processModel';

const stow = optimizeStowage(generateManifest(), CONTAINER_DIMS, { seed: 1, iterations: 2000 });

const ctx: AssistantContext = {
  metrics: {
    throughputTEU: 900,
    craneUtilization: 78.3,
    agvTrips: 234,
    safetyScore: 99.2,
    yardOccupancy: 65.4,
    avgLoadTime: 42,
  },
  processCounts: INITIAL_COUNTS,
  baseline: stow.baseline,
  optimized: stow.optimized,
  agents: [
    { type: 'data', name: '单证数字员工', role: 'Documentation Agent', status: 'active' },
    { type: 'stowage', name: '配载数字员工', role: 'Stowage Agent', status: 'computing' },
    { type: 'safety', name: '安全数字员工', role: 'Safety Agent', status: 'monitoring' },
    { type: 'dispatch', name: '调度数字员工', role: 'Dispatch Agent', status: 'active' },
    { type: 'execution', name: '执行数字员工', role: 'Execution Agent', status: 'standby' },
  ],
};

describe('assistant.answer', () => {
  it('routes safety questions to the 安全数字员工 with the real CoG ratio', () => {
    const r = answer('当前配载重心安全吗？', ctx);
    expect(r.agent).toBe('safety');
    expect(r.text).toContain('重心');
    expect(r.text).toContain(ctx.optimized.cogRatio.toFixed(2));
  });

  it('routes stowage comparison to the 配载数字员工 with a real utilisation gain', () => {
    const r = answer('AI 比人工配载好多少？', ctx);
    expect(r.agent).toBe('stowage');
    expect(r.text).toContain('百分点');
    const gain = ((ctx.optimized.utilization - ctx.baseline.utilization) * 100).toFixed(1);
    expect(r.text).toContain(gain);
  });

  it('routes money questions to an ROI answer', () => {
    const r = answer('一年能省多少钱？', ctx);
    expect(r.agent).toBe('dispatch');
    expect(r.text).toContain('回收期');
    expect(r.text).toMatch(/¥[\d.]+/);
  });

  it('routes flow questions to the 单证数字员工 and names a stage', () => {
    const r = answer('哪个环节在途箱量最高？', ctx);
    expect(r.agent).toBe('data');
    expect(r.text).toContain('在途');
  });

  it('answers metrics with the live 岸桥利用率', () => {
    const r = answer('岸桥利用率现在多少？', ctx);
    expect(r.agent).toBe('dispatch');
    expect(r.text).toContain('岸桥利用率');
    expect(r.text).toContain('78.3');
  });

  it('lists the whole crew for a team question', () => {
    const r = answer('五个数字员工分别在做什么？', ctx);
    expect(r.agent).toBe('data');
    expect(r.text).toContain('配载数字员工');
    expect(r.text).toContain('安全数字员工');
  });

  it('falls back gracefully on an unknown question', () => {
    const r = answer('今天天气怎么样', ctx);
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.text).toContain('试试');
  });

  it('exposes suggested questions', () => {
    expect(assistantSuggestions().length).toBeGreaterThanOrEqual(4);
  });
});
