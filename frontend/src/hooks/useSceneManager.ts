import { useEffect, useRef, useCallback } from 'react';
import { SceneManager } from '../core/engine/SceneManager';
import { createScene } from '../scenes/registry';
import { useAppStore } from '../stores/appStore';

/* ═══════════════════════════════════════════════
   useSceneManager — React ↔ Three.js bridge

   Owns the SceneManager lifecycle and keeps the active
   3D scene in sync with the store's navigation state.
   Scene swaps go through the registry, so the bridge
   never needs to know which concrete scenes exist.
   ═══════════════════════════════════════════════ */

export function useSceneManager() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);

  const navigateTo = useAppStore((s) => s.navigateTo);
  const currentScene = useAppStore((s) => s.currentScene);
  const selectedObjectId = useAppStore((s) => s.selectedObjectId);
  const theme = useAppStore((s) => s.theme);

  const handleObjectClick = useCallback(
    (id: string, type: string) => {
      if (type === 'yardBlock') {
        navigateTo('yard', id);
      } else if (type === 'container') {
        navigateTo('container', id);
      }
    },
    [navigateTo]
  );

  // Create the engine once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || managerRef.current) return;

    const manager = new SceneManager({ canvas, onObjectClick: handleObjectClick });
    managerRef.current = manager;

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [handleObjectClick]);

  // Swap scenes whenever navigation state or theme changes.
  // Scenes read the active theme from the store at build time, so a
  // theme switch simply rebuilds the current scene with new palettes.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.loadScene(createScene(currentScene), selectedObjectId ?? undefined);
  }, [currentScene, selectedObjectId, theme]);

  return { canvasRef, managerRef };
}
