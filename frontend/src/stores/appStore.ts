import { create } from 'zustand';
import type { SceneLevel, OCAgent, AgentMessage, PortMetrics, AGVData, CraneData } from '../types';
import { INITIAL_COUNTS, advanceProcess } from '../sim/processModel';

/* ═══════════════════════════════════════════════
   OC Cargo Claw — Global State Store (Zustand)
   ═══════════════════════════════════════════════ */

export type ThemeMode = 'day' | 'night';

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

  // OC Agents
  agents: OCAgent[];
  agentMessages: AgentMessage[];
  selectedAgentId: string | null;
  selectAgent: (id: string | null) => void;
  addAgentMessage: (msg: AgentMessage) => void;
  updateAgentStatus: (id: string, status: OCAgent['status'], lastAction?: string) => void;
  bumpAgentMetrics: () => void;

  // Agent detail page (opened by clicking an OC marker)
  agentDetailId: string | null;
  openAgentDetail: (id: string) => void;
  closeAgentDetail: () => void;

  // Port metrics
  metrics: PortMetrics;
  updateMetrics: (partial: Partial<PortMetrics>) => void;

  // Container lifecycle process (live in-transit count per stage)
  processCounts: number[];
  tickProcess: () => void;

  // Equipment
  cranes: CraneData[];
  agvs: AGVData[];

  // UI
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
}

const initialAgents: OCAgent[] = [
  {
    id: 'data-agent',
    type: 'data',
    name: '箱单 OC',
    role: 'Data Agent',
    status: 'active',
    metrics: { processed: 2847, pending: 12 },
  },
  {
    id: 'lobster-agent',
    type: 'lobster',
    name: '堆叠 OC',
    role: 'Lobster Agent',
    status: 'computing',
    metrics: { iterations: 12847, bestUtilization: 87.3 },
  },
  {
    id: 'safety-agent',
    type: 'safety',
    name: '安全 OC',
    role: 'Safety Agent',
    status: 'monitoring',
    metrics: { checksCompleted: 1563, vetoes: 4 },
  },
  {
    id: 'dispatch-agent',
    type: 'dispatch',
    name: '调度 OC',
    role: 'Dispatch Agent',
    status: 'active',
    metrics: { tasksAssigned: 892, efficiency: 94.2 },
  },
  {
    id: 'exec-agent',
    type: 'execution',
    name: '指令 OC',
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
          case 'lobster':
            m.iterations = n('iterations') + Math.floor(20 + Math.random() * 180);
            m.bestUtilization = +(85.5 + Math.random() * 3).toFixed(1);
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
