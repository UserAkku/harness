import type { ComponentModelDefinition } from '@/types';

// ============================================================
// MQTT NODE
// ============================================================
export const MQTTNode: ComponentModelDefinition = {
  type: 'MQTTNode',
  displayName: 'MQTT Node',
  category: 'NETWORK',
  icon: 'Radio',
  pins: [
    { id: 'publish', name: 'publish', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'publishTrigger', name: 'publishTrigger', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'received', name: 'received', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'connected', name: 'connected', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [
    { id: 'topic', name: 'Topic', type: 'string', defaultValue: 'device/data' },
    { id: 'brokerAddress', name: 'Broker Address', type: 'string', defaultValue: 'virtual://broker' },
    { id: 'qos', name: 'QoS', type: 'select', defaultValue: 0, options: [{ label: 'QoS 0', value: 0 }, { label: 'QoS 1', value: 1 }, { label: 'QoS 2', value: 2 }] },
  ],
  faultTypes: [
    { id: 'DISCONNECTED', name: 'Disconnected', description: 'Lost connection to broker', parameters: [] },
    { id: 'HIGH_LATENCY', name: 'High Latency', description: 'Adds 2-5s delay', parameters: [{ id: 'latency', name: 'Latency', type: 'number', defaultValue: 3000000, unit: 'µs' }] },
    { id: 'PACKET_LOSS', name: 'Packet Loss', description: 'Drops 50% of messages', parameters: [{ id: 'lossRate', name: 'Loss Rate', type: 'number', defaultValue: 0.5 }] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    const disconnected = faults.find(f => f.faultId === 'DISCONNECTED');
    if (disconnected) {
      return { outputs: { received: (state.lastReceived as number) ?? 0, connected: false }, newState: state, events: [] };
    }

    const received = (state.lastReceived as number) ?? 0;
    return {
      outputs: { received, connected: true },
      newState: { ...state, lastPublish: inputs.publish, lastTrigger: inputs.publishTrigger },
      events: [],
    };
  },
};

// ============================================================
// HTTP CLIENT NODE
// ============================================================
export const HTTPClientNode: ComponentModelDefinition = {
  type: 'HTTPClientNode',
  displayName: 'HTTP Client',
  category: 'NETWORK',
  icon: 'Globe',
  pins: [
    { id: 'requestTrigger', name: 'requestTrigger', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'requestData', name: 'requestData', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'responseData', name: 'responseData', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'responseCode', name: 'responseCode', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'busy', name: 'busy', direction: 'output', dataType: 'boolean', defaultValue: false },
  ],
  defaultProperties: [
    { id: 'endpoint', name: 'Endpoint URL', type: 'string', defaultValue: 'http://virtual/api' },
    { id: 'method', name: 'Method', type: 'select', defaultValue: 'GET', options: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }] },
    { id: 'timeout', name: 'Timeout', type: 'number', defaultValue: 5000000, min: 100000, max: 30000000, unit: 'µs' },
  ],
  faultTypes: [
    { id: 'TIMEOUT', name: 'Timeout', description: 'All requests timeout', parameters: [] },
    { id: 'SERVER_ERROR', name: 'Server Error', description: 'Returns 500 for all requests', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'TIMEOUT')) {
      return { outputs: { responseData: 0, responseCode: 408, busy: true }, newState: state, events: [] };
    }
    if (faults.find(f => f.faultId === 'SERVER_ERROR')) {
      return { outputs: { responseData: 0, responseCode: 500, busy: false }, newState: state, events: [] };
    }
    return {
      outputs: { responseData: (state.lastResponse as number) ?? 0, responseCode: 200, busy: false },
      newState: { ...state, lastRequest: inputs.requestData },
      events: [],
    };
  },
};

// ============================================================
// BLE NODE
// ============================================================
export const BLENode: ComponentModelDefinition = {
  type: 'BLENode',
  displayName: 'BLE Node',
  category: 'NETWORK',
  icon: 'Bluetooth',
  pins: [
    { id: 'txData', name: 'txData', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'txTrigger', name: 'txTrigger', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'rxData', name: 'rxData', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'connected', name: 'connected', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'rssi', name: 'rssi', direction: 'output', dataType: 'number', defaultValue: -50 },
  ],
  defaultProperties: [
    { id: 'deviceName', name: 'Device Name', type: 'string', defaultValue: 'HARNESS_BLE' },
    { id: 'txPower', name: 'TX Power', type: 'number', defaultValue: 4, min: -20, max: 8, unit: 'dBm' },
  ],
  faultTypes: [
    { id: 'DISCONNECTED', name: 'Disconnected', description: 'BLE link lost', parameters: [] },
    { id: 'WEAK_SIGNAL', name: 'Weak Signal', description: 'Very low RSSI, data corruption', parameters: [] },
  ],
  simulate(_inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'DISCONNECTED')) {
      return { outputs: { rxData: 0, connected: false, rssi: -100 }, newState: state, events: [] };
    }
    const rssi = faults.find(f => f.faultId === 'WEAK_SIGNAL') ? -95 + Math.random() * 5 : -50 + Math.random() * 10;
    return {
      outputs: { rxData: (state.lastRx as number) ?? 0, connected: true, rssi: Math.round(rssi) },
      newState: state,
      events: [],
    };
  },
};

// ============================================================
// WIFI MODULE
// ============================================================
export const WiFiModule: ComponentModelDefinition = {
  type: 'WiFiModule',
  displayName: 'WiFi Module',
  category: 'NETWORK',
  icon: 'Wifi',
  pins: [
    { id: 'enable', name: 'enable', direction: 'input', dataType: 'boolean', defaultValue: true },
    { id: 'connected', name: 'connected', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'signalStrength', name: 'signalStrength', direction: 'output', dataType: 'number', defaultValue: -40 },
  ],
  defaultProperties: [
    { id: 'ssid', name: 'SSID', type: 'string', defaultValue: 'HARNESS_NET' },
  ],
  faultTypes: [
    { id: 'NO_SIGNAL', name: 'No Signal', description: 'WiFi signal lost', parameters: [] },
    { id: 'INTERMITTENT', name: 'Intermittent', description: 'Connection drops randomly', parameters: [] },
  ],
  simulate(inputs, state, _properties, _time, _deltaTime, faults) {
    const enable = inputs.enable as boolean;
    if (!enable || faults.find(f => f.faultId === 'NO_SIGNAL')) {
      return { outputs: { connected: false, signalStrength: -100 }, newState: state, events: [] };
    }
    if (faults.find(f => f.faultId === 'INTERMITTENT')) {
      const connected = Math.random() > 0.3;
      return { outputs: { connected, signalStrength: connected ? -60 : -100 }, newState: state, events: [] };
    }
    return { outputs: { connected: true, signalStrength: -40 + Math.random() * 5 }, newState: state, events: [] };
  },
};

// ============================================================
// CAN BUS NODE
// ============================================================
export const CANBusNode: ComponentModelDefinition = {
  type: 'CANBusNode',
  displayName: 'CAN Bus Node',
  category: 'NETWORK',
  icon: 'Cable',
  pins: [
    { id: 'txData', name: 'txData', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'txId', name: 'txId', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'rxData', name: 'rxData', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'busActive', name: 'busActive', direction: 'output', dataType: 'boolean', defaultValue: true },
  ],
  defaultProperties: [
    { id: 'baudRate', name: 'Baud Rate', type: 'select', defaultValue: 500000, options: [{ label: '125k', value: 125000 }, { label: '250k', value: 250000 }, { label: '500k', value: 500000 }, { label: '1M', value: 1000000 }] },
    { id: 'nodeId', name: 'Node ID', type: 'number', defaultValue: 1, min: 0, max: 2047 },
  ],
  faultTypes: [
    { id: 'BUS_OFF', name: 'Bus Off', description: 'Node in bus-off state', parameters: [] },
    { id: 'BIT_ERROR', name: 'Bit Error', description: 'Random bit errors in transmission', parameters: [] },
  ],
  simulate(_inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'BUS_OFF')) {
      return { outputs: { rxData: 0, busActive: false }, newState: state, events: [] };
    }
    return { outputs: { rxData: (state.lastRx as number) ?? 0, busActive: true }, newState: state, events: [] };
  },
};

// ============================================================
// LORA NODE
// ============================================================
export const LoRaNode: ComponentModelDefinition = {
  type: 'LoRaNode',
  displayName: 'LoRa Node',
  category: 'NETWORK',
  icon: 'Radio',
  pins: [
    { id: 'txData', name: 'txData', direction: 'input', dataType: 'number', defaultValue: 0 },
    { id: 'txTrigger', name: 'txTrigger', direction: 'input', dataType: 'boolean', defaultValue: false },
    { id: 'rxData', name: 'rxData', direction: 'output', dataType: 'number', defaultValue: 0 },
    { id: 'joined', name: 'joined', direction: 'output', dataType: 'boolean', defaultValue: false },
    { id: 'rssi', name: 'rssi', direction: 'output', dataType: 'number', defaultValue: -80 },
  ],
  defaultProperties: [
    { id: 'spreadingFactor', name: 'Spreading Factor', type: 'select', defaultValue: 7, options: [{ label: 'SF7', value: 7 }, { label: 'SF8', value: 8 }, { label: 'SF9', value: 9 }, { label: 'SF10', value: 10 }, { label: 'SF11', value: 11 }, { label: 'SF12', value: 12 }] },
    { id: 'frequency', name: 'Frequency', type: 'number', defaultValue: 868, min: 433, max: 915, unit: 'MHz' },
  ],
  faultTypes: [
    { id: 'NO_SIGNAL', name: 'No Signal', description: 'LoRa signal lost', parameters: [] },
    { id: 'DUTY_CYCLE_EXCEEDED', name: 'Duty Cycle Exceeded', description: 'Cannot transmit', parameters: [] },
  ],
  simulate(_inputs, state, _properties, _time, _deltaTime, faults) {
    if (faults.find(f => f.faultId === 'NO_SIGNAL')) {
      return { outputs: { rxData: 0, joined: false, rssi: -120 }, newState: state, events: [] };
    }
    return {
      outputs: { rxData: (state.lastRx as number) ?? 0, joined: true, rssi: -80 + Math.random() * 20 },
      newState: state,
      events: [],
    };
  },
};
