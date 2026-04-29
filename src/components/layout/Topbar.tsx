'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipForward, ChevronDown, PanelLeft, PanelRight, PanelBottom, Home, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useUIStore } from '@/stores/useUIStore';
import { Storage } from '@/lib/storage';
import type { SimulationSpeed } from '@/types';

const speedOptions: { label: string; value: SimulationSpeed }[] = [
  { label: '0.1x', value: 0.1 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
  { label: 'MAX', value: -1 },
];

function formatVirtualTime(us: number): string {
  const totalSeconds = us / 1000000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((us % 1000000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export default function Topbar() {
  const router = useRouter();
  const project = useProjectStore(s => s.project);
  const updateProjectName = useProjectStore(s => s.updateProjectName);
  const isDirty = useProjectStore(s => s.isDirty);
  const setDirty = useProjectStore(s => s.setDirty);
  const exportProject = useProjectStore(s => s.exportProject);

  const status = useSimulationStore(s => s.status);
  const speed = useSimulationStore(s => s.speed);
  const virtualTime = useSimulationStore(s => s.virtualTime);
  const start = useSimulationStore(s => s.start);
  const pause = useSimulationStore(s => s.pause);
  const stop = useSimulationStore(s => s.stop);
  const reset = useSimulationStore(s => s.reset);
  const step = useSimulationStore(s => s.step);
  const setSpeed = useSimulationStore(s => s.setSpeed);
  const engine = useSimulationStore(s => s.engine);

  const toggleLeft = useUIStore(s => s.toggleLeftPanel);
  const toggleRight = useUIStore(s => s.toggleRightPanel);
  const toggleBottom = useUIStore(s => s.toggleBottomPanel);

  const [isEditingName, setIsEditingName] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Sync engine with project components when starting
  const handleStart = () => {
    if (engine && project) {
      engine.loadComponents(project.canvas.components);
      engine.loadConnections(project.canvas.connections);
    }
    start();
  };

  const handleReset = () => {
    reset();
  };

  // Manual save
  const handleSave = useCallback(async () => {
    const currentProject = useProjectStore.getState().project;
    if (currentProject) {
      await Storage.saveProject(currentProject);
      setDirty(false);
      useProjectStore.getState().setLastSaved(new Date().toISOString());
    }
  }, [setDirty]);

  // Export project as JSON file
  const handleExport = useCallback(() => {
    const json = exportProject();
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name.replace(/\s+/g, '_').toLowerCase() || 'harness_project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportProject, project?.name]);

  // Keyboard shortcuts: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div
      className="h-14 flex items-center px-4 gap-4 shrink-0 select-none border-b-[3px] border-black relative z-10 bg-white"
    >
      {/* Logo + Back */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-6 h-6 flex items-center justify-center bg-black hover:bg-gray-700 transition-colors"
          title="Back to Dashboard"
        >
          <Home size={14} className="text-white" />
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-lg font-black tracking-tighter uppercase text-black hover:underline"
          style={{ fontFamily: 'var(--font-heading)' }}
          title="Back to Dashboard"
        >
          HARNESS
        </button>
      </div>

      {/* Separator */}
      <div className="w-[3px] h-full bg-black ml-2" />

      {/* Panel toggles */}
      <div className="flex items-center gap-1 shrink-0 bg-white p-1">
        <button onClick={toggleLeft} className="p-1.5 border-2 border-transparent hover:border-black text-black transition-colors" title="Toggle left panel">
          <PanelLeft size={16} strokeWidth={2.5} />
        </button>
        <button onClick={toggleBottom} className="p-1.5 border-2 border-transparent hover:border-black text-black transition-colors" title="Toggle bottom panel">
          <PanelBottom size={16} strokeWidth={2.5} />
        </button>
        <button onClick={toggleRight} className="p-1.5 border-2 border-transparent hover:border-black text-black transition-colors" title="Toggle right panel">
          <PanelRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-[3px] h-full bg-black" />

      {/* Project name */}
      <div className="shrink-0 min-w-0">
        {isEditingName ? (
          <input
            autoFocus
            value={project?.name || ''}
            onChange={(e) => updateProjectName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            className="bg-white px-2 py-1 text-sm font-bold uppercase text-black outline-none border-[3px] border-black w-48 focus:bg-gray-100"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="px-2 py-1 text-sm font-black uppercase text-black hover:bg-black hover:text-white transition-colors truncate max-w-48"
          >
            {project?.name || 'UNTITLED PROJECT'}
          </button>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export button */}
      <button
        onClick={handleExport}
        className="p-2 text-black bg-white border-[3px] border-black hover:bg-black hover:text-white transition-colors shrink-0"
        title="Export Project JSON"
      >
        <Download size={14} strokeWidth={3} />
      </button>

      {/* Simulation Controls */}
      <div className="flex items-center gap-2 shrink-0 bg-white p-1">
        {status !== 'running' ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white bg-black border-[3px] border-black hover:bg-white hover:text-black transition-colors"
          >
            <Play size={14} fill="currentColor" />
            <span>RUN</span>
          </button>
        ) : (
          <button
            onClick={pause}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-black bg-yellow-400 border-[3px] border-black hover:bg-black hover:text-yellow-400 transition-colors"
          >
            <Pause size={14} fill="currentColor" />
            <span>PAUSE</span>
          </button>
        )}
        
        <button
          onClick={stop}
          className="p-2 text-black bg-white border-[3px] border-black hover:bg-red-500 hover:text-white transition-colors"
          title="Stop"
        >
          <Square size={14} fill="currentColor" />
        </button>
        <button
          onClick={step}
          disabled={status === 'running'}
          className="p-2 text-black bg-white border-[3px] border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
          title="Step"
        >
          <SkipForward size={16} strokeWidth={3} />
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 ml-2 text-[10px] font-black uppercase tracking-widest text-black bg-white border-[3px] border-black hover:bg-black hover:text-white transition-colors"
        >
          RST
        </button>
      </div>

      {/* Speed Selector */}
      <div className="relative shrink-0 ml-2">
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black bg-white border-[3px] border-black hover:bg-black hover:text-white transition-colors"
        >
          <span>{speed === -1 ? 'MAX' : `${speed}x`}</span>
          <ChevronDown size={14} strokeWidth={3} />
        </button>
        {showSpeedMenu && (
          <div className="absolute top-full mt-2 right-0 border-[3px] border-black bg-white z-50 min-w-[100px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {speedOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => { setSpeed(opt.value); setShowSpeedMenu(false); }}
                className={`block w-full px-4 py-2 text-xs font-bold uppercase tracking-widest text-left transition-colors border-b-[2px] border-black last:border-0 ${
                  speed === opt.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-[3px] h-full bg-black ml-4" />

      {/* Virtual Time */}
      <div className="flex items-center gap-3 shrink-0 bg-white px-4 py-1.5 border-[3px] border-black min-w-[140px] justify-between ml-4">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">TIME</span>
           <span className="text-sm font-black tabular-nums tracking-tighter text-black">
             {formatVirtualTime(virtualTime)}
           </span>
        </div>
        {status === 'running' ? (
          <span className="inline-block w-3 h-3 bg-green-500 border-2 border-black" />
        ) : (
          <span className="inline-block w-3 h-3 bg-gray-300 border-2 border-black" />
        )}
      </div>

      {/* Save status */}
      <div className="flex items-center gap-2 shrink-0 ml-4 bg-white px-3 py-1.5 border-[3px] border-black cursor-pointer hover:bg-gray-100 transition-colors" onClick={handleSave} title="Click to save (Ctrl+S)">
        {isDirty ? (
           <div className="w-3 h-3 bg-yellow-400 border-2 border-black" />
        ) : (
           <div className="w-3 h-3 bg-green-500 border-2 border-black" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest text-black">
          {isDirty ? 'UNSAVED' : 'SAVED'}
        </span>
      </div>
    </div>
  );
}
