import { create } from 'zustand';
import type { SceneLevel, DigitalEmployee, AgentMessage, PortMetrics, AGVData, CraneData } from '../types';
import { INITIAL_COUNTS, advanceProcess } from '../sim/processModel';
import { optimizeStowage, generateManifest, type LoadPlan } from '../sim/stowageOptimizer';
import { CONTAINER_DIMS } from '../sim/stability';

/* The 配载数字员工's load plan is computed once, deterministically, at startup:
   the naive "manual" baseline and the optimised plan. Toggling between them
   in the L3 view re-renders the cargo and moves the CoG marker for real. */
const STOWAGE = optimizeStowage(generateManifest(), CONTAINER_DIMS, { seed: 1, iterations: 4000 });

/* ═══════════════════════════════════════════════
   智港数字员工 SmartPort Digital Workforce — Global State Store (Zustand)
   ═══════════════════════════════════════════════ */

export type ThemeMode = 'day' | 'night';
export type StowageMode = 'manual' | 'ai';

interface AppState {
  // Scene navigation
  currentScene: SceneLevel;
  selectedObjectId: string | null;
  isTransitioning: boolean;
  navigateTo: (scene: SceneLevel, objectId?: string) => void;

  // Visual theme (day / night)
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;

  // Simulation
  simRunning: boolean;
  simSpeed: number; // 1x, 2x, 4x
  toggleSim: () => void;
  setSimSpeed: (speed: number) => void;

  // 数字员工 Digital Employees
  agents: DigitalEmployee[];
  agentMessages: AgentMessage[];
  selectedAgentId: string | null;
  selectAgent: (id: string | null) => void;
  addAgentMessage: (msg: AgentMessage) => void;
  updateAgentStatus: (id: string, status: DigitalEmployee['status'], lastAction?: string) => void;
  bumpAgentMetrics: () => void;

  // Agent detail page (opened by clicking a 数字员工 marker)
  agentDetailId: string | null;
  openAgentDetail: (id: string) => void;
  closeAgentDetail: () => void;

  // ROI / 降本增效 panel
  roiPanelOpen: boolean;
  openRoiPanel: () => void;
  closeRoiPanel: () => void;

  // 数字员工上岗 opening overlay
  introOpen: boolean;
  dismissIntro: () => void;

  // 一键路演 guided tour
  tourActive: boolean;
  tourStep: number;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (n: number) => void;

  // 数字员工问答 assistant
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;

  // 商业计划 & 落地承诺 panel
  bizPanelOpen: boolean;
  openBizPanel: () => void;
  closeBizPanel: () => void;

  // Port metrics
  metrics: PortMetrics;
  updateMetrics: (partial: Partial<PortMetrics>) => void;

  // Container lifecycle process (live in-transit count per stage)
  processCounts: number[];
  tickProcess: () => void;

  // Stowage optimisation (L3 — 配载数字员工): manual baseline vs AI-optimised plan
  stowageMode: StowageMode;
  stowageBaseline: LoadPlan;
  stowageOptimized: LoadPlan;
  setStowageMode: (mode: StowageMode) => void;
  toggleStowageMode: () => void;

  // Equipment
  cranes: CraneData[];
  agvs: AGVData[];

  // UI
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
}

const initialAgents: DigitalEmployee[] = [
  {
    id: 'data-agent',
    type: 'data',
    name: '单证数字员工',
    role: 'Documentation Agent',
    status: 'active',
    metrics: { processed: 2847, pending: 12 },
  },
  {
    id: 'stowage-agent',
    type: 'stowage',
    name: '配载数字员工',
    role: 'Stowage Agent',
    status: 'computing',
    metrics: { iterations: STOWAGE.iterations, bestUtilization: +(STOWAGE.optimized.utilization * 100).toFixed(1) },
  },
  {
    id: 'safety-agent',
    type: 'safety',
    name: '安全数字员工',
    role: 'Safety Agent',
    status: 'monitoring',
    metrics: { checksCompleted: 1563, vetoes: 4 },
  },
  {
    id: 'dispatch-agent',
    type: 'dispatch',
    name: '调度数字员工',
    role: 'Dispatch Agent',
    status: 'active',
    metrics: { tasksAssigned: 892, efficiency: 94.2 },
  },
  {
    id: 'exec-agent',
    type: 'execution',
    name: '执行数字员工',
    role: 'Execution Agent',
    status: 'standby',
    metrics: { instructionsSent: 1342, successRate: 99.6 },
  },
];

const initialMetrics: PortMetrics = {
  throughputTEU: 847,
  craneUtilization: 78.3,
  agvTrips: 234,
  safetyScore: 99.2,
  yardOccupancy: 65.4,
  avgLoadTime: 42,
};

export const useAppStore = create<AppState>((set) => ({
  // Scene
  currentScene: 'port',
  selectedObjectId: null,
  isTransitioning: false,
  navigateTo: (scene, objectId) =>
    set({ isTransitioning: true, currentScene: scene, selectedObjectId: objectId ?? null }),

  // Theme — default to day; night is toggled from the top bar
  theme: 'day',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'night' ? 'day' : 'night' })),
  setTheme: (theme) => set({ theme }),

  // Simulation
  simRunning: true,
  simSpeed: 1,
  toggleSim: () => set((s) => ({ simRunning: !s.simRunning })),
  setSimSpeed: (speed) => set({ simSpeed: speed }),

  // Agents
  agents: initialAgents,
  agentMessages: [],
  selectedAgentId: null,
  selectAgent: (id) => set({ selectedAgentId: id }),
  addAgentMessage: (msg) =>
    set((s) => ({ agentMessages: [msg, ...s.agentMessages].slice(0, 50) })),
  updateAgentStatus: (id, status, lastAction) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status, lastAction, lastActionTime: Date.now() } : a
      ),
    })),
  bumpAgentMetrics: () =>
    set((s) => ({
      agents: s.agents.map((a) => {
        const m = { ...a.metrics };
        const n = (k: string) => (m[k] as number) ?? 0;
        switch (a.type) {
          case 'data':
            m.processed = n('processed') + Math.floor(Math.random() * 4);
            m.pending = Math.max(0, 8 + Math.floor(Math.random() * 10));
            break;
          case 'stowage':
            // keep the headline utilisation honest (it is the real optimiser
            // result); only the cumulative search-iteration counter ticks up
            m.iterations = n('iterations') + Math.floor(20 + Math.random() * 180);
            break;
          case 'safety':
            m.checksCompleted = n('checksCompleted') + Math.floor(Math.random() * 3);
            break;
          case 'dispatch':
            m.tasksAssigned = n('tasksAssigned') + Math.floor(Math.random() * 3);
            m.efficiency = +(93 + Math.random() * 3).toFixed(1);
            break;
          case 'execution':
            m.instructionsSent = n('instructionsSent') + Math.floor(Math.random() * 2);
            break;
        }
        return { ...a, metrics: m };
      }),
    })),

  // Agent detail page
  agentDetailId: null,
  openAgentDetail: (id) => set({ agentDetailId: id }),
  closeAgentDetail: () => set({ agentDetailId: null }),

  // ROI / 降本增效 panel
  roiPanelOpen: false,
  openRoiPanel: () => set({ roiPanelOpen: true }),
  closeRoiPanel: () => set({ roiPanelOpen: false }),

  // 数字员工上岗 opening overlay — shown on load, front-and-centre for 路演
  introOpen: true,
  dismissIntro: () => set({ introOpen: false }),

  // 一键路演 guided tour — auto-narrated L1→L2→L3 walkthrough
  tourActive: false,
  tourStep: 0,
  startTour: () => set({ tourActive: true, tourStep: 0, introOpen: false, roiPanelOpen: false, agentDetailId: null }),
  stopTour: () => set({ tourActive: false }),
  setTourStep: (n) => set({ tourStep: n }),

  // 数字员工问答 assistant
  assistantOpen: false,
  openAssistant: () => set({ assistantOpen: true }),
  closeAssistant: () => set({ assistantOpen: false }),

  // 商业计划 & 落地承诺 panel
  bizPanelOpen: false,
  openBizPanel: () => set({ bizPanelOpen: true }),
  closeBizPanel: () => set({ bizPanelOpen: false }),

  // Metrics
  metrics: initialMetrics,
  updateMetrics: (partial) =>
    set((s) => ({ metrics: { ...s.metrics, ...partial } })),

  // Process pipeline
  processCounts: INITIAL_COUNTS,
  tickProcess: () =>
    set((s) => {
      const { counts, completed } = advanceProcess(s.processCounts);
      return {
        processCounts: counts,
        metrics: { ...s.metrics, throughputTEU: s.metrics.throughputTEU + completed },
      };
    }),

  // Stowage optimisation — default to the AI plan so the demo opens strong
  stowageMode: 'ai',
  stowageBaseline: STOWAGE.baseline,
  stowageOptimized: STOWAGE.optimized,
  setStowageMode: (mode) => set({ stowageMode: mode }),
  toggleStowageMode: () => set((s) => ({ stowageMode: s.stowageMode === 'ai' ? 'manual' : 'ai' })),

  // Equipment
  cranes: [],
  agvs: [],

  // UI
  rightPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
}));

// Dev-only handle for quick inspection / scripted navigation.
if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useAppStore }).__store = useAppStore;
}
