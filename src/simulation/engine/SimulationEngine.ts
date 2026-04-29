import type {
  ComponentInstance,
  Connection,
  LogEvent,
  SimulationStatus,
  SimulationSpeed,
  TickPayload,
  ActiveFault,
  EventLevel,
} from '@/types';
import { componentRegistry } from '../components';
import { PriorityQueue } from './PriorityQueue';

const TICK_INTERVAL_US = 100000; // 100ms per tick in virtual time
const MAX_WAVEFORM_POINTS = 200;

export class SimulationEngine {
  private components: Map<string, ComponentInstance> = new Map();
  private connections: Connection[] = [];
  private virtualTime: number = 0; // microseconds
  private speed: SimulationSpeed = 1;
  private status: SimulationStatus = 'stopped';
  private eventLog: LogEvent[] = [];
  private tickCount: number = 0;
  private eventIdCounter: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTick: ((payload: TickPayload) => void) | null = null;
  private onLog: ((events: LogEvent[]) => void) | null = null;
  private onStatusChange: ((status: SimulationStatus) => void) | null = null;

  constructor() {
    // Engine is initialized empty
  }

  // --- Setup ---
  setCallbacks(callbacks: {
    onTick?: (payload: TickPayload) => void;
    onLog?: (events: LogEvent[]) => void;
    onStatusChange?: (status: SimulationStatus) => void;
  }) {
    this.onTick = callbacks.onTick ?? null;
    this.onLog = callbacks.onLog ?? null;
    this.onStatusChange = callbacks.onStatusChange ?? null;
  }

  loadComponents(components: ComponentInstance[]) {
    this.components.clear();
    for (const comp of components) {
      this.components.set(comp.id, { ...comp });
    }
  }

  loadConnections(connections: Connection[]) {
    this.connections = [...connections];
  }

  addComponent(comp: ComponentInstance) {
    this.components.set(comp.id, { ...comp });
  }

  removeComponent(id: string) {
    this.components.delete(id);
    this.connections = this.connections.filter(
      c => c.sourceComponentId !== id && c.targetComponentId !== id
    );
  }

  updateComponent(id: string, updates: Partial<ComponentInstance>) {
    const comp = this.components.get(id);
    if (comp) {
      Object.assign(comp, updates);
    }
  }

  addConnection(conn: Connection) {
    this.connections.push(conn);
  }

  removeConnection(id: string) {
    this.connections = this.connections.filter(c => c.id !== id);
  }

  // --- Control ---
  start() {
    if (this.status === 'running') return;
    this.status = 'running';
    this.onStatusChange?.('running');

    // Set all components to running
    for (const comp of this.components.values()) {
      if (comp.status !== 'fault') comp.status = 'running';
    }

    this.scheduleLoop();
  }

  pause() {
    this.status = 'paused';
    this.onStatusChange?.('paused');
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop() {
    this.status = 'stopped';
    this.onStatusChange?.('stopped');
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.virtualTime = 0;
    this.tickCount = 0;
    this.eventLog = [];
    this.eventIdCounter = 0;
    for (const comp of this.components.values()) {
      comp.state = {};
      comp.status = 'idle';
      comp.faults = [];
      comp.waveformData = {};
      // Reset pin values to defaults
      const model = componentRegistry.get(comp.type);
      if (model) {
        for (const pin of model.pins) {
          comp.pinValues[pin.id] = pin.defaultValue;
        }
      }
    }
  }

  step() {
    if (this.status === 'running') return;
    this.executeTick();
  }

  setSpeed(speed: SimulationSpeed) {
    this.speed = speed;
    if (this.status === 'running') {
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.scheduleLoop();
    }
  }

  // --- Fault Injection ---
  injectFault(componentId: string, fault: ActiveFault) {
    const comp = this.components.get(componentId);
    if (!comp) return;
    comp.faults.push({ ...fault, startTime: this.virtualTime });
    comp.status = 'fault';
  }

  clearFault(componentId: string, faultId?: string) {
    const comp = this.components.get(componentId);
    if (!comp) return;
    if (faultId) {
      comp.faults = comp.faults.filter(f => f.faultId !== faultId);
    } else {
      comp.faults = [];
    }
    if (comp.faults.length === 0) {
      comp.status = this.status === 'running' ? 'running' : 'idle';
    }
  }

  // --- Input injection ---
  setInput(componentId: string, pin: string, value: number | boolean | string) {
    const comp = this.components.get(componentId);
    if (!comp) return;
    comp.pinValues[pin] = value;
  }

  // --- State ---
  getTime(): number {
    return this.virtualTime;
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  getSnapshot(): TickPayload {
    const components: TickPayload['components'] = {};
    for (const [id, comp] of this.components) {
      components[id] = {
        pinValues: { ...comp.pinValues },
        state: { ...comp.state },
        status: comp.status,
      };
    }
    return { time: this.virtualTime, components, events: [] };
  }

  getEventLog(): LogEvent[] {
    return this.eventLog;
  }

  // --- Internal ---
  private scheduleLoop() {
    if (this.speed === -1) {
      // MAX speed — run ticks as fast as possible using requestAnimationFrame-like loop
      const runBatch = () => {
        if (this.status !== 'running') return;
        const batchSize = 100;
        for (let i = 0; i < batchSize; i++) {
          this.executeTick();
        }
        this.intervalId = setTimeout(runBatch, 0) as unknown as ReturnType<typeof setInterval>;
      };
      runBatch();
    } else {
      const wallIntervalMs = (TICK_INTERVAL_US / 1000) / this.speed;
      this.intervalId = setInterval(() => {
        if (this.status !== 'running') return;
        this.executeTick();
      }, Math.max(1, wallIntervalMs));
    }
  }

  private executeTick() {
    const tickEvents: LogEvent[] = [];

    // Step 1: Propagate connections (source outputs → target inputs)
    for (const conn of this.connections) {
      const source = this.components.get(conn.sourceComponentId);
      const target = this.components.get(conn.targetComponentId);
      if (!source || !target) continue;

      const sourceValue = source.pinValues[conn.sourcePin];
      if (sourceValue !== undefined) {
        target.pinValues[conn.targetPin] = sourceValue;
      }
    }

    // Step 1.5: Virtual Network Routing (MQTT Broker)
    const mqttNodes = Array.from(this.components.values()).filter(c => c.type === 'MQTTNode');
    for (const node of mqttNodes) {
      if (node.status === 'fault' && node.faults.some(f => f.faultId === 'DISCONNECTED')) continue;
      
      const trigger = node.pinValues['publishTrigger'];
      const lastTrigger = node.state.lastTrigger;
      
      // Rising edge detection for publish
      if (trigger && !lastTrigger) {
        const val = node.pinValues['publish'];
        const topic = node.properties['topic'];
        const broker = node.properties['brokerAddress'];
        
        // Route to subscribers
        for (const sub of mqttNodes) {
          if (sub.id !== node.id && sub.properties['topic'] === topic && sub.properties['brokerAddress'] === broker) {
             sub.state.lastReceived = val;
             
             tickEvents.push({
               id: `evt_${this.eventIdCounter++}`,
               time: this.virtualTime,
               componentId: sub.id,
               componentName: sub.name,
               eventType: 'MQTT_RECEIVE',
               data: `[${topic}] ${val}`,
               level: 'INFO',
             });
          }
        }
      }
    }

    // Step 2: Simulate each component
    for (const [id, comp] of this.components) {
      const model = componentRegistry.get(comp.type);
      if (!model) continue;

      // Build input values from pins
      const inputs: Record<string, number | boolean | string> = {};
      for (const pin of model.pins) {
        if (pin.direction === 'input') {
          inputs[pin.id] = comp.pinValues[pin.id] ?? pin.defaultValue;
        }
      }

      // Check for expired faults
      comp.faults = comp.faults.filter(f => {
        if (f.duration === -1) return true;
        return (this.virtualTime - f.startTime) < f.duration;
      });
      if (comp.faults.length === 0 && comp.status === 'fault') {
        comp.status = 'running';
      }

      // For components with firmware, inject it into state
      if (model.defaultFirmware !== undefined || comp.firmware) {
        comp.state._firmware = comp.firmware || model.defaultFirmware || '';
      }

      // Execute simulate
      const emitFn = (event: string, value: unknown) => {
        tickEvents.push({
          id: `evt_${this.eventIdCounter++}`,
          time: this.virtualTime,
          componentId: id,
          componentName: comp.name,
          eventType: event,
          data: String(value),
          level: 'INFO',
        });
      };

      const logFn = (message: string, level?: EventLevel) => {
        tickEvents.push({
          id: `evt_${this.eventIdCounter++}`,
          time: this.virtualTime,
          componentId: id,
          componentName: comp.name,
          eventType: 'LOG',
          data: message,
          level: level || 'INFO',
        });
      };

      try {
        const result = model.simulate(
          inputs,
          comp.state,
          comp.properties,
          this.virtualTime,
          TICK_INTERVAL_US,
          comp.faults,
          emitFn,
          logFn,
        );

        // Apply outputs to pin values
        for (const [pin, value] of Object.entries(result.outputs)) {
          const prevValue = comp.pinValues[pin];
          comp.pinValues[pin] = value;

          // Log output changes
          if (prevValue !== value && this.tickCount % 5 === 0) {
            tickEvents.push({
              id: `evt_${this.eventIdCounter++}`,
              time: this.virtualTime,
              componentId: id,
              componentName: comp.name,
              eventType: 'OUTPUT_CHANGED',
              data: `${pin}=${typeof value === 'number' ? (Math.round(value * 100) / 100) : value}`,
              level: comp.faults.length > 0 ? 'WARN' : 'INFO',
            });
          }
        }

        // Update state
        comp.state = result.newState;

        // Update waveform data
        for (const pin of model.pins) {
          if (pin.direction === 'output' && pin.dataType === 'number') {
            if (!comp.waveformData[pin.id]) comp.waveformData[pin.id] = [];
            const val = comp.pinValues[pin.id] as number;
            if (typeof val === 'number' && !isNaN(val)) {
              comp.waveformData[pin.id].push(val);
              if (comp.waveformData[pin.id].length > MAX_WAVEFORM_POINTS) {
                comp.waveformData[pin.id].shift();
              }
            }
          }
        }

        // Append custom events
        tickEvents.push(...result.events);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        tickEvents.push({
          id: `evt_${this.eventIdCounter++}`,
          time: this.virtualTime,
          componentId: id,
          componentName: comp.name,
          eventType: 'SIMULATION_ERROR',
          data: errMsg,
          level: 'ERROR',
        });
      }
    }

    // Step 3: Advance time
    this.virtualTime += TICK_INTERVAL_US;
    this.tickCount++;

    // Step 4: Store events
    this.eventLog.push(...tickEvents);
    // Cap event log to prevent memory explosion
    if (this.eventLog.length > 500000) {
      this.eventLog = this.eventLog.slice(-250000);
    }

    // Step 5: Notify
    if (tickEvents.length > 0) {
      this.onLog?.(tickEvents);
    }

    // Throttle tick callbacks to every 3 ticks for performance
    if (this.tickCount % 3 === 0) {
      const snapshot = this.getSnapshot();
      snapshot.events = tickEvents;
      this.onTick?.(snapshot);
    }
  }
}
