import type { ComponentModelDefinition } from '@/types';

// ============================================================
// AND GATE
// ============================================================
export const ANDGate: ComponentModelDefinition = {
  type: 'ANDGate',
  displayName: 'AND Gate',
  category: 'LOGIC',
  icon: 'CircuitBoard',
  pins: [
    { id: 'inputA', name: 'inputA', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'inputB', name: 'inputB', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output', name: 'output', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [],
  faultTypes: [
    { id: 'STUCK_HIGH', name: 'Stuck High', description: 'Output always true', parameters: [] },
    { id: 'STUCK_LOW', name: 'Stuck Low', description: 'Output always false', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'STUCK_HIGH')) return { outputs: { output: true }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'STUCK_LOW')) return { outputs: { output: false }, newState: state, events: [] };
    return { outputs: { output: (inputs.inputA as boolean) && (inputs.inputB as boolean) }, newState: state, events: [] };
  },
};

// ============================================================
// OR GATE
// ============================================================
export const ORGate: ComponentModelDefinition = {
  type: 'ORGate',
  displayName: 'OR Gate',
  category: 'LOGIC',
  icon: 'CircuitBoard',
  pins: [
    { id: 'inputA', name: 'inputA', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'inputB', name: 'inputB', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output', name: 'output', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [],
  faultTypes: [
    { id: 'STUCK_HIGH', name: 'Stuck High', description: 'Output always true', parameters: [] },
    { id: 'STUCK_LOW', name: 'Stuck Low', description: 'Output always false', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'STUCK_HIGH')) return { outputs: { output: true }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'STUCK_LOW')) return { outputs: { output: false }, newState: state, events: [] };
    return { outputs: { output: (inputs.inputA as boolean) || (inputs.inputB as boolean) }, newState: state, events: [] };
  },
};

// ============================================================
// NOT GATE
// ============================================================
export const NOTGate: ComponentModelDefinition = {
  type: 'NOTGate',
  displayName: 'NOT Gate',
  category: 'LOGIC',
  icon: 'CircuitBoard',
  pins: [
    { id: 'input', name: 'input', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output', name: 'output', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [],
  faultTypes: [],
  simulate(inputs, state, _properties, _time, _deltaTime, _faults) {
    return { outputs: { output: !(inputs.input as boolean) }, newState: state, events: [] };
  },
};

// ============================================================
// COMPARATOR
// ============================================================
export const Comparator: ComponentModelDefinition = {
  type: 'Comparator',
  displayName: 'Comparator',
  category: 'LOGIC',
  icon: 'ArrowLeftRight',
  pins: [
    { id: 'inputA', name: 'inputA', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'inputB', name: 'inputB', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'aGreater', name: 'aGreater', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'equal', name: 'equal', direction: 'output', dataType: 'boolean', defaultValue: true },
    { id: 'bGreater', name: 'bGreater', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'tolerance', name: 'Tolerance', type: 'number', defaultValue: 0.01, min: 0, max: 10, step: 0.001 },
  ],
  faultTypes: [],
  simulate(inputs, state, properties) {
    const a = (inputs.inputA as number) ?? 0;
    const b = (inputs.inputB as number) ?? 0;
    const tol = (properties.tolerance as number) ?? 0.01;
    const eq = Math.abs(a - b) <= tol;
    return {
      outputs: { aGreater: !eq && a > b, equal: eq, bGreater: !eq && b > a },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// THRESHOLD BLOCK
// ============================================================
export const ThresholdBlock: ComponentModelDefinition = {
  type: 'ThresholdBlock',
  displayName: 'Threshold Block',
  category: 'LOGIC',
  icon: 'Minus',
  pins: [
    { id: 'value', name: 'value', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'triggered', name: 'triggered', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'threshold', name: 'Threshold', type: 'number', defaultValue: 50, min: -10000, max: 10000, step: 0.1 },
    { id: 'hysteresis', name: 'Hysteresis', type: 'number', defaultValue: 2, min: 0, max: 100, step: 0.1 },
    { id: 'mode', name: 'Mode', type: 'select', defaultValue: 'ABOVE', options: [{ label: 'Above', value: 'ABOVE' }, { label: 'Below', value: 'BELOW' }] },
  ],
  faultTypes: [],
  simulate(inputs, state, properties) {
    const value = (inputs.value as number) ?? 0;
    const threshold = properties.threshold as number;
    const hysteresis = properties.hysteresis as number;
    const mode = properties.mode as string;
    const wasTriggered = (state.triggered as boolean) ?? false;

    let triggered: boolean;
    if (mode === 'ABOVE') {
      triggered = wasTriggered ? value > (threshold - hysteresis) : value > (threshold + hysteresis);
    } else {
      triggered = wasTriggered ? value < (threshold + hysteresis) : value < (threshold - hysteresis);
    }

    return { outputs: { triggered }, newState: { triggered }, events: [] };
  },
};

// ============================================================
// DEBOUNCE BLOCK
// ============================================================
export const DebounceBlock: ComponentModelDefinition = {
  type: 'DebounceBlock',
  displayName: 'Debounce Block',
  category: 'LOGIC',
  icon: 'Timer',
  pins: [
    { id: 'input', name: 'input', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output', name: 'output', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'debounceTime', name: 'Debounce Time', type: 'number', defaultValue: 50000, min: 1000, max: 1000000, unit: 'µs' },
  ],
  faultTypes: [],
  simulate(inputs, state, properties, time) {
    const input = inputs.input as boolean;
    const debounceTime = properties.debounceTime as number;
    const lastChange = (state.lastChangeTime as number) ?? 0;
    const lastInput = (state.lastInput as boolean) ?? false;
    const stableValue = (state.stableValue as boolean) ?? false;

    if (input !== lastInput) {
      return { outputs: { output: stableValue }, newState: { lastChangeTime: time, lastInput: input, stableValue }, events: [] };
    }

    if ((time - lastChange) >= debounceTime && input !== stableValue) {
      return { outputs: { output: input }, newState: { lastChangeTime: lastChange, lastInput: input, stableValue: input }, events: [] };
    }

    return { outputs: { output: stableValue }, newState: { lastChangeTime: lastChange, lastInput: input, stableValue }, events: [] };
  },
};

// ============================================================
// FILTER BLOCK (Moving Average)
// ============================================================
export const FilterBlock: ComponentModelDefinition = {
  type: 'FilterBlock',
  displayName: 'Filter Block',
  category: 'LOGIC',
  icon: 'Activity',
  pins: [
    { id: 'input', name: 'input', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'output', name: 'output', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'windowSize', name: 'Window Size', type: 'number', defaultValue: 10, min: 2, max: 100 },
    { id: 'filterType', name: 'Filter Type', type: 'select', defaultValue: 'movingAverage', options: [{ label: 'Moving Average', value: 'movingAverage' }, { label: 'Exponential', value: 'exponential' }] },
    { id: 'alpha', name: 'Alpha (EMA)', type: 'number', defaultValue: 0.2, min: 0.01, max: 1, step: 0.01 },
  ],
  faultTypes: [],
  simulate(inputs, state, properties) {
    const input = (inputs.input as number) ?? 0;
    const filterType = properties.filterType as string;
    const windowSize = properties.windowSize as number;
    const alpha = properties.alpha as number;

    if (filterType === 'exponential') {
      const prev = (state.emaValue as number) ?? input;
      const newVal = alpha * input + (1 - alpha) * prev;
      return { outputs: { output: Math.round(newVal * 1000) / 1000 }, newState: { emaValue: newVal }, events: [] };
    }

    // Moving average
    const buffer = ((state.buffer as number[]) ?? []).slice();
    buffer.push(input);
    if (buffer.length > windowSize) buffer.shift();
    const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;

    return { outputs: { output: Math.round(avg * 1000) / 1000 }, newState: { buffer }, events: [] };
  },
};
