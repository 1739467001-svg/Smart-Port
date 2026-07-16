import type { CoGResult } from '../types';
import {
  computeCoG,
  cogDeviationRatio,
  type CargoBox,
  type ContainerDims,
} from './stability';

/* ═══════════════════════════════════════════════
   Stowage Optimizer — the 配载数字员工 brain

   A real container-loading heuristic: wall-building
   (shelf) packing driven by a simulated-annealing
   search over load order + per-box yaw. It maximises
   packed-volume utilisation while pulling the centre
   of gravity into the IMO-safe envelope (and keeping
   it low). Pure & deterministic (seeded RNG), so it
   is unit-testable and reproducible on stage.

   This replaces the random placeholder metrics the
   配载数字员工 used to emit with an actual optimisation
   the demo can show improving in real time.
   ═══════════════════════════════════════════════ */

export interface CargoSpec {
  id: string;
  size: [number, number, number]; // [L, H, D] in container units
  weight: number;                 // kg
  rotatable?: boolean;            // may yaw 90° (swap L <-> D)
}

export interface Placement {
  id: string;
  size: [number, number, number];
  center: [number, number, number]; // container-centred coords (see stability.ts)
  weight: number;
}

export interface LoadPlan {
  placements: Placement[];
  leftOut: string[];
  utilization: number; // packed volume / container volume, 0..1
  cog: CoGResult;
  cogRatio: number;    // CoG deviation ratio (<= 1 is inside the safe envelope)
  score: number;
}

export interface OptimizeOptions {
  iterations?: number;
  seed?: number;
  // objective weights
  wUtil?: number;
  wCog?: number;
  wHeight?: number;
}

export interface OptimizeResult {
  baseline: LoadPlan;   // naive "manual" plan (arrival order, no rotation)
  optimized: LoadPlan;  // best plan the optimizer found
  iterations: number;
  history: number[];    // best score sampled over the run (for a live chart)
}

type Weights = Required<Pick<OptimizeOptions, 'wUtil' | 'wCog' | 'wHeight'>>;

// ── seeded RNG (mulberry32) so every run is reproducible ──
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// yaw 90° swaps length and depth, keeps height
function oriented(spec: CargoSpec, yaw: boolean): [number, number, number] {
  const [l, h, d] = spec.size;
  return yaw ? [d, h, l] : [l, h, d];
}

/**
 * Deterministic wall-building (shelf) pack for a given load order and
 * per-spec yaw. Fills rows along length, stacks rows along depth into a
 * layer, then stacks layers up the height. Boxes that no longer fit are
 * reported in `leftOut`. Returns placements in container-centred coords.
 */
function packShelf(
  specs: CargoSpec[],
  order: number[],
  yaw: boolean[],
  dims: ContainerDims
): { placements: Placement[]; leftOut: string[] } {
  const { length: L, height: H, depth: D } = dims;
  const placements: Placement[] = [];
  const leftOut: string[] = [];

  let cx = 0;       // cursor along length
  let cz = 0;       // cursor along depth within the current layer
  let cy = 0;       // current layer base height
  let rowDepth = 0; // deepest box in the current row
  let layerH = 0;   // tallest box in the current layer
  const EPS = 1e-6;

  for (const idx of order) {
    const spec = specs[idx];
    const [w, h, d] = oriented(spec, yaw[idx]);

    if (w > L || d > D || h > H) { leftOut.push(spec.id); continue; } // never fits

    if (cx + w > L + EPS) { cx = 0; cz += rowDepth; rowDepth = 0; }            // new row
    if (cz + d > D + EPS) { cz = 0; cx = 0; cy += layerH; layerH = 0; rowDepth = 0; } // new layer
    if (cy + h > H + EPS) { leftOut.push(spec.id); continue; }                 // out of height

    placements.push({
      id: spec.id,
      size: [w, h, d],
      center: [cx + w / 2 - L / 2, cy + h / 2, cz + d / 2 - D / 2],
      weight: spec.weight,
    });

    cx += w;
    rowDepth = Math.max(rowDepth, d);
    layerH = Math.max(layerH, h);
  }

  return { placements, leftOut };
}

/** Score a candidate plan: reward utilisation, penalise an out-of-limit and a high CoG. */
function evaluate(
  specs: CargoSpec[],
  order: number[],
  yaw: boolean[],
  dims: ContainerDims,
  w: Weights
): LoadPlan {
  const { placements, leftOut } = packShelf(specs, order, yaw, dims);

  const containerVol = dims.length * dims.height * dims.depth;
  let packedVol = 0;
  const cargo: CargoBox[] = placements.map((p) => {
    packedVol += p.size[0] * p.size[1] * p.size[2];
    return { size: p.size, center: p.center, weight: p.weight };
  });

  const utilization = packedVol / containerVol;
  const cog = computeCoG(cargo, dims);
  const cogRatio = cargo.length ? cogDeviationRatio(cog, dims) : 0;

  const cogExcess = Math.max(0, cogRatio - 1);   // 0 while inside the safe envelope
  const heightFrac = cog.center.y / dims.height; // lower CoG is more stable
  const score = w.wUtil * utilization - w.wCog * cogExcess - w.wHeight * heightFrac;

  return { placements, leftOut, utilization, cog, cogRatio, score };
}

/**
 * Optimise the stow of `specs` into a container. Returns both the naive
 * baseline plan and the optimised plan so callers can show "manual vs AI".
 */
export function optimizeStowage(
  specs: CargoSpec[],
  dims: ContainerDims,
  opts: OptimizeOptions = {}
): OptimizeResult {
  const iterations = opts.iterations ?? 2500;
  const rand = mulberry32(opts.seed ?? 0x5eed);
  const w: Weights = {
    wUtil: opts.wUtil ?? 1,
    wCog: opts.wCog ?? 0.6,
    wHeight: opts.wHeight ?? 0.15,
  };

  const n = specs.length;
  const idOrder = specs.map((_, i) => i);

  // ── baseline: arrival order, no rotation — what a manual plan looks like ──
  const baseYaw = new Array<boolean>(n).fill(false);
  const baseline = evaluate(specs, idOrder, baseYaw, dims, w);

  // ── optimised: simulated annealing over (order, yaw) ──
  let curOrder = idOrder.slice();
  let curYaw = baseYaw.slice();
  let cur = baseline;
  let best = baseline;
  let bestOrder = curOrder.slice();
  let bestYaw = curYaw.slice();

  const history: number[] = [];
  const T0 = 1.0;
  let T = T0;
  const cooling = Math.pow(0.0008 / T0, 1 / Math.max(1, iterations));
  const sample = Math.max(1, Math.floor(iterations / 60));

  for (let it = 0; it < iterations; it++) {
    const nextOrder = curOrder.slice();
    const nextYaw = curYaw.slice();

    if (rand() < 0.5 && n > 1) {
      const i = Math.floor(rand() * n);
      let j = Math.floor(rand() * n);
      if (j === i) j = (j + 1) % n;
      [nextOrder[i], nextOrder[j]] = [nextOrder[j], nextOrder[i]];
    } else if (n > 0) {
      const k = nextOrder[Math.floor(rand() * n)];
      if (specs[k].rotatable) nextYaw[k] = !nextYaw[k];
    }

    const cand = evaluate(specs, nextOrder, nextYaw, dims, w);
    const delta = cand.score - cur.score;
    if (delta >= 0 || rand() < Math.exp(delta / Math.max(T, 1e-6))) {
      cur = cand;
      curOrder = nextOrder;
      curYaw = nextYaw;
      if (cand.score > best.score) {
        best = cand;
        bestOrder = nextOrder.slice();
        bestYaw = nextYaw.slice();
      }
    }

    if (it % sample === 0) history.push(best.score);
    T *= cooling;
  }

  const optimized = evaluate(specs, bestOrder, bestYaw, dims, w);
  return { baseline, optimized, iterations, history };
}

/**
 * Deterministic demo manifest: a mixed batch of boxes (varied footprints
 * and weights, with a few heavy outliers) — enough to overfill the
 * container so the optimiser has to make real trade-offs.
 */
export function generateManifest(seed = 0xc0ffee): CargoSpec[] {
  const rand = mulberry32(seed);
  const specs: CargoSpec[] = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const l = 16 + Math.floor(rand() * 5) * 6; // 16..40
    const h = 7 + Math.floor(rand() * 3) * 4;  // 7,11,15  → leaves room to stack
    const d = 8 + Math.floor(rand() * 3) * 4;  // 8,12,16
    const heavy = rand() < 0.3 ? 1.8 : 1;
    const weight = Math.round((200 + l * h * d * 0.04) * heavy);
    specs.push({
      id: `C${String(i + 1).padStart(2, '0')}`,
      size: [l, h, d],
      weight,
      rotatable: rand() < 0.7,
    });
  }
  return specs;
}
