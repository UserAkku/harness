import type {
  ComponentModelDefinition,
} from '@/types';

// ============================================================
// RELAY
// ============================================================
export const Relay: ComponentModelDefinition = {
  type: 'Relay',
  displayName: 'Relay',
  category: 'ACTUATOR',
  icon: 'ToggleLeft',
  pins: [
    { id: 'control', name: 'control', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'contact', name: 'contact', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'switchTime', name: 'Switch Time', type: 'number', defaultValue: 10000, min: 1000, max: 100000, unit: 'µs' },
    { id: 'normallyOpen', name: 'Normally Open', type: 'boolean', defaultValue: true },
  ],
  faultTypes: [
    { id: 'WELDED_CLOSED', name: 'Welded Closed', description: 'Contact permanently closed', parameters: [] },
    { id: 'WELDED_OPEN', name: 'Welded Open', description: 'Contact permanently open', parameters: [] },
    { id: 'CHATTERING', name: 'Chattering', description: 'Rapid on/off oscillation', parameters: [] },
  ],
  simulate(inputs, state, properties, time, _deltaTime, faults) {
    const control = inputs.control as boolean;
    const switchTime = properties.switchTime as number;
    const normallyOpen = properties.normallyOpen as boolean;

    if (faults.find(f => f.faultId === 'WELDED_CLOSED')) return { outputs: { contact: true }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'WELDED_OPEN')) return { outputs: { contact: false }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'CHATTERING')) return { outputs: { contact: Math.random() > 0.5 }, newState: state, events: [] };

    const prevControl = (state.prevControl as boolean) ?? control;
    const lastChangeTime = (state.lastChangeTime as number) ?? 0;
    const currentContact = (state.currentContact as boolean) ?? (normallyOpen ? false : true);

    if (control !== prevControl) {
      // Control signal changed, start switch delay
      return {
        outputs: { contact: currentContact },
        newState: { prevControl: control, lastChangeTime: time, currentContact, targetContact: normallyOpen ? control : !control },
        events: [],
      };
    }

    const targetContact = (state.targetContact as boolean) ?? currentContact;
    if (currentContact !== targetContact && (time - lastChangeTime) >= switchTime) {
      return {
        outputs: { contact: targetContact },
        newState: { prevControl: control, lastChangeTime, currentContact: targetContact, targetContact },
        events: [],
      };
    }

    return {
      outputs: { contact: currentContact },
      newState: { prevControl: control, lastChangeTime, currentContact, targetContact },
      events: [],
    };
  },
};

// ============================================================
// DC MOTOR
// ============================================================
export const DCMotor: ComponentModelDefinition = {
  type: 'DCMotor',
  displayName: 'DC Motor',
  category: 'ACTUATOR',
  icon: 'Cog',
  pins: [
    { id: 'power', name: 'power', direction: 'input', dataType: 'number', defaultValue: 0, description: '0-100%' },
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'rpm', name: 'rpm', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'current', name: 'current', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'stalled', name: 'stalled', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'maxRPM', name: 'Max RPM', type: 'number', defaultValue: 3000, min: 100, max: 20000, unit: 'RPM' },
    { id: 'inertia', name: 'Inertia', type: 'number', defaultValue: 500000, min: 10000, max: 5000000, unit: 'µs' },
    { id: 'stallCurrent', name: 'Stall Current', type: 'number', defaultValue: 2, min: 0.1, max: 50, unit: 'A' },
    { id: 'noLoadCurrent', name: 'No-Load Current', type: 'number', defaultValue: 0.2, min: 0.01, max: 5, unit: 'A' },
  ],
  faultTypes: [
    { id: 'STALLED', name: 'Stalled', description: 'Motor stalled, drawing max current', parameters: [] },
    { id: 'ERRATIC_SPEED', name: 'Erratic Speed', description: 'Random speed fluctuations', parameters: [] },
    { id: 'OVERCURRENT', name: 'Overcurrent', description: 'Drawing excessive current', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, deltaTime, faults) {
    const power = Math.max(0, Math.min(100, (inputs.power as number) ?? 0));
    const enable = inputs.enable as boolean;
    const maxRPM = properties.maxRPM as number;
    const inertia = properties.inertia as number;
    const stallCurrent = properties.stallCurrent as number;
    const noLoadCurrent = properties.noLoadCurrent as number;
    const currentRPM = (state.currentRPM as number) ?? 0;

    if (faults.find(f => f.faultId === 'STALLED')) {
      return { outputs: { rpm: 0, current: stallCurrent, stalled: true }, newState: { currentRPM: 0 }, events: [] };
    }

    if (!enable) {
      const alpha = inertia > 0 ? Math.min(1, deltaTime / inertia) : 1;
      const newRPM = currentRPM * (1 - alpha);
      return { outputs: { rpm: Math.round(newRPM), current: newRPM > 1 ? noLoadCurrent * 0.5 : 0, stalled: false }, newState: { currentRPM: newRPM }, events: [] };
    }

    const targetRPM = (power / 100) * maxRPM;
    const alpha = inertia > 0 ? Math.min(1, deltaTime / inertia) : 1;
    let newRPM = currentRPM + alpha * (targetRPM - currentRPM);

    if (faults.find(f => f.faultId === 'ERRATIC_SPEED')) {
      newRPM += (Math.random() - 0.5) * maxRPM * 0.3;
      newRPM = Math.max(0, newRPM);
    }

    const loadFactor = 1 - (newRPM / maxRPM);
    let current = noLoadCurrent + (stallCurrent - noLoadCurrent) * loadFactor * (power / 100);

    if (faults.find(f => f.faultId === 'OVERCURRENT')) {
      current *= 3;
    }

    return {
      outputs: { rpm: Math.round(newRPM), current: Math.round(current * 100) / 100, stalled: false },
      newState: { currentRPM: newRPM },
      events: [],
    };
  },
};

// ============================================================
// SERVO
// ============================================================
export const Servo: ComponentModelDefinition = {
  type: 'Servo',
  displayName: 'Servo Motor',
  category: 'ACTUATOR',
  icon: 'RotateCw',
  pins: [
    { id: 'targetAngle', name: 'targetAngle', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'currentAngle', name: 'currentAngle', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'moving', name: 'moving', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'minAngle', name: 'Min Angle', type: 'number', defaultValue: -90, min: -180, max: 0, unit: '°' },
    { id: 'maxAngle', name: 'Max Angle', type: 'number', defaultValue: 90, min: 0, max: 180, unit: '°' },
    { id: 'speed', name: 'Speed', type: 'number', defaultValue: 600, min: 100, max: 2000, unit: '°/s' },
  ],
  faultTypes: [
    { id: 'JAMMED', name: 'Jammed', description: 'Servo unable to move', parameters: [] },
    { id: 'DRIFTING', name: 'Drifting', description: 'Slowly drifts from position', parameters: [{ id: 'driftRate', name: 'Drift Rate', type: 'number', defaultValue: 0.5, unit: '°/tick' }] },
  ],
  simulate(inputs, state, properties, _time, deltaTime, faults) {
    const target = (inputs.targetAngle as number) ?? 0;
    const minA = properties.minAngle as number;
    const maxA = properties.maxAngle as number;
    const speed = properties.speed as number;
    const current = (state.currentAngle as number) ?? 0;
    const clampedTarget = Math.max(minA, Math.min(maxA, target));

    if (faults.find(f => f.faultId === 'JAMMED')) {
      return { outputs: { currentAngle: current, moving: false }, newState: { currentAngle: current }, events: [] };
    }

    const dtSec = deltaTime / 1000000;
    const maxMove = speed * dtSec;
    const diff = clampedTarget - current;
    let newAngle = current;

    if (Math.abs(diff) < 0.1) {
      newAngle = clampedTarget;
    } else {
      newAngle = current + Math.sign(diff) * Math.min(Math.abs(diff), maxMove);
    }

    const driftFault = faults.find(f => f.faultId === 'DRIFTING');
    if (driftFault) {
      const rate = (driftFault.parameters.driftRate as number) ?? 0.5;
      newAngle += rate;
    }

    newAngle = Math.max(minA, Math.min(maxA, newAngle));
    const moving = Math.abs(newAngle - clampedTarget) > 0.1;

    return {
      outputs: { currentAngle: Math.round(newAngle * 10) / 10, moving },
      newState: { currentAngle: newAngle },
      events: [],
    };
  },
};

// ============================================================
// LED / LAMP
// ============================================================
export const LEDLamp: ComponentModelDefinition = {
  type: 'LEDLamp',
  displayName: 'LED / Lamp',
  category: 'ACTUATOR',
  icon: 'Lightbulb',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'brightness', name: 'brightness', direction: 'input', dataType: 'number', defaultValue: 100, description: '0-100%' },
    { id: 'isOn', name: 'isOn', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'actualBrightness', name: 'actualBrightness', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'color', name: 'Color', type: 'select', defaultValue: 'white', options: [{ label: 'White', value: 'white' }, { label: 'Red', value: 'red' }, { label: 'Green', value: 'green' }, { label: 'Blue', value: 'blue' }, { label: 'Amber', value: 'amber' }] },
  ],
  faultTypes: [
    { id: 'BURNED_OUT', name: 'Burned Out', description: 'LED is dead', parameters: [] },
    { id: 'FLICKERING', name: 'Flickering', description: 'Random flickering', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    const enable = inputs.enable as boolean;
    const brightness = (inputs.brightness as number) ?? 100;

    if (faults.find(f => f.faultId === 'BURNED_OUT')) return { outputs: { isOn: false, actualBrightness: 0 }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'FLICKERING')) {
      const flicker = enable && Math.random() > 0.3;
      return { outputs: { isOn: flicker, actualBrightness: flicker ? brightness * Math.random() : 0 }, newState: state, events: [] };
    }

    return {
      outputs: { isOn: enable, actualBrightness: enable ? brightness : 0 },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// BUZZER
// ============================================================
export const Buzzer: ComponentModelDefinition = {
  type: 'Buzzer',
  displayName: 'Buzzer',
  category: 'ACTUATOR',
  icon: 'Bell',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'frequency', name: 'frequency', direction: 'input', dataType: 'number', defaultValue: 2000 },
    { id: 'sounding', name: 'sounding', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'maxFrequency', name: 'Max Frequency', type: 'number', defaultValue: 5000, min: 100, max: 20000, unit: 'Hz' },
  ],
  faultTypes: [
    { id: 'STUCK_ON', name: 'Stuck On', description: 'Always sounding', parameters: [] },
    { id: 'DEAD', name: 'Dead', description: 'No sound output', parameters: [] },
  ],
  simulate(inputs, _state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'STUCK_ON')) return { outputs: { sounding: true }, newState: {}, events: [] };
    if (faults.find(f => f.faultId === 'DEAD')) return { outputs: { sounding: false }, newState: {}, events: [] };
    return { outputs: { sounding: inputs.enable as boolean }, newState: {}, events: [] };
  },
};

// ============================================================
// VALVE
// ============================================================
export const Valve: ComponentModelDefinition = {
  type: 'Valve',
  displayName: 'Valve',
  category: 'ACTUATOR',
  icon: 'Pipette',
  pins: [
    { id: 'control', name: 'control', direction: 'input', dataType: 'number', defaultValue: 0, description: '0-100% open' },
    { id: 'position', name: 'position', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'flowRate', name: 'flowRate', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'maxFlowRate', name: 'Max Flow Rate', type: 'number', defaultValue: 100, min: 1, max: 10000, unit: 'L/min' },
    { id: 'responseTime', name: 'Response Time', type: 'number', defaultValue: 200000, min: 10000, max: 5000000, unit: 'µs' },
  ],
  faultTypes: [
    { id: 'STUCK_OPEN', name: 'Stuck Open', description: 'Valve stuck fully open', parameters: [] },
    { id: 'STUCK_CLOSED', name: 'Stuck Closed', description: 'Valve stuck closed', parameters: [] },
    { id: 'LEAKING', name: 'Leaking', description: 'Valve leaks when closed', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, deltaTime, faults) {
    const control = Math.max(0, Math.min(100, (inputs.control as number) ?? 0));
    const maxFlow = properties.maxFlowRate as number;
    const responseTime = properties.responseTime as number;
    const currentPos = (state.position as number) ?? 0;

    if (faults.find(f => f.faultId === 'STUCK_OPEN')) return { outputs: { position: 100, flowRate: maxFlow }, newState: { position: 100 }, events: [] };
    if (faults.find(f => f.faultId === 'STUCK_CLOSED')) return { outputs: { position: 0, flowRate: 0 }, newState: { position: 0 }, events: [] };

    const alpha = responseTime > 0 ? Math.min(1, deltaTime / responseTime) : 1;
    const newPos = currentPos + alpha * (control - currentPos);
    let flowRate = (newPos / 100) * maxFlow;

    if (faults.find(f => f.faultId === 'LEAKING') && newPos < 5) flowRate = maxFlow * 0.05;

    return {
      outputs: { position: Math.round(newPos * 10) / 10, flowRate: Math.round(flowRate * 100) / 100 },
      newState: { position: newPos },
      events: [],
    };
  },
};

// ============================================================
// PUMP
// ============================================================
export const Pump: ComponentModelDefinition = {
  type: 'Pump',
  displayName: 'Pump',
  category: 'ACTUATOR',
  icon: 'ArrowUpFromDot',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'speed', name: 'speed', direction: 'input', dataType: 'number', defaultValue: 0, description: '0-100%' },
    { id: 'flowRate', name: 'flowRate', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'running', name: 'running', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'maxFlowRate', name: 'Max Flow Rate', type: 'number', defaultValue: 50, min: 1, max: 5000, unit: 'L/min' },
  ],
  faultTypes: [
    { id: 'SEIZED', name: 'Seized', description: 'Pump seized and not running', parameters: [] },
    { id: 'CAVITATION', name: 'Cavitation', description: 'Erratic flow output', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const enable = inputs.enable as boolean;
    const speed = Math.max(0, Math.min(100, (inputs.speed as number) ?? 0));
    const maxFlow = properties.maxFlowRate as number;

    if (faults.find(f => f.faultId === 'SEIZED')) return { outputs: { flowRate: 0, running: false }, newState: state, events: [] };

    if (!enable) return { outputs: { flowRate: 0, running: false }, newState: state, events: [] };

    let flow = (speed / 100) * maxFlow;
    if (faults.find(f => f.faultId === 'CAVITATION')) flow *= (0.3 + Math.random() * 0.7);

    return {
      outputs: { flowRate: Math.round(flow * 100) / 100, running: true },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// HEATER
// ============================================================
export const Heater: ComponentModelDefinition = {
  type: 'Heater',
  displayName: 'Heater',
  category: 'ACTUATOR',
  icon: 'Flame',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'power', name: 'power', direction: 'input', dataType: 'number', defaultValue: 0, description: '0-100%' },
    { id: 'heatOutput', name: 'heatOutput', direction: 'output', dataType: 'number', defaultValue: 0, description: 'Watts' },
    { id: 'active', name: 'active', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'maxPower', name: 'Max Power', type: 'number', defaultValue: 1000, min: 10, max: 10000, unit: 'W' },
  ],
  faultTypes: [
    { id: 'ELEMENT_BROKEN', name: 'Element Broken', description: 'Heating element broken', parameters: [] },
    { id: 'RUNAWAY', name: 'Thermal Runaway', description: 'Always at max power', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const enable = inputs.enable as boolean;
    const power = Math.max(0, Math.min(100, (inputs.power as number) ?? 0));
    const maxP = properties.maxPower as number;

    if (faults.find(f => f.faultId === 'ELEMENT_BROKEN')) return { outputs: { heatOutput: 0, active: false }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'RUNAWAY')) return { outputs: { heatOutput: maxP, active: true }, newState: state, events: [] };

    if (!enable) return { outputs: { heatOutput: 0, active: false }, newState: state, events: [] };

    return {
      outputs: { heatOutput: (power / 100) * maxP, active: true },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// DISPLAY
// ============================================================
export const Display: ComponentModelDefinition = {
  type: 'Display',
  displayName: 'Display',
  category: 'ACTUATOR',
  icon: 'Monitor',
  pins: [
    { id: 'line1', name: 'line1', direction: 'input', dataType: 'string', defaultValue: '' },
    { id: 'line2', name: 'line2', direction: 'input', dataType: 'string', defaultValue: '' },
    { id: 'backlight', name: 'backlight', direction: 'input', dataType: 'boolean', defaultValue: true },
    { id: 'active', name: 'active', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [
    { id: 'type', name: 'Display Type', type: 'select', defaultValue: 'LCD16x2', options: [{ label: 'LCD 16x2', value: 'LCD16x2' }, { label: 'OLED 128x64', value: 'OLED' }] },
  ],
  faultTypes: [
    { id: 'DEAD_PIXELS', name: 'Dead Pixels', description: 'Some pixels not working', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Display not responding', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'OFFLINE')) return { outputs: { active: false }, newState: state, events: [] };
    return { outputs: { active: true }, newState: { line1: inputs.line1, line2: inputs.line2, backlight: inputs.backlight }, events: [] };
  },
};
