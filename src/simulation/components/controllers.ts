import type {
  ComponentModelDefinition,
  ComponentState,
  ActiveFault,
  SimulateResult,
  LogEvent,
  EventLevel,
} from '@/types';

// ============================================================
// GENERIC MCU (Controller with user firmware)
// ============================================================
export const GenericMCU: ComponentModelDefinition = {
  type: 'GenericMCU',
  displayName: 'Generic MCU',
  category: 'CONTROLLER',
  icon: 'Cpu',
  pins: [
    { id: 'input0', name: 'input0', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input1', name: 'input1', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input2', name: 'input2', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input3', name: 'input3', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input4', name: 'input4', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'input5', name: 'input5', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output0', name: 'output0', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'output1', name: 'output1', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'output2', name: 'output2', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'output3', name: 'output3', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'output4', name: 'output4', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'output5', name: 'output5', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [],
  defaultFirmware: `// MCU Firmware — runs every simulation tick
// Available: inputs.input0, inputs.input1, ..., state, emit('output0', value), log('message')

const temp = inputs.input0;

if (temp > 30) {
  emit('output2', true);  // enable fan
  log('Temperature high — fan ON');
} else {
  emit('output2', false);
  log('Temperature normal — fan OFF');
}
`,
  faultTypes: [
    { id: 'CRASH', name: 'Firmware Crash', description: 'Firmware stops executing randomly', parameters: [{ id: 'crashDuration', name: 'Crash Duration', type: 'number', defaultValue: 5000000, unit: 'µs' }] },
    { id: 'RESET', name: 'Reset', description: 'Clears state and restarts', parameters: [] },
    { id: 'SLOW', name: 'Slow Response', description: 'Adds 500ms latency to outputs', parameters: [{ id: 'latency', name: 'Latency', type: 'number', defaultValue: 500000, unit: 'µs' }] },
  ],
  simulate(inputs, state, properties, time, deltaTime, faults, emit, log) {
    const events: LogEvent[] = [];
    const outputs: Record<string, number | boolean | string> = {};

    // Check crash fault
    const crashFault = faults.find(f => f.faultId === 'CRASH');
    if (crashFault) {
      const crashStart = (state._crashStart as number) ?? time;
      const crashDur = (crashFault.parameters.crashDuration as number) ?? 5000000;
      if ((time - crashStart) < crashDur) {
        return {
          outputs: state._lastOutputs as Record<string, number | boolean | string> ?? {},
          newState: { ...state, _crashStart: crashStart },
          events,
        };
      }
    }

    // Reset fault
    const resetFault = faults.find(f => f.faultId === 'RESET');
    const firmwareState = resetFault ? {} : ((state._userState as Record<string, unknown>) ?? {});

    // Execute firmware
    const firmware = (state._firmware as string) || '';
    if (!firmware) {
      return { outputs, newState: { ...state, _lastOutputs: outputs }, events };
    }

    const emittedOutputs: Record<string, number | boolean | string> = {};
    const emitFn = (pin: string, value: number | boolean | string) => {
      emittedOutputs[pin] = value;
    };
    const logFn = (msg: string) => {
      if (log) log(msg, 'INFO');
    };

    try {
      const fn = new Function('inputs', 'state', 'emit', 'log', firmware);
      fn(inputs, firmwareState, emitFn, logFn);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (log) log(`Firmware error: ${errMsg}`, 'ERROR');
    }

    // Slow fault: delay output delivery
    const slowFault = faults.find(f => f.faultId === 'SLOW');
    if (slowFault) {
      const pendingOutputs = (state._pendingOutputs as Array<{ time: number; outputs: Record<string, number | boolean | string> }>) ?? [];
      pendingOutputs.push({ time: time + ((slowFault.parameters.latency as number) ?? 500000), outputs: { ...emittedOutputs } });
      
      const readyOutputs: Record<string, number | boolean | string> = {};
      const stillPending: Array<{ time: number; outputs: Record<string, number | boolean | string> }> = [];
      for (const p of pendingOutputs) {
        if (p.time <= time) {
          Object.assign(readyOutputs, p.outputs);
        } else {
          stillPending.push(p);
        }
      }

      return {
        outputs: readyOutputs,
        newState: { ...state, _userState: firmwareState, _lastOutputs: readyOutputs, _pendingOutputs: stillPending },
        events,
      };
    }

    return {
      outputs: emittedOutputs,
      newState: { ...state, _userState: firmwareState, _lastOutputs: emittedOutputs },
      events,
    };
  },
};

// ============================================================
// PID CONTROLLER
// ============================================================
export const PIDController: ComponentModelDefinition = {
  type: 'PIDController',
  displayName: 'PID Controller',
  category: 'CONTROLLER',
  icon: 'Sliders',
  pins: [
    { id: 'processValue', name: 'processValue', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'controlOutput', name: 'controlOutput', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'error', name: 'error', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'kp', name: 'Kp (Proportional)', type: 'number', defaultValue: 1.0, min: 0, max: 100, step: 0.1 },
    { id: 'ki', name: 'Ki (Integral)', type: 'number', defaultValue: 0.1, min: 0, max: 100, step: 0.01 },
    { id: 'kd', name: 'Kd (Derivative)', type: 'number', defaultValue: 0.05, min: 0, max: 100, step: 0.01 },
    { id: 'setpoint', name: 'Setpoint', type: 'number', defaultValue: 25, min: -1000, max: 1000, step: 0.1 },
    { id: 'outputMin', name: 'Output Min', type: 'number', defaultValue: 0, min: -1000, max: 1000 },
    { id: 'outputMax', name: 'Output Max', type: 'number', defaultValue: 100, min: -1000, max: 1000 },
  ],
  faultTypes: [
    { id: 'INTEGRAL_WINDUP', name: 'Integral Windup', description: 'Disables anti-windup clamping', parameters: [] },
    { id: 'STUCK_OUTPUT', name: 'Stuck Output', description: 'Output frozen at current value', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, deltaTime, faults) {
    const pv = (inputs.processValue as number) ?? 0;
    const kp = properties.kp as number;
    const ki = properties.ki as number;
    const kd = properties.kd as number;
    const sp = properties.setpoint as number;
    const outMin = properties.outputMin as number;
    const outMax = properties.outputMax as number;

    const stuckFault = faults.find(f => f.faultId === 'STUCK_OUTPUT');
    if (stuckFault) {
      const stuckVal = (state.lastOutput as number) ?? 0;
      return { outputs: { controlOutput: stuckVal, error: sp - pv }, newState: state, events: [] };
    }

    const error = sp - pv;
    const prevError = (state.prevError as number) ?? error;
    let integral = (state.integral as number) ?? 0;
    const dt = deltaTime / 1000000; // convert µs to s

    integral += error * dt;

    // Anti-windup (unless fault injected)
    const windupFault = faults.find(f => f.faultId === 'INTEGRAL_WINDUP');
    if (!windupFault) {
      integral = Math.max(outMin / Math.max(ki, 0.001), Math.min(outMax / Math.max(ki, 0.001), integral));
    }

    const derivative = dt > 0 ? (error - prevError) / dt : 0;
    let output = kp * error + ki * integral + kd * derivative;
    output = Math.max(outMin, Math.min(outMax, output));

    return {
      outputs: { controlOutput: Math.round(output * 100) / 100, error: Math.round(error * 100) / 100 },
      newState: { prevError: error, integral, lastOutput: output },
      events: [],
    };
  },
};

// ============================================================
// TIMER MODULE
// ============================================================
export const TimerModule: ComponentModelDefinition = {
  type: 'TimerModule',
  displayName: 'Timer Module',
  category: 'CONTROLLER',
  icon: 'Timer',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'reset', name: 'reset', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'elapsed', name: 'elapsed', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'timeout', name: 'timeout', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'period', name: 'Period', type: 'number', defaultValue: 1000000, min: 1000, max: 60000000, unit: 'µs' },
    { id: 'mode', name: 'Mode', type: 'select', defaultValue: 'oneshot', options: [{ label: 'One-shot', value: 'oneshot' }, { label: 'Repeating', value: 'repeating' }] },
  ],
  faultTypes: [],
  simulate(inputs, state, properties, time, _deltaTime, _faults) {
    const enable = inputs.enable as boolean;
    const resetIn = inputs.reset as boolean;
    const period = properties.period as number;
    const mode = properties.mode as string;

    if (resetIn || !enable) {
      return { outputs: { elapsed: 0, timeout: false }, newState: { startTime: time, fired: false }, events: [] };
    }

    const startTime = (state.startTime as number) ?? time;
    const fired = (state.fired as boolean) ?? false;
    const elapsed = time - startTime;

    if (elapsed >= period) {
      if (mode === 'repeating') {
        return { outputs: { elapsed: elapsed % period, timeout: true }, newState: { startTime: time, fired: false }, events: [] };
      }
      return { outputs: { elapsed: period, timeout: true }, newState: { startTime, fired: true }, events: [] };
    }

    return { outputs: { elapsed, timeout: false }, newState: { startTime, fired }, events: [] };
  },
};

// ============================================================
// STATE MACHINE BLOCK
// ============================================================
export const StateMachineBlock: ComponentModelDefinition = {
  type: 'StateMachineBlock',
  displayName: 'State Machine',
  category: 'CONTROLLER',
  icon: 'GitBranch',
  pins: [
    { id: 'trigger', name: 'trigger', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'input0', name: 'input0', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'currentState', name: 'currentState', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'output0', name: 'output0', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'numStates', name: 'Number of States', type: 'number', defaultValue: 3, min: 2, max: 16 },
  ],
  defaultFirmware: `// State Machine — define transitions
// state.current = current state index (starts at 0)
// inputs.trigger = transition trigger
// inputs.input0 = numeric input for conditions

if (inputs.trigger && state.current === undefined) {
  state.current = 0;
}

if (inputs.trigger) {
  state.current = (state.current + 1) % 3;
}

emit('currentState', state.current || 0);
emit('output0', state.current === 1);
`,
  faultTypes: [],
  simulate(inputs, state, _properties, _time, _deltaTime, _faults, emit, log) {
    const firmware = (state._firmware as string) || '';
    if (!firmware) {
      return { outputs: { currentState: 0, output0: false }, newState: state, events: [] };
    }

    const emitted: Record<string, number | boolean | string> = {};
    const emitFn = (pin: string, value: number | boolean | string) => { emitted[pin] = value; };
    const logFn = (msg: string) => { if (log) log(msg, 'INFO'); };
    const userState = (state._userState as Record<string, unknown>) ?? {};

    try {
      const fn = new Function('inputs', 'state', 'emit', 'log', firmware);
      fn(inputs, userState, emitFn, logFn);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (log) log(`State machine error: ${errMsg}`, 'ERROR');
    }

    return {
      outputs: emitted,
      newState: { ...state, _userState: userState },
      events: [],
    };
  },
};

// ============================================================
// RULE ENGINE BLOCK
// ============================================================
export const RuleEngineBlock: ComponentModelDefinition = {
  type: 'RuleEngineBlock',
  displayName: 'Rule Engine',
  category: 'CONTROLLER',
  icon: 'BookOpen',
  pins: [
    { id: 'input0', name: 'input0', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input1', name: 'input1', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'input2', name: 'input2', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'output0', name: 'output0', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'output1', name: 'output1', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [],
  defaultFirmware: `// Rule Engine — define rules as conditions
// Available: inputs.input0, inputs.input1, inputs.input2
// Use emit('output0', true/false) to set outputs

if (inputs.input0 > 50 && inputs.input2) {
  emit('output0', true);
} else {
  emit('output0', false);
}

emit('output1', inputs.input1 > 100);
`,
  faultTypes: [],
  simulate(inputs, state, _properties, _time, _deltaTime, _faults, emit, log) {
    const firmware = (state._firmware as string) || '';
    if (!firmware) return { outputs: { output0: false, output1: false }, newState: state, events: [] };

    const emitted: Record<string, number | boolean | string> = {};
    const emitFn = (pin: string, value: number | boolean | string) => { emitted[pin] = value; };
    const logFn = (msg: string) => { if (log) log(msg, 'INFO'); };
    const userState = (state._userState as Record<string, unknown>) ?? {};

    try {
      const fn = new Function('inputs', 'state', 'emit', 'log', firmware);
      fn(inputs, userState, emitFn, logFn);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (log) log(`Rule engine error: ${errMsg}`, 'ERROR');
    }

    return { outputs: emitted, newState: { ...state, _userState: userState }, events: [] };
  },
};
