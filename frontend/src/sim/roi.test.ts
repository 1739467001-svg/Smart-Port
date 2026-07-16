import { describe, it, expect } from 'vitest';
import { computeRoi, fmtCNY, DEFAULT_ROI_ASSUMPTIONS } from './roi';

describe('computeRoi', () => {
  const r = computeRoi();

  it('sums line items into the annual benefit', () => {
    const sum = r.lines.reduce((s, l) => s + l.annualValue, 0);
    expect(r.annualBenefit).toBe(sum);
    expect(r.lines).toHaveLength(4);
  });

  it('reduces a positive, sensible number of FTE', () => {
    // 5 roles × 4 FTE/role × 0.4 offload = 8
    expect(r.fteReduced).toBe(8);
  });

  it('keeps per-TEU benefit conservative (< ¥20/TEU)', () => {
    // A defensible model must not imply an absurd per-container windfall.
    expect(r.costPerTeuSaved).toBeGreaterThan(0);
    expect(r.costPerTeuSaved).toBeLessThan(20);
  });

  it('produces a payback shorter than a year and ROI > 1x', () => {
    expect(r.paybackMonths).toBeGreaterThan(0);
    expect(r.paybackMonths).toBeLessThan(12);
    expect(r.roiRatio).toBeGreaterThan(1);
  });

  it('scales the annual benefit with throughput', () => {
    const bigger = computeRoi({ ...DEFAULT_ROI_ASSUMPTIONS, annualThroughputTEU: 4_000_000 });
    expect(bigger.annualBenefit).toBeGreaterThan(r.annualBenefit);
  });

  it('formats ¥ into 万 / 亿', () => {
    expect(fmtCNY(9_120_000)).toBe('¥912万');
    expect(fmtCNY(120_000_000)).toBe('¥1.20亿');
  });
});
