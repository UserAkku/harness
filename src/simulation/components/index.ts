import type { ComponentModelDefinition, ComponentCategory } from '@/types';
import { TemperatureSensor, HumiditySensor, PIRSensor, UltrasonicSensor, PressureSensor, LightSensor, CurrentSensor, GasSensor } from './sensors';
import { GenericMCU, PIDController, TimerModule, StateMachineBlock, RuleEngineBlock } from './controllers';
import { Relay, DCMotor, Servo, LEDLamp, Buzzer, Valve, Pump, Heater, Display } from './actuators';
import { ANDGate, ORGate, NOTGate, Comparator, ThresholdBlock, DebounceBlock, FilterBlock } from './logic';
import { MQTTNode, HTTPClientNode, BLENode, WiFiModule, CANBusNode, LoRaNode } from './network';
import { Battery, PowerSupply, WatchdogTimer } from './power';

// Master registry of all component models
export const componentRegistry: Map<string, ComponentModelDefinition> = new Map([
  // Sensors
  ['TemperatureSensor', TemperatureSensor],
  ['HumiditySensor', HumiditySensor],
  ['PIRSensor', PIRSensor],
  ['UltrasonicSensor', UltrasonicSensor],
  ['PressureSensor', PressureSensor],
  ['LightSensor', LightSensor],
  ['CurrentSensor', CurrentSensor],
  ['GasSensor', GasSensor],
  // Controllers
  ['GenericMCU', GenericMCU],
  ['PIDController', PIDController],
  ['TimerModule', TimerModule],
  ['StateMachineBlock', StateMachineBlock],
  ['RuleEngineBlock', RuleEngineBlock],
  // Actuators
  ['Relay', Relay],
  ['DCMotor', DCMotor],
  ['Servo', Servo],
  ['LEDLamp', LEDLamp],
  ['Buzzer', Buzzer],
  ['Valve', Valve],
  ['Pump', Pump],
  ['Heater', Heater],
  ['Display', Display],
  // Logic
  ['ANDGate', ANDGate],
  ['ORGate', ORGate],
  ['NOTGate', NOTGate],
  ['Comparator', Comparator],
  ['ThresholdBlock', ThresholdBlock],
  ['DebounceBlock', DebounceBlock],
  ['FilterBlock', FilterBlock],
  // Network
  ['MQTTNode', MQTTNode],
  ['HTTPClientNode', HTTPClientNode],
  ['BLENode', BLENode],
  ['WiFiModule', WiFiModule],
  ['CANBusNode', CANBusNode],
  ['LoRaNode', LoRaNode],
  // Power
  ['Battery', Battery],
  ['PowerSupply', PowerSupply],
  ['WatchdogTimer', WatchdogTimer],
]);

// Get all components by category
export function getComponentsByCategory(category: ComponentCategory): ComponentModelDefinition[] {
  return Array.from(componentRegistry.values()).filter(c => c.category === category);
}

// Get component model by type
export function getComponentModel(type: string): ComponentModelDefinition | undefined {
  return componentRegistry.get(type);
}

// Category display info
export const categoryInfo: Record<ComponentCategory, { label: string; color: string; bgColor: string }> = {
  SENSOR: { label: 'Sensors', color: '#38BDF8', bgColor: '#0C4A6E' },
  CONTROLLER: { label: 'Controllers', color: '#F5A524', bgColor: '#7A4E08' },
  ACTUATOR: { label: 'Actuators', color: '#22C55E', bgColor: '#14532D' },
  NETWORK: { label: 'Network', color: '#A78BFA', bgColor: '#4C1D95' },
  LOGIC: { label: 'Logic', color: '#FB923C', bgColor: '#7C2D12' },
  POWER: { label: 'Power', color: '#FACC15', bgColor: '#713F12' },
};

// All categories in order
export const componentCategories: ComponentCategory[] = ['SENSOR', 'CONTROLLER', 'ACTUATOR', 'NETWORK', 'LOGIC', 'POWER'];
