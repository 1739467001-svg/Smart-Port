import type { CoGResult } from '../types';

/* ═══════════════════════════════════════════════
   Stability physics — pure, framework-free

   Centre-of-gravity + IMO-style deviation / risk
   classification for a loaded container. Extracted
   from the L3 ContainerScene so it can be reused by
   the stowage optimizer and the Safety OC, and unit
   tested without pulling in Three.js.
   ═══════════════════════════════════════════════ */

export interface ContainerDims {
  length: number; // x
  height: number; // y
  depth: number;  // z
}

/**
 * A box inside the container, centred in container-local coordinates:
 * the origin sits at the container's geometric centre on the floor, so
 * x ∈ [-L/2, L/2], y ∈ [0, H], z ∈ [-D/2, D/2].
 */
export interface CargoBox {
  size: [number, number, number];   // [L, H, D]
  center: [number, number, number]; // [x, y, z]
  weight: number;                    // kg
}

// IMO-inspired CoG tolerance as a fraction of the container span.
export const LONGITUDINAL_LIMIT_FRAC = 0.05;
export const LATERAL_LIMIT_FRAC = 0.03;

/**
 * Weighted centre of gravity + deviation / risk classification.
 * Container is centred on the origin, so the geometric centre is (0, H/2, 0).
 */
export function computeCoG(cargo: CargoBox[], dims: ContainerDims): CoGResult {
  if (cargo.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      deviation: { x: 0, y: 0 },
      isWithinLimit: true,
      maxTiltAngle: 0,
      riskLevel: 'safe',
    };
  }

  let total = 0;
  let wx = 0, wy = 0, wz = 0;
  for (const b of cargo) {
    total += b.weight;
    wx += b.weight * b.center[0];
    wy += b.weight * b.center[1];
    wz += b.weight * b.center[2];
  }
  const center = { x: wx / total, y: wy / total, z: wz / total };
  const deviation = { x: center.x, y: center.z };

  const longitudinalLimit = dims.length * LONGITUDINAL_LIMIT_FRAC;
  const lateralLimit = dims.depth * LATERAL_LIMIT_FRAC;
  const withinX = Math.abs(deviation.x) <= longitudinalLimit;
  const withinY = Math.abs(deviation.y) <= lateralLimit;

  const ratio = Math.max(
    Math.abs(deviation.x) / longitudinalLimit,
    Math.abs(deviation.y) / lateralLimit
  );
  const riskLevel: CoGResult['riskLevel'] = ratio <= 1 ? 'safe' : ratio <= 1.6 ? 'warning' : 'critical';

  return {
    center,
    deviation,
    isWithinLimit: withinX && withinY,
    maxTiltAngle: Math.atan2(deviation.x, Math.max(center.y, 1)) * (180 / Math.PI),
    riskLevel,
  };
}

/** How far the CoG sits beyond the safe envelope (1.0 = exactly at the limit). */
export function cogDeviationRatio(cog: CoGResult, dims: ContainerDims): number {
  const lon = dims.length * LONGITUDINAL_LIMIT_FRAC;
  const lat = dims.depth * LATERAL_LIMIT_FRAC;
  return Math.max(Math.abs(cog.deviation.x) / lon, Math.abs(cog.deviation.y) / lat);
}
