/* ═══════════════════════════════════════════════
   OC Cargo Claw — Core Type Definitions
   ═══════════════════════════════════════════════ */

// ── Scene Management ──
export type SceneLevel = 'port' | 'yard' | 'container';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface SceneTransition {
  from: SceneLevel;
  to: SceneLevel;
  targetId?: string; // e.g. yard block ID or container ID
}

// ── Port Layout ──
export interface BerthConfig {
  id: string;
  position: [number, number];
  length: number;
  vessel?: VesselData;
}

export interface YardBlock {
  id: string;
  position: [number, number];
  rows: number;
  bays: number;
  tiers: number;
  containers: ContainerSlot[];
}

export interface ContainerSlot {
  id: string;
  bay: number;
  row: number;
  tier: number;
  container?: ContainerData;
}

// ── Container & Cargo ──
export interface ContainerData {
  id: string;
  type: '20GP' | '40GP' | '40HQ' | '45HQ';
  weight: number; // kg
  status: 'loaded' | 'empty' | 'loading' | 'discharging';
  color?: string;
  destination?: string;
  cargoItems?: CargoItem[];
}

export interface CargoItem {
  id: string;
  name: string;
  dimensions: { length: number; width: number; height: number }; // mm
  weight: number; // kg
  position: { x: number; y: number; z: number }; // mm from container origin
  rotation?: number;
  fragile?: boolean;
  hazardous?: boolean;
}

// ── Vessel ──
export interface VesselData {
  id: string;
  name: string;
  imo: string;
  length: number;
  berthId: string;
  eta?: Date;
  etd?: Date;
  containerCount: number;
}

// ── Equipment ──
export interface CraneData {
  id: string;
  type: 'QC' | 'RTG' | 'ARMG'; // Quay Crane / Rubber-Tired Gantry / Auto Rail Mounted Gantry
  position: [number, number];
  status: 'idle' | 'working' | 'maintenance';
  currentTask?: string;
}

export interface AGVData {
  id: string;
  position: [number, number];
  heading: number; // degrees
  status: 'moving' | 'loading' | 'idle' | 'charging';
  battery: number; // 0-100
  currentPath?: [number, number][];
  carryingContainer?: string;
}

// ── OC Agents ──
export type AgentType = 'data' | 'lobster' | 'safety' | 'dispatch' | 'execution';
export type AgentStatus = 'active' | 'computing' | 'monitoring' | 'standby' | 'error';

export interface OCAgent {
  id: string;
  type: AgentType;
  name: string;
  role: string;
  status: AgentStatus;
  metrics: Record<string, number | string>;
  lastAction?: string;
  lastActionTime?: number;
}

export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType | 'ALL';
  content: string;
  timestamp: number;
  type: 'info' | 'warning' | 'decision' | 'veto';
}

// ── Center of Gravity ──
export interface CoGResult {
  center: { x: number; y: number; z: number };
  deviation: { x: number; y: number };
  isWithinLimit: boolean;
  maxTiltAngle: number;
  riskLevel: 'safe' | 'warning' | 'critical';
}

// ── Analytics ──
export interface PortMetrics {
  throughputTEU: number;
  craneUtilization: number;
  agvTrips: number;
  safetyScore: number;
  yardOccupancy: number;
  avgLoadTime: number; // minutes
}
