import { describe, it, expect } from 'vitest';
import { computeCoG, cogDeviationRatio, type CargoBox } from './stability';

const DIMS = { length: 120, height: 26, depth: 24 };

describe('computeCoG', () => {
  it('a symmetric load is centred and safe', () => {
    const cargo: CargoBox[] = [
      { size: [10, 10, 10], center: [-30, 5, 0], weight: 1000 },
      { size: [10, 10, 10], center: [30, 5, 0], weight: 1000 },
    ];
    const cog = computeCoG(cargo, DIMS);
    expect(cog.center.x).toBeCloseTo(0, 6);
    expect(cog.deviation.x).toBeCloseTo(0, 6);
    expect(cog.isWithinLimit).toBe(true);
    expect(cog.riskLevel).toBe('safe');
  });

  it('flags a heavily lopsided load as unsafe', () => {
    const cargo: CargoBox[] = [
      { size: [10, 10, 10], center: [55, 5, 0], weight: 5000 },
      { size: [10, 10, 10], center: [50, 5, 0], weight: 4000 },
    ];
    const cog = computeCoG(cargo, DIMS);
    expect(Math.abs(cog.deviation.x)).toBeGreaterThan(DIMS.length * 0.05);
    expect(cog.isWithinLimit).toBe(false);
    expect(cogDeviationRatio(cog, DIMS)).toBeGreaterThan(1);
  });

  it('an empty load is trivially safe', () => {
    const cog = computeCoG([], DIMS);
    expect(cog.isWithinLimit).toBe(true);
    expect(cog.riskLevel).toBe('safe');
    expect(cogDeviationRatio(cog, DIMS)).toBe(0);
  });
});
