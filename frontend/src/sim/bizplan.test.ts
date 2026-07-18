import { describe, it, expect } from 'vitest';
import { projectFinancials, ARPA, ACTION_PLAN, COMMITMENTS } from './bizplan';

describe('bizplan', () => {
  it('projects ARR as customers × ARPA, growing year over year', () => {
    const fin = projectFinancials();
    expect(fin).toHaveLength(3);
    fin.forEach((y) => expect(y.arr).toBe(y.customers * ARPA));
    expect(fin[1].arr).toBeGreaterThan(fin[0].arr);
    expect(fin[2].arr).toBeGreaterThan(fin[1].arr);
  });

  it('covers a 3–6 month executable landing plan and concrete commitments', () => {
    expect(ACTION_PLAN.length).toBeGreaterThanOrEqual(4);
    expect(COMMITMENTS).toContain('灯塔码头试点 PoC');
  });
});
