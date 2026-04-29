'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useUIStore, type BottomTab } from '@/stores/useUIStore';
import { List, Activity, CheckCircle, AlertTriangle, ArrowDown, Filter, X } from 'lucide-react';
import { getComponentModel } from '@/simulation/components';
import type { PinDefinition } from '@/types';

// --- Virtual scrolling log ---
const ROW_HEIGHT = 24;

function formatTime(us: number): string {
  const totalSeconds = us / 1000000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((us % 1000000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatTimeMicro(us: number): string {
  const totalSeconds = us / 1000000;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

function EventLogTab() {
  const eventLog = useSimulationStore(s => s.eventLog);
  const filterComponent = useUIStore(s => s.logFilterComponent);
  const filterLevel = useUIStore(s => s.logFilterLevel);
  const autoScroll = useUIStore(s => s.logAutoScroll);
  const setFilterComponent = useUIStore(s => s.setLogFilterComponent);
  const setFilterLevel = useUIStore(s => s.setLogFilterLevel);
  const setAutoScroll = useUIStore(s => s.setLogAutoScroll);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    let events = eventLog;
    if (filterComponent) {
      events = events.filter(e => e.componentName.toLowerCase().includes(filterComponent.toLowerCase()));
    }
    if (filterLevel) {
      events = events.filter(e => e.level === filterLevel);
    }
    return events;
  }, [eventLog, filterComponent, filterLevel]);

  const [scrollTop, setScrollTop] = React.useState(0);
  const containerHeight = containerRef.current?.clientHeight ?? 400;
  const totalHeight = filteredEvents.length * ROW_HEIGHT;
  const startIdx = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
  const visibleEvents = filteredEvents.slice(startIdx, startIdx + visibleCount);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = totalHeight;
    }
  }, [filteredEvents.length, autoScroll, totalHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const levelColor = (level: string) => {
    switch (level) {
      case 'FAULT': return 'text-accent-red font-medium';
      case 'ERROR': return 'text-accent-red';
      case 'WARN': return 'text-status-warning';
      case 'DEBUG': return 'text-text-muted';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-2 border-b-[3px] border-black shrink-0 bg-gray-100">
        <Filter size={14} className="text-black shrink-0" strokeWidth={3} />
        <input
          type="text"
          value={filterComponent}
          onChange={e => setFilterComponent(e.target.value)}
          placeholder="FILTER COMPONENT..."
          className="bg-white px-2 py-1 text-xs font-black uppercase text-black outline-none w-48 border-[3px] border-black focus:ring-4 focus:ring-gray-200"
        />
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="bg-white px-2 py-1 text-xs font-black uppercase text-black outline-none border-[3px] border-black focus:ring-4 focus:ring-gray-200 appearance-none"
        >
          <option value="">ALL LEVELS</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
          <option value="FAULT">FAULT</option>
        </select>
        <div className="flex-1" />
        <span className="text-[10px] font-black uppercase tracking-widest text-black bg-white px-2 py-1 border-[2px] border-black">{filteredEvents.length} EVENTS</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`p-1 border-[3px] transition-colors ml-2 ${autoScroll ? 'bg-black text-white border-black' : 'bg-white text-black border-transparent hover:border-black'}`}
          title="Auto-scroll"
        >
          <ArrowDown size={14} strokeWidth={3} />
        </button>
      </div>

      <div
        className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black border-b-[3px] border-black shrink-0 bg-white"
      >
        <span className="w-24 shrink-0">TIME</span>
        <span className="w-32 shrink-0">COMPONENT</span>
        <span className="w-28 shrink-0">EVENT</span>
        <span className="flex-1">DATA</span>
        <span className="w-16 text-right shrink-0">LEVEL</span>
      </div>

      <div
        ref={(el) => { containerRef.current = el; scrollRef.current = el; }}
        className="flex-1 overflow-y-auto bg-white"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleEvents.map((event, i) => (
            <div
              key={event.id}
              className="flex items-center px-4 text-[10px] font-bold border-b-[3px] border-black hover:bg-gray-100 transition-colors"
              style={{
                height: ROW_HEIGHT,
                position: 'absolute',
                top: (startIdx + i) * ROW_HEIGHT,
                left: 0,
                right: 0,
              }}
            >
              <span className="w-24 shrink-0 text-black tabular-nums">{formatTime(event.time)}</span>
              <span className="w-32 shrink-0 text-black uppercase truncate">{event.componentName}</span>
              <span className="w-28 shrink-0 text-gray-500 uppercase truncate">{event.eventType}</span>
              <span className="flex-1 text-black truncate uppercase font-mono">{event.data}</span>
              <span className={`w-16 text-right shrink-0 uppercase tracking-widest bg-black px-1.5 py-0.5 text-white`}>{event.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Waveform View ---
function WaveformTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedSignals = useSimulationStore(s => s.selectedSignals);
  const project = useProjectStore(s => s.project);
  const componentStates = useSimulationStore(s => s.componentStates);
  const removeSignal = useSimulationStore(s => s.removeSignal);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const laneHeight = 48;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    if (selectedSignals.length === 0) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADD SIGNALS TO VIEW WAVEFORMS', w / 2, h / 2);
      return;
    }

    selectedSignals.forEach((signal, idx) => {
      const y = idx * laneHeight;

      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F3F4F6';
      ctx.fillRect(0, y, w, laneHeight);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y + laneHeight);
      ctx.lineTo(w, y + laneHeight);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${signal.componentName}.${signal.pin}`.toUpperCase(), 4, y + 14);

      if (!project) return;
      const comp = project.canvas.components.find(c => c.id === signal.componentId);
      if (!comp) return;
      const data = comp.waveformData[signal.pin];
      if (!data || data.length < 2) return;

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const margin = 16;
      const plotH = laneHeight - margin * 2 + 8;
      const plotY = y + margin - 2;
      const startX = 120;
      const plotW = w - startX - 8;

      ctx.strokeStyle = '#000000'; // Brutalist black line
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = startX + (i / (data.length - 1)) * plotW;
        const py = plotY + plotH - ((val - min) / range) * plotH;
        if (i === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      });
      ctx.stroke();

      const lastVal = data[data.length - 1];
      ctx.fillStyle = '#000000';
      ctx.font = '900 12px "Inter", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(lastVal.toFixed(2), w - 4, y + 14);
    });
  }, [selectedSignals, project, componentStates]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-2 border-b-[3px] border-black shrink-0 bg-gray-100">
        <span className="text-[10px] font-black uppercase tracking-widest text-black">SIGNALS</span>
        <div className="flex-1" />
        <AddSignalDropdown />
      </div>
      {selectedSignals.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap border-b-[3px] border-black shrink-0 bg-white">
          {selectedSignals.map(sig => (
            <span
              key={`${sig.componentId}-${sig.pin}`}
              className="inline-flex items-center gap-2 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-[3px] border-black bg-white"
            >
              {sig.componentName}.{sig.pin}
              <button
                onClick={() => removeSignal(sig.componentId, sig.pin)}
                className="text-black hover:bg-black hover:text-white transition-colors border-[2px] border-transparent hover:border-black p-0.5"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex-1 relative bg-white">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}

function AddSignalDropdown() {
  const [open, setOpen] = React.useState(false);
  const project = useProjectStore(s => s.project);
  const addSignal = useSimulationStore(s => s.addSignal);

  if (!project) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white text-black border-[3px] border-black hover:bg-black hover:text-white transition-colors"
      >
        + ADD SIGNAL
      </button>
      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 w-56 max-h-56 overflow-y-auto border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50"
        >
          {project.canvas.components.map(comp => {
            const model = getComponentModel(comp.type);
            if (!model) return null;
            const outputPins: PinDefinition[] = model.pins.filter(p => p.direction === 'output' && p.dataType === 'number');
            if (outputPins.length === 0) return null;
            return (
              <div key={comp.id}>
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black bg-gray-100 border-b-[3px] border-black">{comp.name}</div>
                {outputPins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => { addSignal(comp.id, comp.name, pin.id); setOpen(false); }}
                    className="block w-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white text-left transition-colors border-b-[3px] border-black last:border-b-0"
                  >
                    {pin.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { TestResultsTab } from './TestRunnerTab';

// --- Fault Events Tab ---
function FaultEventsTab() {
  const eventLog = useSimulationStore(s => s.eventLog);
  const faultEvents = useMemo(() =>
    eventLog.filter(e => e.level === 'FAULT' || e.level === 'ERROR'),
    [eventLog]
  );

  if (faultEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">NO FAULT EVENTS RECORDED</span>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full bg-white">
      {faultEvents.map(event => (
        <div
          key={event.id}
          className="flex items-center gap-4 px-4 py-3 border-b-[3px] border-black text-[10px] font-bold bg-white hover:bg-gray-100 transition-colors"
        >
          <span className="w-2 h-2 bg-red-500 border-[2px] border-black shrink-0" />
          <span className="text-black tabular-nums w-24 shrink-0">
            {formatTimeMicro(event.time)}
          </span>
          <span className="text-red-500 w-32 shrink-0 truncate uppercase tracking-widest">{event.componentName}</span>
          <span className="text-black flex-1 truncate uppercase font-mono">{event.data}</span>
        </div>
      ))}
    </div>
  );
}

// --- Bottom Panel Container ---
const tabs: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'eventLog', label: 'Event Log', icon: <List size={12} /> },
  { id: 'waveform', label: 'Waveform', icon: <Activity size={12} /> },
  { id: 'testResults', label: 'Test Results', icon: <CheckCircle size={12} /> },
  { id: 'faultEvents', label: 'Fault Events', icon: <AlertTriangle size={12} /> },
];

export default function BottomPanel() {
  const activeTab = useUIStore(s => s.activeBottomTab);
  const setActiveTab = useUIStore(s => s.setActiveBottomTab);
  const height = useUIStore(s => s.bottomPanelHeight);
  const setHeight = useUIStore(s => s.setBottomPanelHeight);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      setHeight(startHeight + delta);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [height, setHeight]);

  return (
    <div
      className="flex flex-col border-t-[3px] border-black bg-white shrink-0"
      style={{ height }}
    >
      <div
        ref={resizeRef}
        className="h-[3px] cursor-ns-resize hover:bg-black transition-colors shrink-0 bg-transparent relative z-20 -mt-[3px]"
        onMouseDown={handleMouseDown}
      />

      <div className="flex items-center border-b-[3px] border-black bg-white shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors border-r-[3px] border-black ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'text-black hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {activeTab === 'eventLog' && <EventLogTab />}
        {activeTab === 'waveform' && <WaveformTab />}
        {activeTab === 'testResults' && <TestResultsTab />}
        {activeTab === 'faultEvents' && <FaultEventsTab />}
      </div>
    </div>
  );
}
