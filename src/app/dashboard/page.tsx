'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Trash2, Box, ArrowRight, Download, RefreshCw, LogOut } from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@/types';

// Template definitions
const templates = [
  { id: 'blank', name: 'Blank Canvas', description: 'Start from scratch with an empty workspace', components: 0 },
  { id: 'smart-home', name: 'Smart Home', description: 'Temp sensor → MCU → relay → heater + MQTT cloud', components: 5 },
  { id: 'industrial', name: 'Industrial Monitor', description: 'Pressure + temp → PID → valve + buzzer alarm', components: 7 },
  { id: 'robotics', name: 'Robotics Controller', description: 'Ultrasonic + PIR → MCU → DC motor + servo + LED', components: 6 },
  { id: 'iot-gateway', name: 'IoT Gateway', description: 'Multi-sensor → MCU → MQTT + WiFi + HTTP cloud', components: 7 },
  { id: 'weather-station', name: 'Weather Station', description: 'Temp + humidity + pressure + light → MCU → display', components: 7 },
  { id: 'security-alarm', name: 'Security Alarm', description: 'PIR + light → MCU → buzzer + LED + relay lock', components: 7 },
  { id: 'hvac-system', name: 'HVAC System', description: 'Temp + humidity → PID → heater + pump + valve', components: 7 },
  { id: 'motor-control', name: 'Motor Speed Control', description: 'Current sensor → PID → DC motor with watchdog', components: 5 },
  { id: 'water-treatment', name: 'Water Treatment', description: 'Pressure + gas → MCU → pump + valve + display', components: 7 },
  { id: 'ble-wearable', name: 'BLE Wearable', description: 'Temp + current → MCU → BLE + LED + battery', components: 6 },
  { id: 'solar-monitor', name: 'Solar Power Monitor', description: 'Light + current → MCU → battery + display + LoRa', components: 7 },
  { id: 'traffic-light', name: 'Traffic Light', description: 'Timer + state machine → 3 LEDs + pedestrian buzzer', components: 6 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, init, signOut, loading: authLoading } = useAuthStore();
  const loadProject = useProjectStore(s => s.loadProject);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    const proj = await Storage.getAllProjects();
    setProjects(proj.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    const proj = await Storage.syncFromCloud();
    setProjects(proj.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setSyncing(false);
  };

  const handleCreateProject = async (templateId: string) => {
    const id = uuidv4();
    const name = newProjectName.trim() || `Untitled Project`;
    
    // Clear current store state and load empty project
    
    // Create new project object
    const newProject: Project = {
      id,
      name,
      description: `Created from ${templates.find(t => t.id === templateId)?.name || 'Blank'} template`,
      canvas: { components: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } },
      tests: [],
      faultScenarios: [],
      simulationConfig: { tickIntervalUs: 1000, maxEventsPerTick: 100, defaultSpeed: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Load to store
    loadProject(newProject);
    
    // Add template components using the store functions (so IDs are generated)
    addTemplateComponents(newProject, templateId);
    
    // Get updated project from store
    const updatedProject = useProjectStore.getState().project;
    if (updatedProject) {
       await Storage.saveProject(updatedProject);
       router.push(`/projects/${id}`);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Project;
        // Generate a new ID to prevent conflicts
        imported.id = uuidv4();
        imported.name = `${imported.name} (Imported)`;
        imported.createdAt = new Date().toISOString();
        imported.updatedAt = new Date().toISOString();
        
        await Storage.saveProject(imported);
        loadProject(imported);
        router.push(`/projects/${imported.id}`);
      } catch (error) {
        console.error('Failed to import project:', error);
        alert('Invalid project file format');
      }
    };
    input.click();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      await Storage.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleExport = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white text-black font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="border-b-[3px] border-black sticky top-0 bg-white z-40 relative">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }} className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-black flex items-center justify-center">
               <Box size={18} className="text-white" />
             </div>
             <h1 className="text-2xl font-black tracking-tighter uppercase text-black" style={{ fontFamily: 'var(--font-heading)' }}>
               HARNESS DASHBOARD
             </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-black bg-white border-[2px] border-black hover:bg-gray-100 transition-colors disabled:opacity-50"
             >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">SYNC CLOUD</span>
             </button>
             <button
               onClick={handleImport}
               className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-black bg-white border-[2px] border-black hover:bg-black hover:text-white transition-colors"
             >
               <Upload size={14} />
               <span className="hidden sm:inline">IMPORT</span>
             </button>
             <button
               onClick={() => setShowNewProject(true)}
               className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-black border-[2px] border-black hover:bg-white hover:text-black transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
             >
               <Plus size={14} strokeWidth={3} />
               NEW PROJECT
             </button>
             
             <div className="w-[3px] h-8 bg-black mx-2" />
             
             <button
               onClick={() => signOut()}
               title="Log Out"
               className="p-2 text-black hover:text-white hover:bg-black border-[2px] border-transparent transition-colors"
             >
               <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px', width: '100%' }}>
        
        {/* Projects Grid */}
        <div className="mb-8 border-b-[3px] border-black pb-4 flex items-end justify-between">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black" style={{ fontFamily: 'var(--font-heading)' }}>
              YOUR PROJECTS
            </h2>
            <div className="text-sm font-bold uppercase tracking-widest text-gray-500">
              {projects.length} PROJECTS FOUND
            </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
               <div key={i} className="h-48 bg-gray-100 animate-pulse border-[3px] border-gray-200" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 border-[3px] border-dashed border-gray-300 bg-gray-50">
            <div className="w-16 h-16 bg-gray-200 flex items-center justify-center mx-auto mb-4">
               <Box size={24} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              NO PROJECTS YET
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">
              CREATE A NEW PROJECT OR IMPORT AN EXISTING ONE TO GET STARTED.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-black hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} /> START BUILDING
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/projects/${proj.id}`)}
                className="group relative bg-white border-[3px] border-black p-6 cursor-pointer hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1.5 hover:translate-y-1.5 flex flex-col h-full"
              >
                {/* Actions (visible on hover) */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => handleExport(e, proj)}
                    className="p-1.5 bg-white text-black hover:bg-gray-200 border-[2px] border-black transition-colors"
                    title="Export Project"
                  >
                    <Download size={14} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, proj.id)}
                    className="p-1.5 bg-white text-black hover:bg-red-500 hover:text-white border-[2px] border-black transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={14} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 group-hover:text-white pr-16 leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {proj.name}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-6 line-clamp-2">
                    {proj.description || 'NO DESCRIPTION'}
                  </p>
                </div>

                <div className="pt-4 border-t-[3px] border-gray-100 group-hover:border-white/20 mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                       NODES<br/><span className="text-sm text-black group-hover:text-white">{proj.canvas.components.length}</span>
                     </div>
                     <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                       LINKS<br/><span className="text-sm text-black group-hover:text-white">{proj.canvas.connections.length}</span>
                     </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">
                    UPDATED<br/><span className="text-black group-hover:text-white">{new Date(proj.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-8 pt-8 pb-4 mb-4 border-b-[3px] border-black shrink-0">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black" style={{ fontFamily: 'var(--font-heading)' }}>
                Create Simulation
              </h2>
              <button onClick={() => setShowNewProject(false)} className="text-black font-bold uppercase hover:underline">
                Close [X]
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              <div className="space-y-8">
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-black mb-3 block">
                    1. PROJECT NAME
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="ENTER PROJECT NAME..."
                    autoFocus
                    className="w-full px-4 py-4 text-sm font-bold uppercase bg-white border-[3px] border-black text-black outline-none placeholder:text-gray-400 focus:ring-4 focus:ring-gray-200 transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-black mb-4 block">
                    2. ARCHITECTURE TEMPLATE
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates.map(tmpl => (
                      <button
                         key={tmpl.id}
                         onClick={() => {
                           handleCreateProject(tmpl.id);
                           setShowNewProject(false);
                           setNewProjectName('');
                         }}
                         className="text-left p-4 border-[3px] border-black bg-white hover:bg-black hover:text-white transition-colors group flex flex-col justify-between h-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-0.5 hover:translate-x-0.5"
                      >
                         <div>
                           <div className="text-sm font-black uppercase tracking-tight mb-1.5 transition-colors leading-tight">
                             {tmpl.name}
                           </div>
                           <div className="text-[10px] font-bold uppercase text-gray-500 group-hover:text-gray-300 leading-snug mb-3">
                             {tmpl.description}
                           </div>
                         </div>
                         {tmpl.components > 0 && (
                           <div className="inline-block mt-auto px-2 py-0.5 bg-gray-100 group-hover:bg-gray-800 text-[10px] font-bold uppercase tracking-widest border border-black group-hover:border-white w-fit">
                             {tmpl.components} NODES
                           </div>
                         )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Template Wiring Helper ──────────────────────────────────────────────────
function addTemplateComponents(_project: Project, templateId: string) {
  const { addComponent, addConnection } = useProjectStore.getState();

  switch (templateId) {
    case 'smart-home': {
      const temp  = addComponent('TemperatureSensor', { x: -300, y: -100 });
      const mcu   = addComponent('GenericMCU',        { x: 50,   y: 0 });
      const relay = addComponent('Relay',             { x: 400,  y: -100 });
      const heater= addComponent('Heater',            { x: 700,  y: -100 });
      const mqtt  = addComponent('MQTTNode',          { x: 50,   y: 250 });

      if (temp && mcu && relay && heater && mqtt) {
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: relay.id, targetPin: 'control' });
        addConnection({ sourceComponentId: relay.id, sourcePin: 'contact', targetComponentId: heater.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: mqtt.id, targetPin: 'publish' });
      }
      break;
    }
    case 'industrial': {
      const pressure = addComponent('PressureSensor',    { x: -350, y: -150 });
      const temp     = addComponent('TemperatureSensor', { x: -350, y: 100 });
      const filter   = addComponent('FilterBlock',       { x: -50,  y: -150 });
      const pid      = addComponent('PIDController',     { x: 200,  y: 0 });
      const valve    = addComponent('Valve',             { x: 500,  y: -100 });
      const thresh   = addComponent('ThresholdBlock',    { x: 200,  y: 200 });
      const buzzer   = addComponent('Buzzer',            { x: 500,  y: 200 });

      if (pressure && temp && filter && pid && valve && thresh && buzzer) {
        addConnection({ sourceComponentId: pressure.id, sourcePin: 'pressure', targetComponentId: filter.id, targetPin: 'input' });
        addConnection({ sourceComponentId: filter.id, sourcePin: 'output', targetComponentId: pid.id, targetPin: 'processValue' });
        addConnection({ sourceComponentId: pid.id, sourcePin: 'controlOutput', targetComponentId: valve.id, targetPin: 'control' });
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: thresh.id, targetPin: 'value' });
        addConnection({ sourceComponentId: thresh.id, sourcePin: 'triggered', targetComponentId: buzzer.id, targetPin: 'enable' });
      }
      break;
    }
    case 'robotics': {
      const sonic = addComponent('UltrasonicSensor', { x: -350, y: -150 });
      const pir   = addComponent('PIRSensor',        { x: -350, y: 100 });
      const mcu   = addComponent('GenericMCU',       { x: 50,   y: 0 });
      const motor = addComponent('DCMotor',          { x: 450,  y: -150 });
      const servo = addComponent('Servo',            { x: 450,  y: 50 });
      const led   = addComponent('LEDLamp',          { x: 450,  y: 220 });

      if (sonic && pir && mcu && motor && servo && led) {
        addConnection({ sourceComponentId: sonic.id, sourcePin: 'distance', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: pir.id, sourcePin: 'motion', targetComponentId: mcu.id, targetPin: 'input4' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: motor.id, targetPin: 'power' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: motor.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output1', targetComponentId: servo.id, targetPin: 'targetAngle' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output3', targetComponentId: led.id, targetPin: 'enable' });
      }
      break;
    }
    case 'iot-gateway': {
      const temp   = addComponent('TemperatureSensor', { x: -350, y: -200 });
      const humid  = addComponent('HumiditySensor',    { x: -350, y: 0 });
      const gas    = addComponent('GasSensor',         { x: -350, y: 200 });
      const mcu    = addComponent('GenericMCU',        { x: 50,   y: 0 });
      const mqtt   = addComponent('MQTTNode',          { x: 450,  y: -200 });
      const wifi   = addComponent('WiFiModule',        { x: 450,  y: 0 });
      const http   = addComponent('HTTPClientNode',    { x: 450,  y: 200 });

      if (temp && humid && gas && mcu && mqtt && wifi && http) {
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: humid.id, sourcePin: 'humidity', targetComponentId: mcu.id, targetPin: 'input1' });
        addConnection({ sourceComponentId: gas.id, sourcePin: 'ppm', targetComponentId: mcu.id, targetPin: 'input2' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: mqtt.id, targetPin: 'publish' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output1', targetComponentId: http.id, targetPin: 'requestData' });
      }
      break;
    }
    case 'weather-station': {
      const temp     = addComponent('TemperatureSensor', { x: -400, y: -250 });
      const humid    = addComponent('HumiditySensor',    { x: -400, y: -50 });
      const pressure = addComponent('PressureSensor',    { x: -400, y: 150 });
      const light    = addComponent('LightSensor',       { x: -400, y: 350 });
      const mcu      = addComponent('GenericMCU',        { x: 50,   y: 0 });
      const display  = addComponent('Display',           { x: 450,  y: -100 });
      const mqtt     = addComponent('MQTTNode',          { x: 450,  y: 150 });

      if (temp && humid && pressure && light && mcu && display && mqtt) {
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: humid.id, sourcePin: 'humidity', targetComponentId: mcu.id, targetPin: 'input1' });
        addConnection({ sourceComponentId: pressure.id, sourcePin: 'pressure', targetComponentId: mcu.id, targetPin: 'input2' });
        addConnection({ sourceComponentId: light.id, sourcePin: 'lux', targetComponentId: mcu.id, targetPin: 'input3' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: mqtt.id, targetPin: 'publish' });
      }
      break;
    }
    case 'security-alarm': {
      const pir     = addComponent('PIRSensor',    { x: -350, y: -200 });
      const light   = addComponent('LightSensor',  { x: -350, y: 50 });
      const mcu     = addComponent('GenericMCU',   { x: 50,   y: 0 });
      const debounce= addComponent('DebounceBlock',{ x: -100, y: -200 });
      const buzzer  = addComponent('Buzzer',       { x: 450,  y: -200 });
      const led     = addComponent('LEDLamp',      { x: 450,  y: 0 });
      const relay   = addComponent('Relay',        { x: 450,  y: 200 });

      if (pir && light && mcu && debounce && buzzer && led && relay) {
        addConnection({ sourceComponentId: pir.id, sourcePin: 'motion', targetComponentId: debounce.id, targetPin: 'input' });
        addConnection({ sourceComponentId: debounce.id, sourcePin: 'output', targetComponentId: mcu.id, targetPin: 'input4' });
        addConnection({ sourceComponentId: light.id, sourcePin: 'lux', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: buzzer.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output3', targetComponentId: led.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output4', targetComponentId: relay.id, targetPin: 'control' });
      }
      break;
    }
    case 'hvac-system': {
      const temp   = addComponent('TemperatureSensor', { x: -400, y: -150 });
      const humid  = addComponent('HumiditySensor',    { x: -400, y: 100 });
      const pid    = addComponent('PIDController',     { x: 0,    y: -50 });
      const filter = addComponent('FilterBlock',       { x: -150, y: -150 });
      const heater = addComponent('Heater',            { x: 400,  y: -200 });
      const pump   = addComponent('Pump',              { x: 400,  y: 0 });
      const valve  = addComponent('Valve',             { x: 400,  y: 200 });

      if (temp && humid && pid && filter && heater && pump && valve) {
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: filter.id, targetPin: 'input' });
        addConnection({ sourceComponentId: filter.id, sourcePin: 'output', targetComponentId: pid.id, targetPin: 'processValue' });
        addConnection({ sourceComponentId: pid.id, sourcePin: 'controlOutput', targetComponentId: valve.id, targetPin: 'control' });
        addConnection({ sourceComponentId: pid.id, sourcePin: 'controlOutput', targetComponentId: heater.id, targetPin: 'power' });
        addConnection({ sourceComponentId: humid.id, sourcePin: 'humidity', targetComponentId: pump.id, targetPin: 'speed' });
      }
      break;
    }
    case 'motor-control': {
      const current  = addComponent('CurrentSensor', { x: -300, y: 0 });
      const pid      = addComponent('PIDController', { x: 50,   y: 0 });
      const motor    = addComponent('DCMotor',       { x: 400,  y: 0 });
      const watchdog = addComponent('WatchdogTimer', { x: 400,  y: 200 });
      const relay    = addComponent('Relay',         { x: 700,  y: 0 });

      if (current && pid && motor && watchdog && relay) {
        addConnection({ sourceComponentId: current.id, sourcePin: 'current', targetComponentId: pid.id, targetPin: 'processValue' });
        addConnection({ sourceComponentId: pid.id, sourcePin: 'controlOutput', targetComponentId: motor.id, targetPin: 'power' });
        addConnection({ sourceComponentId: motor.id, sourcePin: 'stalled', targetComponentId: relay.id, targetPin: 'control' });
      }
      break;
    }
    case 'water-treatment': {
      const pressure = addComponent('PressureSensor', { x: -350, y: -200 });
      const gas      = addComponent('GasSensor',      { x: -350, y: 50 });
      const mcu      = addComponent('GenericMCU',     { x: 50,   y: 0 });
      const pump     = addComponent('Pump',           { x: 450,  y: -250 });
      const valve    = addComponent('Valve',          { x: 450,  y: -50 });
      const display  = addComponent('Display',        { x: 450,  y: 150 });
      const buzzer   = addComponent('Buzzer',         { x: 450,  y: 320 });

      if (pressure && gas && mcu && pump && valve && display && buzzer) {
        addConnection({ sourceComponentId: pressure.id, sourcePin: 'pressure', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: gas.id, sourcePin: 'ppm', targetComponentId: mcu.id, targetPin: 'input1' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: pump.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: pump.id, targetPin: 'speed' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output1', targetComponentId: valve.id, targetPin: 'control' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output3', targetComponentId: buzzer.id, targetPin: 'enable' });
      }
      break;
    }
    case 'ble-wearable': {
      const temp    = addComponent('TemperatureSensor', { x: -350, y: -150 });
      const current = addComponent('CurrentSensor',     { x: -350, y: 100 });
      const mcu     = addComponent('GenericMCU',        { x: 50,   y: 0 });
      const ble     = addComponent('BLENode',           { x: 450,  y: -150 });
      const led     = addComponent('LEDLamp',           { x: 450,  y: 50 });
      const battery = addComponent('Battery',           { x: 450,  y: 250 });

      if (temp && current && mcu && ble && led && battery) {
        addConnection({ sourceComponentId: temp.id, sourcePin: 'temperature', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: current.id, sourcePin: 'current', targetComponentId: mcu.id, targetPin: 'input1' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: ble.id, targetPin: 'txData' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: led.id, targetPin: 'enable' });
        addConnection({ sourceComponentId: battery.id, sourcePin: 'lowBattery', targetComponentId: mcu.id, targetPin: 'input4' });
      }
      break;
    }
    case 'solar-monitor': {
      const light   = addComponent('LightSensor',       { x: -400, y: -200 });
      const current = addComponent('CurrentSensor',     { x: -400, y: 50 });
      const mcu     = addComponent('GenericMCU',        { x: 50,   y: 0 });
      const battery = addComponent('Battery',           { x: 450,  y: -250 });
      const display = addComponent('Display',           { x: 450,  y: -50 });
      const lora    = addComponent('LoRaNode',          { x: 450,  y: 150 });
      const led     = addComponent('LEDLamp',           { x: 450,  y: 330 });

      if (light && current && mcu && battery && display && lora && led) {
        addConnection({ sourceComponentId: light.id, sourcePin: 'lux', targetComponentId: mcu.id, targetPin: 'input0' });
        addConnection({ sourceComponentId: current.id, sourcePin: 'current', targetComponentId: mcu.id, targetPin: 'input1' });
        addConnection({ sourceComponentId: battery.id, sourcePin: 'soc', targetComponentId: mcu.id, targetPin: 'input2' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output0', targetComponentId: lora.id, targetPin: 'txData' });
        addConnection({ sourceComponentId: mcu.id, sourcePin: 'output2', targetComponentId: led.id, targetPin: 'enable' });
      }
      break;
    }
    case 'traffic-light': {
      const timer = addComponent('TimerModule',       { x: -300, y: 0 });
      const sm    = addComponent('StateMachineBlock', { x: 50,   y: 0 });
      const ledR  = addComponent('LEDLamp',           { x: 450,  y: -200 });
      const ledY  = addComponent('LEDLamp',           { x: 450,  y: 0 });
      const ledG  = addComponent('LEDLamp',           { x: 450,  y: 200 });
      const buzzer= addComponent('Buzzer',            { x: 700,  y: 0 });

      if (timer && sm && ledR && ledY && ledG && buzzer) {
        addConnection({ sourceComponentId: timer.id, sourcePin: 'timeout', targetComponentId: sm.id, targetPin: 'trigger' });
        addConnection({ sourceComponentId: sm.id, sourcePin: 'output0', targetComponentId: ledG.id, targetPin: 'enable' });
      }
      break;
    }
    default:
      break;
  }
}
