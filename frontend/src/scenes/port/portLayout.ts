/* ═══════════════════════════════════════════════
   Port Layout Config

   The L1 port scene is driven by this data, not by
   magic numbers buried in geometry code. Swapping in a
   different terminal = swap this object (or load it from
   an API / BAPLIE file later). That is the extensibility
   contract: layout is data, rendering is generic.
   ═══════════════════════════════════════════════ */

export interface PortLayout {
  /** Quay crane positions along the berth (x axis). */
  craneXPositions: number[];
  /** Container yard blocks, laid out left→right. */
  yardBlocks: Array<{
    id: string;
    /** World position of the block's near-left corner [x, z]. */
    origin: [number, number];
    bays: number;
    rows: number;
    label: string;
  }>;
  /** Number of AGVs roaming the apron. */
  agvCount: number;
  /** Container size used across all scenes (metres-ish world units). */
  containerSize: { length: number; height: number; depth: number };
}

export const DEFAULT_PORT: PortLayout = {
  craneXPositions: [-85, 0, 85],
  yardBlocks: [
    { id: 'yard-block-1', origin: [-145, 38], bays: 8, rows: 6, label: 'A区' },
    { id: 'yard-block-2', origin: [-40, 38], bays: 8, rows: 6, label: 'B区' },
    { id: 'yard-block-3', origin: [65, 38], bays: 8, rows: 6, label: 'C区' },
  ],
  agvCount: 6,
  containerSize: { length: 12, height: 8.5, depth: 5.5 },
};
