import type { AgentType } from '../types';

/* ═══════════════════════════════════════════════
   Process Model — container lifecycle as a pipeline

   The "digital twin" of the physical container flow:
   the same lifecycle the 3D ContainerFlow animates,
   represented as an ordered list of stages whose live
   in-transit counts advance over time like a real
   terminal queue (arrivals in, throughput out).

   This is the single source of truth the process-flow
   HUD renders. Each stage is owned by an OC agent, so
   the board doubles as "what each agent is doing now".
   ═══════════════════════════════════════════════ */

export type ProcessPhase = 'export' | 'import';
export type ProcessZone = '单证' | '闸口' | '堆场' | '岸边' | '海运' | '内陆';

export interface ProcessStage {
  id: string;
  name: string; // 中文阶段名
  en: string;
  phase: ProcessPhase;
  zone: ProcessZone;
  owner: AgentType; // responsible OC agent
}

// Full closed loop: export chain (land → ship) then import chain (ship → land)
export const PROCESS_STAGES: ProcessStage[] = [
  // ── 出口链 EXPORT ──
  { id: 'booking', name: '订舱', en: 'Booking', phase: 'export', zone: '单证', owner: 'data' },
  { id: 'gate-in', name: '集港进闸', en: 'Gate-in', phase: 'export', zone: '闸口', owner: 'safety' },
  { id: 'yard-out', name: '堆场堆存', en: 'Yard', phase: 'export', zone: '堆场', owner: 'lobster' },
  { id: 'stow', name: '配载计划', en: 'Stowage', phase: 'export', zone: '堆场', owner: 'lobster' },
  { id: 'load', name: '岸桥装船', en: 'Loading', phase: 'export', zone: '岸边', owner: 'dispatch' },
  { id: 'sail', name: '离港海运', en: 'At Sea', phase: 'export', zone: '海运', owner: 'execution' },
  // ── 进口链 IMPORT ──
  { id: 'arrive', name: '船舶到港', en: 'Arrival', phase: 'import', zone: '海运', owner: 'dispatch' },
  { id: 'discharge', name: '岸桥卸船', en: 'Discharge', phase: 'import', zone: '岸边', owner: 'dispatch' },
  { id: 'yard-in', name: '进口堆存', en: 'Yard', phase: 'import', zone: '堆场', owner: 'lobster' },
  { id: 'customs', name: '海关查验', en: 'Customs', phase: 'import', zone: '单证', owner: 'data' },
  { id: 'gate-out', name: '提柜出闸', en: 'Gate-out', phase: 'import', zone: '闸口', owner: 'safety' },
  { id: 'deliver', name: '内陆交付', en: 'Delivered', phase: 'import', zone: '内陆', owner: 'execution' },
];

export const EXPORT_START = 0;
export const EXPORT_END = 5; // 'sail' drains
export const IMPORT_START = 6;
export const IMPORT_END = 11; // 'deliver' drains

// Steady-ish starting state — yard stages buffer far more (long dwell),
// customs holds a medium queue, transit stages stay lean.
export const INITIAL_COUNTS = [8, 8, 30, 9, 8, 6, 8, 8, 30, 16, 8, 6];

// Per-stage outflow fraction per tick. Low rate ⇒ containers pile up
// (yard dwell, customs hold); high rate ⇒ they pass through quickly.
const STAGE_RATE = [0.5, 0.55, 0.12, 0.4, 0.5, 0.5, 0.6, 0.55, 0.12, 0.22, 0.5, 0.5];

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Advance the pipeline one tick: inject arrivals at the two chain
 * heads, push each stage's share downstream at its own rate, and
 * drain the two terminal stages (containers that have left).
 * Returns new counts + how many completed this tick (throughput).
 */
export function advanceProcess(counts: number[]): { counts: number[]; completed: number } {
  const next = counts.slice();

  // Arrivals
  next[EXPORT_START] += randInt(2, 5);
  next[IMPORT_START] += randInt(2, 5);

  let completed = 0;

  // Export chain advances downstream
  for (let i = EXPORT_START; i < EXPORT_END; i++) {
    const move = Math.round(next[i] * STAGE_RATE[i]);
    next[i] -= move;
    next[i + 1] += move;
  }
  // Import chain advances downstream
  for (let i = IMPORT_START; i < IMPORT_END; i++) {
    const move = Math.round(next[i] * STAGE_RATE[i]);
    next[i] -= move;
    next[i + 1] += move;
  }

  // Drain terminal stages (sailed / delivered = throughput)
  [EXPORT_END, IMPORT_END].forEach((end) => {
    const out = Math.round(next[end] * STAGE_RATE[end]);
    next[end] -= out;
    completed += out;
  });

  return { counts: next, completed };
}
