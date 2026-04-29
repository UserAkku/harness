// ============================================================
// HARNESS — Core Simulation Types
// ============================================================

// --- Component Categories ---
export type ComponentCategory = 'SENSOR' | 'CONTROLLER' | 'ACTUATOR' | 'NETWORK' | 'LOGIC' | 'POWER';

// --- Pin Definitions ---
export type PinDirection = 'input' | 'output';
export type PinDataType = 'number' | 'boolean' | 'string';

export interface PinDefinition {
  id: string;
  name: string;
  direction: PinDirection;
  dataType: PinDataType;
  defaultValue: number | boolean | string;
  description?: string;
}

// --- Property Definitions ---
export type PropertyType = 'number' | 'boolean' | 'string' | 'select';

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string | number }[];
  description?: string;
}

// --- Fault Definitions ---
export interface FaultParameter {
  id: string;
  name: string;
  type: 'number' | 'boolean';
  defaultValue: number | boolean;
  min?: number;
  max?: number;
  unit?: string;
}

export interface FaultDefinition {
  id: string;
  name: string;
  description: string;
  parameters: FaultParameter[];
}

export interface ActiveFault {
  faultId: string;
  componentId: string;
  startTime: number; // microseconds
  duration: number; // -1 = permanent
  parameters: Record<string, number | boolean>;
}

// --- Simulation Events ---
export interface SimEvent {
  id: string;
  time: number; // virtual microseconds
  sourceId: string;
  targetId?: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
}

export type EventLevel = 'INFO' | 'WARN' | 'ERROR' | 'FAULT' | 'DEBUG';

export interface LogEvent {
  id: string;
  time: number; // virtual microseconds
  componentId: string;
  componentName: string;
  eventType: string;
  data: string;
  level: EventLevel;
}

// --- Component State ---
export type ComponentState = Record<string, unknown>;

export interface SimulateResult {
  outputs: Record<string, number | boolean | string>;
  newState: ComponentState;
  events: LogEvent[];
}

// --- Component Model Interface ---
export interface ComponentModelDefinition {
  type: string;
  displayName: string;
  category: ComponentCategory;
  icon: string; // lucide icon name
  pins: PinDefinition[];
  defaultProperties: PropertyDefinition[];
  faultTypes: FaultDefinition[];
  defaultFirmware?: string;
  simulate: (
    inputs: Record<string, number | boolean | string>,
    state: ComponentState,
    properties: Record<string, number | boolean | string>,
    time: number,
    deltaTime: number,
    faults: ActiveFault[],
    emit?: (event: string, value: unknown) => void,
    log?: (message: string, level?: EventLevel) => void,
  ) => SimulateResult;
}

// --- Component Instance (on canvas) ---
export interface ComponentInstance {
  id: string;
  type: string;
  name: string;
  category: ComponentCategory;
  position: { x: number; y: number };
  properties: Record<string, number | boolean | string>;
  firmware?: string;
  pinValues: Record<string, number | boolean | string>;
  state: ComponentState;
  faults: ActiveFault[];
  status: 'idle' | 'running' | 'fault' | 'offline';
  waveformData: Record<string, number[]>; // pin -> last N values
}

// --- Connection ---
export interface Connection {
  id: string;
  sourceComponentId: string;
  sourcePin: string;
  targetComponentId: string;
  targetPin: string;
}

// --- Simulation Status ---
export type SimulationStatus = 'stopped' | 'running' | 'paused';
export type SimulationSpeed = 0.1 | 0.5 | 1 | 2 | 5 | 10 | -1; // -1 = MAX

// --- System Snapshot ---
export interface SystemSnapshot {
  time: number;
  components: Record<string, {
    pinValues: Record<string, number | boolean | string>;
    state: ComponentState;
    status: 'idle' | 'running' | 'fault' | 'offline';
  }>;
  eventCount: number;
}

// --- Test Types ---
export interface TestCase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'skip';
  expected?: string;
  actual?: string;
  error?: string;
  duration?: number; // ms
  logs?: string[];
}

export interface TestSuite {
  id: string;
  name: string;
  code: string;
  tests: TestCase[];
  overallStatus: 'pending' | 'running' | 'pass' | 'fail' | 'error';
  passRate?: number;
}

// --- Fault Scenario ---
export interface FaultScenario {
  id: string;
  name: string;
  description: string;
  faults: Omit<ActiveFault, 'startTime'>[];
}

// --- Simulation Config ---
export interface SimulationConfig {
  tickIntervalUs: number; // microseconds per tick
  maxEventsPerTick: number;
  defaultSpeed: SimulationSpeed;
}

// --- Project ---
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  canvas: {
    components: ComponentInstance[];
    connections: Connection[];
    viewport: { x: number; y: number; zoom: number };
  };
  tests: TestSuite[];
  faultScenarios: FaultScenario[];
  simulationConfig: SimulationConfig;
}

// --- Worker Messages ---
export interface WorkerCommand {
  type: 'init' | 'start' | 'pause' | 'stop' | 'step' | 'setSpeed' | 'injectFault' | 'clearFault' | 'setInput' | 'updateComponent' | 'addComponent' | 'removeComponent' | 'addConnection' | 'removeConnection' | 'getState' | 'reset';
  payload?: unknown;
}

export interface WorkerResponse {
  type: 'tick' | 'state' | 'log' | 'error' | 'status';
  payload: unknown;
}

export interface TickPayload {
  time: number;
  components: Record<string, {
    pinValues: Record<string, number | boolean | string>;
    state: ComponentState;
    status: 'idle' | 'running' | 'fault' | 'offline';
  }>;
  events: LogEvent[];
}
