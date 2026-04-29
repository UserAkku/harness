import type { ComponentModelDefinition } from '@/types';

// ============================================================
// BATTERY
// ============================================================
export const Battery: ComponentModelDefinition = {
  type: 'Battery',
  displayName: 'Battery',
  category: 'POWER',
  icon: 'BatteryMedium',
  pins: [
    { id: 'load', name: 'load', direction: 'input', dataType: 'number', defaultValue: 0, description: 'Current draw (A)' },
    { id: 'voltage', name: 'voltage', direction: 'output', dataType: 'number', defaultValue: 3.7 },
    { id: 'soc', name: 'soc', direction: 'output', dataType: 'number', defaultValue: 100, description: 'State of charge %' },
    { id: 'lowBattery', name: 'lowBattery', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'nominalVoltage', name: 'Nominal Voltage', type: 'number', defaultValue: 3.7, min: 1, max: 48, step: 0.1, unit: 'V' },
    { id: 'capacity', name: 'Capacity', type: 'number', defaultValue: 2000, min: 100, max: 100000, unit: 'mAh' },
    { id: 'lowThreshold', name: 'Low Battery Threshold', type: 'number', defaultValue: 20, min: 5, max: 50, unit: '%' },
  ],
  faultTypes: [
    { id: 'DEAD', name: 'Dead Battery', description: 'Battery completely discharged', parameters: [] },
    { id: 'SWELLING', name: 'Swelling', description: 'Erratic voltage output', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, deltaTime, faults) {
    const load = (inputs.load as number) ?? 0;
    const nomV = properties.nominalVoltage as number;
    const capacity = properties.capacity as number;
    const lowThresh = properties.lowThreshold as number;
    let soc = (state.soc as number) ?? 100;

    if (faults.find(f => f.faultId === 'DEAD')) {
      return { outputs: { voltage: 0, soc: 0, lowBattery: true }, newState: { soc: 0 }, events: [] };
    }

    // Discharge: mAh consumed per tick
    const hours = deltaTime / (3600 * 1000000);
    const consumed = load * 1000 * hours; // mA * hours = mAh
    soc = Math.max(0, soc - (consumed / capacity) * 100);

    let voltage = nomV * (0.8 + 0.2 * (soc / 100));
    if (faults.find(f => f.faultId === 'SWELLING')) {
      voltage += (Math.random() - 0.5) * 0.5;
    }

    return {
      outputs: { voltage: Math.round(voltage * 100) / 100, soc: Math.round(soc * 10) / 10, lowBattery: soc < lowThresh },
      newState: { soc },
      events: [],
    };
  },
};

// ============================================================
// POWER SUPPLY
// ============================================================
export const PowerSupply: ComponentModelDefinition = {
  type: 'PowerSupply',
  displayName: 'Power Supply',
  category: 'POWER',
  icon: 'Plug',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: true },
    { id: 'voltage', name: 'voltage', direction: 'output', dataType: 'number', defaultValue: 5 },
    { id: 'stable', name: 'stable', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [
    { id: 'outputVoltage', name: 'Output Voltage', type: 'number', defaultValue: 5, min: 1, max: 48, step: 0.1, unit: 'V' },
    { id: 'ripple', name: 'Ripple', type: 'number', defaultValue: 0.01, min: 0, max: 1, step: 0.001, unit: 'V' },
  ],
  faultTypes: [
    { id: 'BROWNOUT', name: 'Brownout', description: 'Voltage drops below nominal', parameters: [{ id: 'dropPercent', name: 'Voltage Drop', type: 'number', defaultValue: 30, unit: '%' }] },
    { id: 'FAILURE', name: 'Failure', description: 'Complete power failure', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const enable = inputs.enable as boolean;
    const outV = properties.outputVoltage as number;
    const ripple = properties.ripple as number;

    if (!enable || faults.find(f => f.faultId === 'FAILURE')) {
      return { outputs: { voltage: 0, stable: false }, newState: state, events: [] };
    }

    const brownout = faults.find(f => f.faultId === 'BROWNOUT');
    let voltage = outV + (Math.random() - 0.5) * ripple * 2;
    if (brownout) {
      const drop = (brownout.parameters.dropPercent as number) ?? 30;
      voltage *= (1 - drop / 100);
    }

    return {
      outputs: { voltage: Math.round(voltage * 1000) / 1000, stable: !brownout },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// WATCHDOG TIMER
// ============================================================
export const WatchdogTimer: ComponentModelDefinition = {
  type: 'WatchdogTimer',
  displayName: 'Watchdog Timer',
  category: 'POWER',
  icon: 'ShieldAlert',
  pins: [
    { id: 'kick', name: 'kick', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: true },
    { id: 'resetTrigger', name: 'resetTrigger', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'timeRemaining', name: 'timeRemaining', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'timeout', name: 'Timeout', type: 'number', defaultValue: 5000000, min: 100000, max: 60000000, unit: 'µs' },
  ],
  faultTypes: [],
  simulate(inputs, state, properties, time) {
    const kick = inputs.kick as boolean;
    const enable = inputs.enable as boolean;
    const timeout = properties.timeout as number;
    const lastKick = (state.lastKick as number) ?? time;

    if (!enable) {
      return { outputs: { resetTrigger: false, timeRemaining: timeout }, newState: { lastKick: time }, events: [] };
    }

    let newLastKick = lastKick;
    if (kick) newLastKick = time;

    const elapsed = time - newLastKick;
    const resetTrigger = elapsed >= timeout;

    if (resetTrigger) newLastKick = time; // Auto-reset after trigger

    return {
      outputs: { resetTrigger, timeRemaining: Math.max(0, timeout - elapsed) },
      newState: { lastKick: newLastKick },
      events: [],
    };
  },
};
