import * as THREE from 'three';
import type { SceneManager } from './SceneManager';
import type { SceneLevel } from '../../types';

/* ═══════════════════════════════════════════════
   SceneModule — Pluggable scene abstraction

   Every viewpoint in the digital twin (port / yard /
   container …) is a self-contained module that:
     1. builds its own geometry into a scoped root group
     2. registers its own clickables & animations
     3. declares how the camera should frame it

   The SceneManager owns a single *active* module at a
   time and swaps them cleanly. Adding a new viewpoint =
   implement this interface + register it. No core edits.
   ═══════════════════════════════════════════════ */

export interface CameraFraming {
  position: [number, number, number];
  target: [number, number, number];
  duration?: number;
}

/** Everything a scene module needs to build itself. */
export interface SceneContext {
  manager: SceneManager;
  scene: THREE.Scene;
  /** Scene-scoped root group — torn down automatically on swap. */
  root: THREE.Group;
  /** The drill-down target id that triggered this scene (e.g. yard block id). */
  targetId?: string;
  /** Mark an object as click/raycast interactive (auto-cleared on swap). */
  registerClickable: (obj: THREE.Object3D) => void;
  /** Register a per-frame callback (auto-removed on swap). */
  addAnimation: (key: string, fn: (elapsed: number, delta: number) => void) => void;
}

export interface SceneModule {
  readonly level: SceneLevel;
  /** Build geometry into ctx.root and wire up interactivity. */
  build(ctx: SceneContext): void;
  /** Where the camera should fly when this scene becomes active. */
  getCameraFraming(targetId?: string): CameraFraming;
  /** Optional extra cleanup beyond automatic geometry disposal. */
  dispose?(): void;
}

/** Factory signature stored in the scene registry. */
export type SceneFactory = () => SceneModule;
