'use client';

import React, { useEffect, Component } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Topbar from '@/components/layout/Topbar';
import ComponentLibrary from '@/components/panels/ComponentLibrary';
import SimulationCanvas from '@/components/canvas/SimulationCanvas';
import InspectorPanel from '@/components/panels/InspectorPanel';
import BottomPanel from '@/components/panels/BottomPanel';
import { useUIStore } from '@/stores/useUIStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useProjectStore } from '@/stores/useProjectStore';

// --- Error Boundary ---
class PanelErrorBoundary extends Component<
  { children: React.ReactNode; name: string },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-white p-6 text-center">
          <div className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">
            {this.props.name} CRASHED
          </div>
          <div className="text-[10px] font-mono text-gray-500 mb-4 max-w-[200px] break-all">
            {this.state.error}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-black border-[3px] border-black hover:bg-white hover:text-black transition-colors"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EditorLayout() {
  const leftPanelOpen = useUIStore(s => s.leftPanelOpen);
  const rightPanelOpen = useUIStore(s => s.rightPanelOpen);
  const bottomPanelOpen = useUIStore(s => s.bottomPanelOpen);
  const initEngine = useSimulationStore(s => s.initEngine);
  const componentStates = useSimulationStore(s => s.componentStates);
  const project = useProjectStore(s => s.project);

  // Initialize simulation engine
  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Sync waveform data back from engine snapshots to project store
  // This bridges the gap between the engine's internal state and the UI
  useEffect(() => {
    if (!project || Object.keys(componentStates).length === 0) return;

    // Throttle updates to avoid excessive re-renders
    const timer = setTimeout(() => {
      const currentProject = useProjectStore.getState().project;
      if (!currentProject) return;

      let needsUpdate = false;
      const updatedComponents = currentProject.canvas.components.map(comp => {
        const simState = componentStates[comp.id];
        if (!simState) return comp;

        // Update pin values from simulation
        const newPinValues = { ...comp.pinValues };
        for (const [pin, val] of Object.entries(simState.pinValues)) {
          if (newPinValues[pin] !== val) {
            newPinValues[pin] = val as number | boolean | string;
            needsUpdate = true;
          }
        }

        // Update waveform data for numeric output pins
        const newWaveformData = { ...comp.waveformData };
        for (const [pin, val] of Object.entries(simState.pinValues)) {
          if (typeof val === 'number' && !isNaN(val as number)) {
            if (!newWaveformData[pin]) newWaveformData[pin] = [];
            const arr = [...newWaveformData[pin], val as number];
            if (arr.length > 200) arr.shift();
            newWaveformData[pin] = arr;
            needsUpdate = true;
          }
        }

        return { ...comp, pinValues: newPinValues, waveformData: newWaveformData, status: simState.status };
      });

      if (needsUpdate) {
        useProjectStore.setState(state => ({
          project: state.project ? {
            ...state.project,
            canvas: {
              ...state.project.canvas,
              components: updatedComponents,
            },
          } : null,
        }));
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [componentStates, project]);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
        {/* Topbar */}
        <PanelErrorBoundary name="TOPBAR">
          <Topbar />
        </PanelErrorBoundary>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel — Component Library */}
          {leftPanelOpen && (
            <div
              className="shrink-0 overflow-hidden"
              style={{
                width: 280,
              }}
            >
              <PanelErrorBoundary name="COMPONENT LIBRARY">
                <ComponentLibrary />
              </PanelErrorBoundary>
            </div>
          )}

          {/* Center + Bottom */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Center Canvas */}
            <div className="flex-1 overflow-hidden flex relative">
              <div className="flex-1 overflow-hidden dotted-bg">
                <PanelErrorBoundary name="SIMULATION CANVAS">
                  <SimulationCanvas />
                </PanelErrorBoundary>
              </div>

              {/* Right Panel — Inspector */}
              {rightPanelOpen && (
                <div
                  className="shrink-0 border-l-[3px] border-black overflow-hidden"
                  style={{
                    width: 320,
                  }}
                >
                  <PanelErrorBoundary name="INSPECTOR">
                    <InspectorPanel />
                  </PanelErrorBoundary>
                </div>
              )}
            </div>

            {/* Bottom Panel */}
            {bottomPanelOpen && (
              <PanelErrorBoundary name="BOTTOM PANEL">
                <BottomPanel />
              </PanelErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
