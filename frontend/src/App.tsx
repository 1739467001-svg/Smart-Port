import { TopBar } from './components/ui/TopBar';
import { MetricsHUD } from './components/hud/MetricsHUD';
import { ProcessFlowBar } from './components/hud/ProcessFlowBar';
import { StowagePanel } from './components/hud/StowagePanel';
import { AgentPanel } from './components/panels/AgentPanel';
import { AgentDetail } from './components/panels/AgentDetail';
import { useSceneManager } from './hooks/useSceneManager';
import { useSimulation } from './hooks/useSimulation';
import { useAppStore } from './stores/appStore';
import styles from './App.module.css';

/* ═══════════════════════════════════════════════
   OC Cargo Claw — Main Application Shell
   ═══════════════════════════════════════════════ */

const SCENE_HINTS: Record<string, string> = {
  port: '左键拖拽旋转 · 滚轮缩放 · 点击堆场下钻 L2 · 点击 OC 光标查看智能体详情',
  yard: '点击任意集装箱下钻到 L3 内部 · 顶部面包屑可返回全港',
  container: 'L3 单箱视图 · 发光球体为货物重心 (CoG) · 顶部面包屑可返回',
};

export default function App() {
  const { canvasRef } = useSceneManager();
  useSimulation();
  const currentScene = useAppStore((s) => s.currentScene);

  return (
    <div className={styles.app}>
      <TopBar />

      <div className={styles.main}>
        {/* 3D Viewport */}
        <div className={styles.viewport}>
          <canvas ref={canvasRef} className={styles.canvas} />
          <MetricsHUD />

          {/* Bottom hint (lifted above the lifecycle bar on the port view) */}
          <div
            className={styles.hint}
            style={currentScene === 'port' ? { bottom: 126 } : undefined}
          >
            {SCENE_HINTS[currentScene] ?? SCENE_HINTS.port}
          </div>

          {/* Container lifecycle dashboard — only on the port overview */}
          {currentScene === 'port' && <ProcessFlowBar />}

          {/* Stowage optimizer control — only on the L3 single-container view */}
          {currentScene === 'container' && <StowagePanel />}

          {/* OC agent detail page — opens when an OC marker is clicked */}
          <AgentDetail />
        </div>

        {/* Right panel */}
        <AgentPanel />
      </div>
    </div>
  );
}
