import { create } from 'zustand';
import type { SimulationStatus, SimulationSpeed, LogEvent, TickPayload } from '@/types';
import { SimulationEngine } from '@/simulation/engine/SimulationEngine';

interface SimulationState {
  // Engine
  engine: SimulationEngine | null;
  status: SimulationStatus;
  speed: SimulationSpeed;
  virtualTime: number; // microseconds

  // Live data
  componentStates: TickPayload['components'];
  eventLog: LogEvent[];
  maxLogSize: number;

  // Waveform signals
  selectedSignals: { componentId: string; componentName: string; pin: string }[];

  // Actions
  initEngine: () => void;
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  step: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setStatus: (status: SimulationStatus) => void;
  setVirtualTime: (time: number) => void;
  updateComponentStates: (states: TickPayload['components']) => void;
  appendEvents: (events: LogEvent[]) => void;
  clearLog: () => void;
  addSignal: (componentId: string, componentName: string, pin: string) => void;
  removeSignal: (componentId: string, pin: string) => void;
  injectFault: (componentId: string, faultId: string, params: Record<string, number | boolean>, duration: number) => void;
  clearFault: (componentId: string, faultId?: string) => void;
  setInput: (componentId: string, pin: string, value: number | boolean | string) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  engine: null,
  status: 'stopped',
  speed: 1,
  virtualTime: 0,
  componentStates: {},
  eventLog: [],
  maxLogSize: 100000,
  selectedSignals: [],

  initEngine: () => {
    if (get().engine) return; // Prevent multiple initializations

    // Run engine on main thread directly (avoids Comlink serialization issues
    // with new Function() in firmware execution)
    const engine = new SimulationEngine();
    
    engine.setCallbacks({
      onTick: (payload: TickPayload) => {
        set({
          virtualTime: payload.time,
          componentStates: payload.components,
        });
      },
      onLog: (events: LogEvent[]) => {
        const state = get();
        const newLog = [...state.eventLog, ...events];
        if (newLog.length > state.maxLogSize) {
          set({ eventLog: newLog.slice(-state.maxLogSize / 2) });
        } else {
          set({ eventLog: newLog });
        }
      },
      onStatusChange: (status: SimulationStatus) => {
        set({ status });
      },
    });
    
    set({ engine });
  },

  start: () => {
    const { engine } = get();
    engine?.start();
    set({ status: 'running' });
  },

  pause: () => {
    const { engine } = get();
    engine?.pause();
    set({ status: 'paused' });
  },

  stop: () => {
    const { engine } = get();
    engine?.stop();
    set({ status: 'stopped' });
  },

  reset: () => {
    const { engine } = get();
    engine?.reset();
    set({ status: 'stopped', virtualTime: 0, componentStates: {}, eventLog: [] });
  },

  step: () => {
    const { engine } = get();
    engine?.step();
  },

  setSpeed: (speed) => {
    const { engine } = get();
    engine?.setSpeed(speed);
    set({ speed });
  },

  setStatus: (status) => set({ status }),
  setVirtualTime: (time) => set({ virtualTime: time }),
  updateComponentStates: (states) => set({ componentStates: states }),

  appendEvents: (events) => {
    set(state => {
      const newLog = [...state.eventLog, ...events];
      return { eventLog: newLog.length > state.maxLogSize ? newLog.slice(-state.maxLogSize / 2) : newLog };
    });
  },

  clearLog: () => set({ eventLog: [] }),

  addSignal: (componentId, componentName, pin) => {
    set(state => {
      const exists = state.selectedSignals.some(s => s.componentId === componentId && s.pin === pin);
      if (exists) return state;
      return { selectedSignals: [...state.selectedSignals, { componentId, componentName, pin }] };
    });
  },

  removeSignal: (componentId, pin) => {
    set(state => ({
      selectedSignals: state.selectedSignals.filter(s => !(s.componentId === componentId && s.pin === pin)),
    }));
  },

  injectFault: (componentId, faultId, params, duration) => {
    const { engine, virtualTime } = get();
    engine?.injectFault(componentId, {
      faultId,
      componentId,
      startTime: virtualTime,
      duration,
      parameters: params,
    });
  },

  clearFault: (componentId, faultId) => {
    const { engine } = get();
    engine?.clearFault(componentId, faultId);
  },

  setInput: (componentId, pin, value) => {
    const { engine } = get();
    engine?.setInput(componentId, pin, value);
  },
}));
