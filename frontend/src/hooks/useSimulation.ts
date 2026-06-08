import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';

/* ═══════════════════════════════════════════════
   useSimulation — Drives the OC agent simulation
   
   Updates port metrics and agent communication
   at regular intervals when sim is running.
   ═══════════════════════════════════════════════ */

export function useSimulation() {
  const simRunning = useAppStore((s) => s.simRunning);
  const updateMetrics = useAppStore((s) => s.updateMetrics);
  const addAgentMessage = useAppStore((s) => s.addAgentMessage);
  const updateAgentStatus = useAppStore((s) => s.updateAgentStatus);
  const tickProcess = useAppStore((s) => s.tickProcess);
  const bumpAgentMetrics = useAppStore((s) => s.bumpAgentMetrics);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!simRunning) return;

    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      // Advance the container lifecycle pipeline (drives throughputTEU)
      tickProcess();
      // Nudge per-agent metrics so the agent detail pages stay live
      bumpAgentMetrics();

      // Update metrics with slight random fluctuation
      updateMetrics({
        craneUtilization: Math.min(100, Math.max(60, 78.3 + (Math.random() - 0.5) * 2)),
        agvTrips: 234 + Math.floor(tick * 0.3),
        safetyScore: Math.min(100, Math.max(95, 99.2 + (Math.random() - 0.4) * 0.3)),
        yardOccupancy: Math.min(95, Math.max(40, 65.4 + (Math.random() - 0.5) * 1)),
        avgLoadTime: Math.max(20, 42 - tick * 0.05 + (Math.random() - 0.5) * 2),
      });

      // Cycle agent statuses for visual interest
      if (tick % 5 === 0) {
        const agentCycle: Array<{ id: string; status: 'active' | 'computing' | 'monitoring'; action: string }> = [
          { id: 'data-agent', status: 'active', action: `批次 F-${2024 + Math.floor(tick / 10)}-${String(890 + tick).padStart(4, '0')} 数据清洗完成` },
          { id: 'lobster-agent', status: 'computing', action: `Bay #${3 + (tick % 8)} 第 ${12000 + tick * 147} 次推演` },
          { id: 'safety-agent', status: 'monitoring', action: `CoG 检查通过 — 偏移量 [${(Math.random() * 0.5).toFixed(2)}m]` },
        ];

        const current = agentCycle[tick % agentCycle.length];
        updateAgentStatus(current.id, current.status, current.action);
      }

      // Add agent messages periodically
      if (tick % 8 === 0) {
        const messages = [
          { from: 'lobster' as const, to: 'safety' as const, content: `Bay#${3 + (tick % 8)} 方案 v${12000 + tick * 147} 提交审查`, type: 'info' as const },
          { from: 'safety' as const, to: 'lobster' as const, content: 'CoG 通过 ✓ 方案批准', type: 'decision' as const },
          { from: 'dispatch' as const, to: 'execution' as const, content: `共识达成 → 执行 Bay#${3 + (tick % 8)}`, type: 'info' as const },
          { from: 'data' as const, to: 'ALL' as const, content: `新批次 F-${String(890 + tick).padStart(4, '0')} 就绪`, type: 'info' as const },
        ];
        const msg = messages[tick % messages.length];
        addAgentMessage({
          id: `msg-${Date.now()}`,
          ...msg,
          timestamp: Date.now(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [simRunning, updateMetrics, addAgentMessage, updateAgentStatus, tickProcess, bumpAgentMetrics]);
}
