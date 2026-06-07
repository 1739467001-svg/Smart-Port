import type { SceneLevel } from '../types';
import type { SceneFactory, SceneModule } from '../core/engine/Scene';
import { PortScene } from './port/PortScene';
import { YardScene } from './yard/YardScene';
import { ContainerScene } from './container/ContainerScene';

/* ═══════════════════════════════════════════════
   Scene Registry

   Single source of truth mapping a SceneLevel to the
   module that renders it. To add a brand-new viewpoint:
     1. implement SceneModule
     2. register it here
   Nothing else in the engine or UI needs to change.
   ═══════════════════════════════════════════════ */

const registry = new Map<SceneLevel, SceneFactory>();

export function registerScene(level: SceneLevel, factory: SceneFactory) {
  registry.set(level, factory);
}

export function createScene(level: SceneLevel): SceneModule {
  const factory = registry.get(level);
  if (!factory) {
    throw new Error(`[SceneRegistry] No scene registered for level "${level}"`);
  }
  return factory();
}

// ── Built-in scenes ──
registerScene('port', () => new PortScene());
registerScene('yard', () => new YardScene());
registerScene('container', () => new ContainerScene());
