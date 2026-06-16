import { describe, it, expect } from 'vitest';
import { optimizeStowage, generateManifest } from './stowageOptimizer';

const DIMS = { length: 120, height: 26, depth: 24 };

describe('stowageOptimizer', () => {
  it('never returns a plan worse than the manual baseline', () => {
    const r = optimizeStowage(generateManifest(), DIMS, { seed: 1 });
    expect(r.optimized.score).toBeGreaterThanOrEqual(r.baseline.score);
  });

  it('beats the manual plan: packs more and pulls the CoG into the safe envelope', () => {
    const r = optimizeStowage(generateManifest(), DIMS, { seed: 1, iterations: 4000 });

    // the naive arrival-order plan is both wasteful and unsafe
    expect(r.baseline.cogRatio).toBeGreaterThan(1);
    expect(r.baseline.cog.riskLevel).toBe('critical');

    // the optimiser packs more volume and makes the load safe
    expect(r.optimized.score).toBeGreaterThan(r.baseline.score);
    expect(r.optimized.utilization).toBeGreaterThan(r.baseline.utilization);
    expect(r.optimized.cogRatio).toBeLessThanOrEqual(1);
    expect(r.optimized.cog.riskLevel).toBe('safe');
    expect(r.optimized.leftOut.length).toBeLessThanOrEqual(r.baseline.leftOut.length);
  });

  it('produces only physically valid placements inside the container', () => {
    const { optimized } = optimizeStowage(generateManifest(), DIMS, { seed: 2 });
    const E = 1e-6;
    for (const p of optimized.placements) {
      const [w, h, d] = p.size;
      expect(p.center[0] - w / 2).toBeGreaterThanOrEqual(-DIMS.length / 2 - E);
      expect(p.center[0] + w / 2).toBeLessThanOrEqual(DIMS.length / 2 + E);
      expect(p.center[1] - h / 2).toBeGreaterThanOrEqual(-E);
      expect(p.center[1] + h / 2).toBeLessThanOrEqual(DIMS.height + E);
      expect(p.center[2] - d / 2).toBeGreaterThanOrEqual(-DIMS.depth / 2 - E);
      expect(p.center[2] + d / 2).toBeLessThanOrEqual(DIMS.depth / 2 + E);
    }
    expect(optimized.utilization).toBeGreaterThan(0);
    expect(optimized.utilization).toBeLessThanOrEqual(1);
    // every manifest item is accounted for exactly once
    expect(optimized.placements.length + optimized.leftOut.length).toBe(generateManifest().length);
  });
});
