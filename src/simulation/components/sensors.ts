import type {
  ComponentModelDefinition,
  PinDefinition,
  PropertyDefinition,
  FaultDefinition,
  ComponentState,
  ActiveFault,
  SimulateResult,
  EventLevel,
  LogEvent,
} from '@/types';

// --- Gaussian noise helper ---
function gaussianNoise(stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ============================================================
// TEMPERATURE SENSOR
// ============================================================
export const TemperatureSensor: ComponentModelDefinition = {
  type: 'TemperatureSensor',
  displayName: 'Temperature Sensor',
  category: 'SENSOR',
  icon: 'Thermometer',
  pins: [
    { id: 'ambientTemp', name: 'ambientTemp', direction: 'input', dataType: 'number', defaultValue: 25 },
    { id: 'temperature', name: 'temperature', direction: 'output', dataType: 'number', defaultValue: 25 },
    { id: 'ready', name: 'ready', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'minTemp', name: 'Min Temperature', type: 'number', defaultValue: -40, min: -273, max: 1000, unit: '°C' },
    { id: 'maxTemp', name: 'Max Temperature', type: 'number', defaultValue: 125, min: -273, max: 1000, unit: '°C' },
    { id: 'noiseLevel', name: 'Noise Level', type: 'number', defaultValue: 0.1, min: 0, max: 10, step: 0.01, unit: '°C' },
    { id: 'thermalLag', name: 'Thermal Lag', type: 'number', defaultValue: 500000, min: 0, max: 10000000, unit: 'µs' },
    { id: 'unit', name: 'Unit', type: 'select', defaultValue: 'C', options: [{ label: '°C', value: 'C' }, { label: '°F', value: 'F' }, { label: 'K', value: 'K' }] },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck Value', description: 'Returns a fixed temperature value', parameters: [{ id: 'stuckValue', name: 'Stuck Value', type: 'number', defaultValue: 25, unit: '°C' }] },
    { id: 'NOISY', name: 'Excessive Noise', description: '10x noise on readings', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Sensor returns NaN', parameters: [] },
    { id: 'DRIFT', name: 'Drift', description: 'Adds cumulative offset', parameters: [{ id: 'driftRate', name: 'Drift Rate', type: 'number', defaultValue: 0.5, unit: '°C/tick' }] },
  ],
  simulate(inputs, state, properties, time, deltaTime, faults, _emit, log) {
    const events: LogEvent[] = [];
    const ambient = (inputs.ambientTemp as number) ?? 25;
    const minT = properties.minTemp as number;
    const maxT = properties.maxTemp as number;
    const noise = properties.noiseLevel as number;
    const lag = properties.thermalLag as number;
    const prevTemp = (state.currentTemp as number) ?? ambient;
    const driftAccum = (state.driftAccum as number) ?? 0;

    // Check faults
    const stuckFault = faults.find(f => f.faultId === 'STUCK');
    const noisyFault = faults.find(f => f.faultId === 'NOISY');
    const offlineFault = faults.find(f => f.faultId === 'OFFLINE');
    const driftFault = faults.find(f => f.faultId === 'DRIFT');

    if (offlineFault) {
      if (log) log('Sensor offline — fault active', 'FAULT');
      return {
        outputs: { temperature: NaN, ready: false },
        newState: { ...state, currentTemp: prevTemp },
        events,
      };
    }

    if (stuckFault) {
      const sv = (stuckFault.parameters.stuckValue as number) ?? 25;
      if (log) log(`Sensor stuck at ${sv}°C`, 'WARN');
      return {
        outputs: { temperature: sv, ready: true },
        newState: { ...state, currentTemp: sv },
        events,
      };
    }

    // Thermal lag — exponential approach
    const alpha = lag > 0 ? Math.min(1, deltaTime / lag) : 1;
    let newTemp = prevTemp + alpha * (ambient - prevTemp);

    // Add noise
    const noiseMult = noisyFault ? 10 : 1;
    newTemp += gaussianNoise(noise * noiseMult);

    // Drift
    let newDrift = driftAccum;
    if (driftFault) {
      const rate = (driftFault.parameters.driftRate as number) ?? 0.5;
      newDrift += rate;
      newTemp += newDrift;
    }

    // Clamp
    newTemp = Math.max(minT, Math.min(maxT, newTemp));

    return {
      outputs: { temperature: Math.round(newTemp * 100) / 100, ready: true },
      newState: { currentTemp: newTemp, driftAccum: newDrift, startTime: state.startTime ?? time },
      events,
    };
  },
};

// ============================================================
// HUMIDITY SENSOR
// ============================================================
export const HumiditySensor: ComponentModelDefinition = {
  type: 'HumiditySensor',
  displayName: 'Humidity Sensor',
  category: 'SENSOR',
  icon: 'Droplets',
  pins: [
    { id: 'ambientHumidity', name: 'ambientHumidity', direction: 'input', dataType: 'number', defaultValue: 50 },
    { id: 'humidity', name: 'humidity', direction: 'output', dataType: 'number', defaultValue: 50 },
    { id: 'ready', name: 'ready', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'rangeMin', name: 'Range Min', type: 'number', defaultValue: 0, min: 0, max: 100, unit: '%' },
    { id: 'rangeMax', name: 'Range Max', type: 'number', defaultValue: 100, min: 0, max: 100, unit: '%' },
    { id: 'accuracy', name: 'Accuracy', type: 'number', defaultValue: 2, min: 0, max: 20, unit: '%' },
    { id: 'responseTime', name: 'Response Time', type: 'number', defaultValue: 1000000, min: 0, max: 10000000, unit: 'µs' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck Value', description: 'Returns fixed humidity', parameters: [{ id: 'stuckValue', name: 'Stuck Value', type: 'number', defaultValue: 50, unit: '%' }] },
    { id: 'SPIKE', name: 'Random Spikes', description: 'Random 100% spikes', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Sensor offline', parameters: [] },
  ],
  simulate(inputs, state, properties, time, deltaTime, faults) {
    const ambient = (inputs.ambientHumidity as number) ?? 50;
    const rMin = properties.rangeMin as number;
    const rMax = properties.rangeMax as number;
    const accuracy = properties.accuracy as number;
    const responseTime = properties.responseTime as number;
    const prevVal = (state.currentHumidity as number) ?? ambient;

    const offlineFault = faults.find(f => f.faultId === 'OFFLINE');
    if (offlineFault) return { outputs: { humidity: NaN, ready: false }, newState: state, events: [] };

    const stuckFault = faults.find(f => f.faultId === 'STUCK');
    if (stuckFault) {
      const sv = (stuckFault.parameters.stuckValue as number) ?? 50;
      return { outputs: { humidity: sv, ready: true }, newState: { currentHumidity: sv }, events: [] };
    }

    const alpha = responseTime > 0 ? Math.min(1, deltaTime / responseTime) : 1;
    let val = prevVal + alpha * (ambient - prevVal) + gaussianNoise(accuracy / 3);

    const spikeFault = faults.find(f => f.faultId === 'SPIKE');
    if (spikeFault && Math.random() < 0.05) val = 100;

    val = Math.max(rMin, Math.min(rMax, val));

    return {
      outputs: { humidity: Math.round(val * 10) / 10, ready: true },
      newState: { currentHumidity: val },
      events: [],
    };
  },
};

// ============================================================
// PIR SENSOR (Motion)
// ============================================================
export const PIRSensor: ComponentModelDefinition = {
  type: 'PIRSensor',
  displayName: 'PIR Motion Sensor',
  category: 'SENSOR',
  icon: 'ScanEye',
  pins: [
    { id: 'motionInput', name: 'motionInput', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'motion', name: 'motion', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'detectionAngle', name: 'Detection Angle', type: 'number', defaultValue: 110, min: 0, max: 360, unit: '°' },
    { id: 'detectionRange', name: 'Detection Range', type: 'number', defaultValue: 7, min: 0.5, max: 20, unit: 'm' },
    { id: 'holdTime', name: 'Hold Time', type: 'number', defaultValue: 2000000, min: 100000, max: 30000000, unit: 'µs' },
  ],
  faultTypes: [
    { id: 'ALWAYS_TRIGGERED', name: 'Always Triggered', description: 'Always outputs HIGH', parameters: [] },
    { id: 'NEVER_TRIGGERED', name: 'Never Triggered', description: 'Always outputs LOW', parameters: [] },
    { id: 'FLAPPING', name: 'Flapping', description: 'Random toggling', parameters: [] },
  ],
  simulate(inputs, state, properties, time, deltaTime, faults) {
    const motionIn = inputs.motionInput as boolean;
    const holdTime = properties.holdTime as number;
    const lastTrigger = (state.lastTriggerTime as number) ?? -1;

    const alwaysFault = faults.find(f => f.faultId === 'ALWAYS_TRIGGERED');
    if (alwaysFault) return { outputs: { motion: true }, newState: state, events: [] };

    const neverFault = faults.find(f => f.faultId === 'NEVER_TRIGGERED');
    if (neverFault) return { outputs: { motion: false }, newState: state, events: [] };

    const flapFault = faults.find(f => f.faultId === 'FLAPPING');
    if (flapFault) return { outputs: { motion: Math.random() > 0.5 }, newState: state, events: [] };

    let newLastTrigger = lastTrigger;
    if (motionIn) newLastTrigger = time;

    const isHigh = newLastTrigger >= 0 && (time - newLastTrigger) < holdTime;

    return {
      outputs: { motion: isHigh },
      newState: { lastTriggerTime: newLastTrigger },
      events: [],
    };
  },
};

// ============================================================
// ULTRASONIC SENSOR
// ============================================================
export const UltrasonicSensor: ComponentModelDefinition = {
  type: 'UltrasonicSensor',
  displayName: 'Ultrasonic Sensor',
  category: 'SENSOR',
  icon: 'Radar',
  pins: [
    { id: 'targetDistance', name: 'targetDistance', direction: 'input', dataType: 'number', defaultValue: 100 },
    { id: 'distance', name: 'distance', direction: 'output', dataType: 'number', defaultValue: 100 },
    { id: 'valid', name: 'valid', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [
    { id: 'minRange', name: 'Min Range', type: 'number', defaultValue: 2, min: 0, max: 10, unit: 'cm' },
    { id: 'maxRange', name: 'Max Range', type: 'number', defaultValue: 400, min: 50, max: 1000, unit: 'cm' },
    { id: 'accuracy', name: 'Accuracy', type: 'number', defaultValue: 0.3, min: 0, max: 5, step: 0.1, unit: 'cm' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck', description: 'Returns fixed distance', parameters: [{ id: 'stuckValue', name: 'Stuck Value', type: 'number', defaultValue: 50, unit: 'cm' }] },
    { id: 'NOISY', name: 'Noisy', description: 'High noise readings', parameters: [] },
    { id: 'OUT_OF_RANGE', name: 'Out of Range', description: 'Always returns max range', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const target = (inputs.targetDistance as number) ?? 100;
    const minR = properties.minRange as number;
    const maxR = properties.maxRange as number;
    const accuracy = properties.accuracy as number;

    const stuckFault = faults.find(f => f.faultId === 'STUCK');
    if (stuckFault) return { outputs: { distance: (stuckFault.parameters.stuckValue as number) ?? 50, valid: true }, newState: state, events: [] };

    const oorFault = faults.find(f => f.faultId === 'OUT_OF_RANGE');
    if (oorFault) return { outputs: { distance: maxR, valid: false }, newState: state, events: [] };

    const noiseMult = faults.find(f => f.faultId === 'NOISY') ? 10 : 1;
    let dist = target + gaussianNoise(accuracy * noiseMult);
    const valid = dist >= minR && dist <= maxR;
    dist = Math.max(minR, Math.min(maxR, dist));

    return {
      outputs: { distance: Math.round(dist * 10) / 10, valid },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// PRESSURE SENSOR
// ============================================================
export const PressureSensor: ComponentModelDefinition = {
  type: 'PressureSensor',
  displayName: 'Pressure Sensor',
  category: 'SENSOR',
  icon: 'Gauge',
  pins: [
    { id: 'ambientPressure', name: 'ambientPressure', direction: 'input', dataType: 'number', defaultValue: 1013.25 },
    { id: 'pressure', name: 'pressure', direction: 'output', dataType: 'number', defaultValue: 1013.25 },
    { id: 'ready', name: 'ready', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'minPressure', name: 'Min Pressure', type: 'number', defaultValue: 300, min: 0, max: 2000, unit: 'hPa' },
    { id: 'maxPressure', name: 'Max Pressure', type: 'number', defaultValue: 1100, min: 0, max: 5000, unit: 'hPa' },
    { id: 'noiseLevel', name: 'Noise Level', type: 'number', defaultValue: 0.1, min: 0, max: 5, step: 0.01, unit: 'hPa' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck', description: 'Returns fixed pressure', parameters: [{ id: 'stuckValue', name: 'Stuck Value', type: 'number', defaultValue: 1013, unit: 'hPa' }] },
    { id: 'OFFLINE', name: 'Offline', description: 'Sensor offline', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const ambient = (inputs.ambientPressure as number) ?? 1013.25;
    const minP = properties.minPressure as number;
    const maxP = properties.maxPressure as number;
    const noise = properties.noiseLevel as number;

    if (faults.find(f => f.faultId === 'OFFLINE')) return { outputs: { pressure: NaN, ready: false }, newState: state, events: [] };
    const stuckFault = faults.find(f => f.faultId === 'STUCK');
    if (stuckFault) return { outputs: { pressure: (stuckFault.parameters.stuckValue as number) ?? 1013, ready: true }, newState: state, events: [] };

    let val = ambient + gaussianNoise(noise);
    val = Math.max(minP, Math.min(maxP, val));

    return { outputs: { pressure: Math.round(val * 100) / 100, ready: true }, newState: state, events: [] };
  },
};

// ============================================================
// LIGHT SENSOR (LDR)
// ============================================================
export const LightSensor: ComponentModelDefinition = {
  type: 'LightSensor',
  displayName: 'Light Sensor (LDR)',
  category: 'SENSOR',
  icon: 'Sun',
  pins: [
    { id: 'ambientLight', name: 'ambientLight', direction: 'input', dataType: 'number', defaultValue: 500 },
    { id: 'lux', name: 'lux', direction: 'output', dataType: 'number', defaultValue: 500 },
  ],
  defaultProperties: [
    { id: 'minLux', name: 'Min Lux', type: 'number', defaultValue: 0, min: 0, max: 100, unit: 'lux' },
    { id: 'maxLux', name: 'Max Lux', type: 'number', defaultValue: 10000, min: 100, max: 100000, unit: 'lux' },
    { id: 'noiseLevel', name: 'Noise Level', type: 'number', defaultValue: 5, min: 0, max: 100, unit: 'lux' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck', description: 'Returns fixed lux', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Sensor offline', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const ambient = (inputs.ambientLight as number) ?? 500;
    const minL = properties.minLux as number;
    const maxL = properties.maxLux as number;
    const noise = properties.noiseLevel as number;

    if (faults.find(f => f.faultId === 'OFFLINE')) return { outputs: { lux: NaN }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'STUCK')) return { outputs: { lux: (state.stuckVal as number) ?? ambient }, newState: { stuckVal: state.stuckVal ?? ambient }, events: [] };

    let val = ambient + gaussianNoise(noise);
    val = Math.max(minL, Math.min(maxL, val));
    return { outputs: { lux: Math.round(val) }, newState: state, events: [] };
  },
};

// ============================================================
// CURRENT SENSOR
// ============================================================
export const CurrentSensor: ComponentModelDefinition = {
  type: 'CurrentSensor',
  displayName: 'Current Sensor',
  category: 'SENSOR',
  icon: 'Zap',
  pins: [
    { id: 'actualCurrent', name: 'actualCurrent', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'current', name: 'current', direction: 'output', dataType: 'number', defaultValue: 0 },
  ],
  defaultProperties: [
    { id: 'maxCurrent', name: 'Max Current', type: 'number', defaultValue: 30, min: 0, max: 200, unit: 'A' },
    { id: 'accuracy', name: 'Accuracy', type: 'number', defaultValue: 0.1, min: 0, max: 5, step: 0.01, unit: 'A' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck', description: 'Fixed reading', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Offline', parameters: [] },
  ],
  simulate(inputs, state, properties, _time, _deltaTime, faults) {
    const actual = (inputs.actualCurrent as number) ?? 0;
    const accuracy = properties.accuracy as number;

    if (faults.find(f => f.faultId === 'OFFLINE')) return { outputs: { current: NaN }, newState: state, events: [] };
    if (faults.find(f => f.faultId === 'STUCK')) return { outputs: { current: (state.stuckVal as number) ?? actual }, newState: { stuckVal: state.stuckVal ?? actual }, events: [] };

    const val = actual + gaussianNoise(accuracy);
    return { outputs: { current: Math.round(val * 100) / 100 }, newState: state, events: [] };
  },
};

// ============================================================
// GAS SENSOR
// ============================================================
export const GasSensor: ComponentModelDefinition = {
  type: 'GasSensor',
  displayName: 'Gas Sensor',
  category: 'SENSOR',
  icon: 'Wind',
  pins: [
    { id: 'gasConcentration', name: 'gasConcentration', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'ppm', name: 'ppm', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'alarm', name: 'alarm', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'alarmThreshold', name: 'Alarm Threshold', type: 'number', defaultValue: 1000, min: 0, max: 50000, unit: 'ppm' },
    { id: 'warmupTime', name: 'Warmup Time', type: 'number', defaultValue: 5000000, min: 0, max: 60000000, unit: 'µs' },
    { id: 'noiseLevel', name: 'Noise Level', type: 'number', defaultValue: 10, min: 0, max: 100, unit: 'ppm' },
  ],
  faultTypes: [
    { id: 'STUCK', name: 'Stuck', description: 'Fixed reading', parameters: [] },
    { id: 'OFFLINE', name: 'Offline', description: 'Sensor offline', parameters: [] },
  ],
  simulate(inputs, state, properties, time, _deltaTime, faults) {
    const gas = (inputs.gasConcentration as number) ?? 0;
    const threshold = properties.alarmThreshold as number;
    const warmup = properties.warmupTime as number;
    const noise = properties.noiseLevel as number;
    const startTime = (state.startTime as number) ?? time;

    if (faults.find(f => f.faultId === 'OFFLINE')) return { outputs: { ppm: NaN, alarm: false }, newState: { startTime }, events: [] };

    const warmedUp = (time - startTime) >= warmup;
    if (!warmedUp) return { outputs: { ppm: 0, alarm: false }, newState: { startTime }, events: [] };

    const val = gas + gaussianNoise(noise);
    return { outputs: { ppm: Math.max(0, Math.round(val)), alarm: val >= threshold }, newState: { startTime }, events: [] };
  },
};
