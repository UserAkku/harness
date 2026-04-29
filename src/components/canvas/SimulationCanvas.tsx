'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection as FlowConnection,
  type NodeTypes,
  BackgroundVariant,
  type OnConnect,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProjectStore } from '@/stores/useProjectStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { getComponentModel, categoryInfo } from '@/simulation/components';
import type { ComponentInstance, ComponentCategory } from '@/types';

// --- Sparkline Mini Component ---
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ');

  return (
    <svg width={w} height={h} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// --- Category badge color helper ---
function getCategoryBadge(category: ComponentCategory) {
  const info = categoryInfo[category];
  return { color: info.color, bg: info.bgColor, label: category };
}

// --- Custom Node Component ---
function DeviceNode({ data }: { data: {
  component: ComponentInstance;
  isSelected: boolean;
  simState: Record<string, unknown> | null;
} }) {
  const { component, isSelected, simState } = data;
  const model = getComponentModel(component.type);
  if (!model) return null;

  const badge = getCategoryBadge(component.category);
  const inputPins = model.pins.filter(p => p.direction === 'input');
  const outputPins = model.pins.filter(p => p.direction === 'output');
  const status = simState ? (component.faults.length > 0 ? 'fault' : 'running') : component.status;

  // Get primary output value for display
  const primaryOutput = outputPins[0];
  const primaryValue = primaryOutput
    ? (simState as Record<string, Record<string, unknown>> | null)?.pinValues?.[primaryOutput.id]
      ?? component.pinValues[primaryOutput.id]
    : null;

  // Get waveform data
  const waveformData = primaryOutput ? component.waveformData[primaryOutput.id] : undefined;

  return (
    <div
      className={`min-w-[220px] bg-white border-[3px] transition-all ${
        isSelected ? 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1 -translate-x-1' : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-[3px] border-black bg-gray-100"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-3 h-3 border-[2px] border-black shrink-0 ${
              status === 'running' ? 'bg-green-500 led-running' :
              status === 'fault' ? 'bg-red-500' :
              'bg-gray-300'
            }`}
          />
          <span className="text-xs font-black uppercase text-black truncate tracking-widest">
            {component.name}
          </span>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border-[2px] border-black bg-white shrink-0"
        >
          {badge.label}
        </span>
      </div>

      {/* Pins */}
      <div className="px-3 py-2 space-y-2 bg-white">
        {inputPins.slice(0, 6).map((pin, idx) => (
          <div key={pin.id} className="flex items-center gap-2 text-[10px] relative">
            {/* React Flow Handle for input */}
            <Handle
              type="target"
              position={Position.Left}
              id={pin.id}
              className="!w-3 !h-3 !bg-white !border-[2px] !border-black !rounded-none"
              style={{ top: 'auto', position: 'absolute', left: -18 }}
            />
            <span className="font-bold uppercase text-gray-500 tracking-widest">{pin.name}</span>
            <span className="font-black text-black ml-auto tabular-nums bg-gray-100 px-1 border-[2px] border-black">
              {formatPinValue(component.pinValues[pin.id])}
            </span>
          </div>
        ))}
        {outputPins.slice(0, 6).map((pin, idx) => (
          <div key={pin.id} className="flex items-center justify-end gap-2 text-[10px] relative">
            <span className="font-black text-black tabular-nums bg-gray-100 px-1 border-[2px] border-black">
              {formatPinValue(component.pinValues[pin.id])}
            </span>
            <span className="font-bold uppercase text-gray-500 tracking-widest">{pin.name}</span>
            {/* React Flow Handle for output */}
            <Handle
              type="source"
              position={Position.Right}
              id={pin.id}
              className="!w-3 !h-3 !bg-white !border-[2px] !border-black !rounded-none"
              style={{ top: 'auto', position: 'absolute', right: -18 }}
            />
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {waveformData && waveformData.length > 2 && (
        <div className="px-3 pb-2 bg-white">
          <Sparkline data={waveformData} color="#000" />
        </div>
      )}

      {/* Footer */}
      {primaryValue !== null && primaryValue !== undefined && (
        <div
          className="flex items-center justify-between px-3 py-2 border-t-[3px] border-black bg-gray-100"
        >
          <span className="font-black text-black text-sm tabular-nums">
            {formatPinValue(primaryValue)}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border-[2px] border-black ${
            status === 'running' ? 'bg-green-500 text-black' :
            status === 'fault' ? 'bg-red-500 text-white' :
            'bg-white text-black'
          }`}>
            {status}
          </span>
        </div>
      )}
    </div>
  );
}

function formatPinValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'HIGH' : 'LOW';
  if (typeof value === 'number') {
    if (isNaN(value)) return 'NaN';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  return String(value);
}

// --- Node types for React Flow ---
const nodeTypes: NodeTypes = {
  device: DeviceNode,
};

// --- Main Canvas Component ---
export default function SimulationCanvas() {
  const project = useProjectStore(s => s.project);
  const addConnectionToProject = useProjectStore(s => s.addConnection);
  const removeComponent = useProjectStore(s => s.removeComponent);
  const removeConnection = useProjectStore(s => s.removeConnection);
  const updateComponentPosition = useProjectStore(s => s.updateComponentPosition);
  const addComponent = useProjectStore(s => s.addComponent);
  const selectComponent = useUIStore(s => s.selectComponent);
  const selectedComponentId = useUIStore(s => s.selectedComponentId);
  const componentStates = useSimulationStore(s => s.componentStates);

  // Convert project components to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    if (!project) return [];
    return project.canvas.components.map(comp => ({
      id: comp.id,
      type: 'device',
      position: comp.position,
      data: {
        component: comp,
        isSelected: comp.id === selectedComponentId,
        simState: componentStates[comp.id] ?? null,
      },
      selected: comp.id === selectedComponentId,
    }));
  }, [project, selectedComponentId, componentStates]);

  // Convert connections to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    if (!project) return [];
    const simRunning = Object.keys(componentStates).length > 0;
    return project.canvas.connections.map(conn => ({
      id: conn.id,
      source: conn.sourceComponentId,
      target: conn.targetComponentId,
      sourceHandle: conn.sourcePin,
      targetHandle: conn.targetPin,
      animated: simRunning,
      style: {
        stroke: '#000',
        strokeWidth: 3,
      },
    }));
  }, [project, componentStates]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync with project changes
  React.useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onConnect: OnConnect = useCallback(
    (connection: FlowConnection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        addConnectionToProject({
          sourceComponentId: connection.source,
          sourcePin: connection.sourceHandle,
          targetComponentId: connection.target,
          targetPin: connection.targetHandle,
        });
      }
    },
    [addConnectionToProject]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectComponent(node.id);
  }, [selectComponent]);

  const onPaneClick = useCallback(() => {
    selectComponent(null);
  }, [selectComponent]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    updateComponentPosition(node.id, { x: node.position.x, y: node.position.y });
  }, [updateComponentPosition]);

  // Handle drag & drop from component library
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const reactFlowInstance = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/harness-component');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addComponent(type, position);
    },
    [reactFlowInstance, addComponent]
  );

  // Keyboard shortcuts for Delete
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedComponentId) {
          removeComponent(selectedComponentId);
          selectComponent(null);
        }
      }
    },
    [selectedComponentId, removeComponent, selectComponent]
  );

  if (!project) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <span className="text-black font-black uppercase tracking-widest text-sm">NO PROJECT LOADED</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white relative" onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#D1D5DB"
        />
        <Controls
          showInteractive={false}
          className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white"
          style={{
            bottom: 16,
            left: 16,
          }}
        />
        <MiniMap
          nodeColor={() => '#000'}
          maskColor="rgba(255, 255, 255, 0.7)"
          className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white"
          style={{
            bottom: 16,
            right: 16,
            width: 160,
            height: 100,
          }}
        />
      </ReactFlow>
    </div>
  );
}
