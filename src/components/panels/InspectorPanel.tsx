'use client';

import React, { useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useUIStore } from '@/stores/useUIStore';
import { getComponentModel, categoryInfo } from '@/simulation/components';
import { Trash2, AlertTriangle } from 'lucide-react';
import type { ComponentInstance, FaultDefinition } from '@/types';

// --- Property Editor ---
function PropertyEditor({ component }: { component: ComponentInstance }) {
  const updateProperty = useProjectStore(s => s.updateComponentProperty);
  const model = getComponentModel(component.type);
  if (!model || model.defaultProperties.length === 0) {
    return <div className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest border-[3px] border-dashed border-gray-300 m-4 text-center">NO CONFIGURABLE PROPERTIES</div>;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {model.defaultProperties.map(prop => (
        <div key={prop.id} className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-black flex items-center justify-between">
            <span>{prop.name}</span>
            {prop.unit && <span className="text-gray-500">{prop.unit}</span>}
          </label>
          {prop.type === 'number' && (
            <input
              type="number"
              value={component.properties[prop.id] as number}
              onChange={(e) => updateProperty(component.id, prop.id, parseFloat(e.target.value) || 0)}
              min={prop.min}
              max={prop.max}
              step={prop.step || 1}
              className="w-full px-3 py-2 text-xs font-bold uppercase bg-white border-[3px] border-black text-black outline-none focus:ring-4 focus:ring-gray-200 tabular-nums transition-all"
            />
          )}
          {prop.type === 'boolean' && (
            <button
              onClick={() => updateProperty(component.id, prop.id, !component.properties[prop.id])}
              className={`w-full px-3 py-2 text-xs font-black uppercase border-[3px] transition-colors ${
                component.properties[prop.id]
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-black text-black hover:bg-gray-100'
              }`}
            >
              {component.properties[prop.id] ? 'TRUE' : 'FALSE'}
            </button>
          )}
          {prop.type === 'select' && prop.options && (
            <select
              value={String(component.properties[prop.id])}
              onChange={(e) => updateProperty(component.id, prop.id, e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold uppercase bg-white border-[3px] border-black text-black outline-none focus:ring-4 focus:ring-gray-200 transition-all appearance-none"
            >
              {prop.options.map(opt => (
                <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
              ))}
            </select>
          )}
          {prop.type === 'string' && (
            <input
              type="text"
              value={String(component.properties[prop.id] ?? '')}
              onChange={(e) => updateProperty(component.id, prop.id, e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold uppercase bg-white border-[3px] border-black text-black outline-none focus:ring-4 focus:ring-gray-200 transition-all"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Pin States Display ---
function PinStates({ component }: { component: ComponentInstance }) {
  const model = getComponentModel(component.type);
  const simStates = useSimulationStore(s => s.componentStates);
  const setInput = useSimulationStore(s => s.setInput);
  if (!model) return null;

  const liveState = simStates[component.id];
  const inputPins = model.pins.filter(p => p.direction === 'input');
  const outputPins = model.pins.filter(p => p.direction === 'output');

  return (
    <div className="px-4 py-4 space-y-6">
      {inputPins.length > 0 && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-black mb-3 border-b-[3px] border-black pb-1">INPUTS</div>
          <div className="space-y-3">
            {inputPins.map(pin => {
              const val = liveState?.pinValues?.[pin.id] ?? component.pinValues[pin.id];
              return (
                <div key={pin.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{pin.name}</span>
                  {pin.dataType === 'number' ? (
                    <input
                      type="number"
                      value={Number(val) || 0}
                      onChange={e => setInput(component.id, pin.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-xs font-bold uppercase bg-white border-[3px] border-black text-black outline-none tabular-nums text-right focus:ring-4 focus:ring-gray-200 transition-all"
                      step={0.1}
                    />
                  ) : pin.dataType === 'boolean' ? (
                    <button
                      onClick={() => setInput(component.id, pin.id, !val)}
                      className={`px-3 py-1 text-xs font-black uppercase border-[3px] border-black transition-colors ${
                        val ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                      }`}
                    >
                      {val ? 'HIGH' : 'LOW'}
                    </button>
                  ) : (
                    <span className="text-xs font-black text-black tabular-nums">{String(val)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {outputPins.length > 0 && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-black mb-3 border-b-[3px] border-black pb-1">OUTPUTS</div>
          <div className="space-y-3">
            {outputPins.map(pin => {
              const val = liveState?.pinValues?.[pin.id] ?? component.pinValues[pin.id];
              return (
                <div key={pin.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{pin.name}</span>
                  <span className="text-xs font-black text-black tabular-nums bg-gray-100 px-2 py-1 border-[2px] border-black">
                    {typeof val === 'boolean' ? (val ? 'HIGH' : 'LOW') :
                     typeof val === 'number' ? (isNaN(val) ? 'NaN' : val.toFixed(2)) : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Fault Injection Panel ---
function FaultInjection({ component }: { component: ComponentInstance }) {
  const model = getComponentModel(component.type);
  const injectFault = useSimulationStore(s => s.injectFault);
  const clearFault = useSimulationStore(s => s.clearFault);

  if (!model || model.faultTypes.length === 0) {
    return <div className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">NO FAULT TYPES AVAILABLE</div>;
  }

  const activeFaults = component.faults;

  return (
    <div className="px-4 py-4 space-y-4">
      {model.faultTypes.map(fault => {
        const isActive = activeFaults.some(f => f.faultId === fault.id);
        return (
          <div key={fault.id} className="p-3 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className={isActive ? 'text-red-500' : 'text-black'} strokeWidth={3} />
                <span className="text-xs font-black uppercase text-black">{fault.name}</span>
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">{fault.description}</p>
              <button
                onClick={() => {
                  if (isActive) {
                    clearFault(component.id, fault.id);
                  } else {
                    const params: Record<string, number | boolean> = {};
                    for (const p of fault.parameters) {
                      params[p.id] = p.defaultValue;
                    }
                    injectFault(component.id, fault.id, params, -1);
                  }
                }}
                className={`w-full px-3 py-2 text-xs font-black uppercase border-[3px] border-black transition-colors ${
                  isActive
                    ? 'bg-red-500 text-white hover:bg-black hover:text-white'
                    : 'bg-white text-black hover:bg-red-500 hover:text-white'
                }`}
              >
                {isActive ? 'CLEAR FAULT' : 'INJECT FAULT'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Inspector Panel ---
export default function InspectorPanel() {
  const selectedId = useUIStore(s => s.selectedComponentId);
  const activeTab = useUIStore(s => s.activeRightTab);
  const setActiveTab = useUIStore(s => s.setActiveRightTab);
  const project = useProjectStore(s => s.project);
  const removeComponent = useProjectStore(s => s.removeComponent);
  const updateComponentName = useProjectStore(s => s.updateComponentName);

  const component = project?.canvas.components.find(c => c.id === selectedId);

  if (!component) {
    // Show project stats
    const compCount = project?.canvas.components.length ?? 0;
    const connCount = project?.canvas.connections.length ?? 0;
    const testCount = project?.tests.length ?? 0;

    return (
      <div className="h-full flex flex-col bg-white border-l-[3px] border-black">
        <div className="flex items-center gap-2 px-4 py-3 border-b-[3px] border-black">
          <span className="text-xs font-black uppercase tracking-widest text-black">INSPECTOR</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="space-y-6 w-full max-w-[240px]">
            <div className="text-sm font-bold uppercase text-gray-500 mb-8 border-[3px] border-dashed border-gray-300 p-6">
              SELECT A COMPONENT TO INSPECT
            </div>
            <div className="space-y-3">
              <StatRow label="COMPONENTS" value={String(compCount)} />
              <StatRow label="CONNECTIONS" value={String(connCount)} />
              <StatRow label="TEST SUITES" value={String(testCount)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const model = getComponentModel(component.type);
  const cat = categoryInfo[component.category];
  const hasFirmware = !!model?.defaultFirmware;

  const tabs = [
    { id: 'properties' as const, label: 'PROPS' },
    { id: 'pins' as const, label: 'PINS' },
    ...(hasFirmware ? [{ id: 'firmware' as const, label: 'CODE' }] : []),
    { id: 'faults' as const, label: 'FAULTS' },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l-[3px] border-black">
      {/* Header */}
      <div className="px-4 py-4 border-b-[3px] border-black bg-gray-100">
        <div className="flex items-center justify-between mb-3">
          <input
            type="text"
            value={component.name}
            onChange={e => updateComponentName(component.id, e.target.value)}
            className="bg-white px-2 py-1 text-base font-black uppercase text-black outline-none border-[3px] border-black focus:ring-4 focus:ring-gray-200 w-full"
          />
          <button
            onClick={() => removeComponent(component.id)}
            className="p-2 text-black bg-white border-[3px] border-black hover:bg-red-500 hover:text-white transition-colors shrink-0 ml-3"
          >
            <Trash2 size={16} strokeWidth={3} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border-[2px] border-black"
            style={{ background: cat.bgColor || '#FFF', color: cat.color || '#000' }}
          >
            {component.category}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{component.type}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-[3px] border-black bg-white">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-r-[3px] border-black last:border-r-0 ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'text-black hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === 'properties' && <PropertyEditor component={component} />}
        {activeTab === 'pins' && <PinStates component={component} />}
        {activeTab === 'firmware' && hasFirmware && <FirmwareEditor component={component} />}
        {activeTab === 'faults' && <FaultInjection component={component} />}
      </div>
    </div>
  );
}

// --- Firmware Editor (inline, no Monaco needed here — simple textarea) ---
function FirmwareEditor({ component }: { component: ComponentInstance }) {
  const updateFirmware = useProjectStore(s => s.updateComponentFirmware);

  return (
    <div className="px-4 py-4 h-full flex flex-col">
      <textarea
        value={component.firmware || ''}
        onChange={e => updateFirmware(component.id, e.target.value)}
        className="w-full flex-1 px-4 py-4 text-xs font-mono bg-gray-50 border-[3px] border-black text-black outline-none resize-none focus:ring-4 focus:ring-gray-200 leading-relaxed shadow-inner"
        spellCheck={false}
        placeholder="// WRITE FIRMWARE CODE HERE..."
      />
      <div className="text-[10px] font-bold text-gray-500 mt-3 uppercase tracking-widest">
        AVAILABLE: INPUTS.*, STATE.*, EMIT(PIN, VALUE), LOG(MESSAGE)
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <span className="text-[10px] font-black text-black uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-black tabular-nums">{value}</span>
    </div>
  );
}
