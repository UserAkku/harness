import { create } from 'zustand';
import type {
  ComponentInstance,
  Connection,
  Project,
  TestSuite,
  FaultScenario,
  SimulationConfig,
} from '@/types';
import { v4 as uuid } from 'uuid';
import { getComponentModel } from '@/simulation/components';

interface ProjectState {
  // Current project
  project: Project | null;
  isDirty: boolean;
  lastSaved: string | null;

  // Projects list
  projects: Project[];

  // Actions
  createProject: (name: string, description?: string) => Project;
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  updateProjectDescription: (desc: string) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (time: string) => void;

  // Canvas operations
  addComponent: (type: string, position: { x: number; y: number }) => ComponentInstance | null;
  removeComponent: (id: string) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  updateComponentName: (id: string, name: string) => void;
  updateComponentProperty: (id: string, propertyId: string, value: number | boolean | string) => void;
  updateComponentFirmware: (id: string, firmware: string) => void;
  addConnection: (conn: Omit<Connection, 'id'>) => Connection;
  removeConnection: (id: string) => void;

  // Test operations
  addTestSuite: (suite: TestSuite) => void;
  updateTestSuite: (id: string, updates: Partial<TestSuite>) => void;
  removeTestSuite: (id: string) => void;

  // Fault scenarios
  addFaultScenario: (scenario: FaultScenario) => void;
  removeFaultScenario: (id: string) => void;

  // Project list
  setProjects: (projects: Project[]) => void;
  deleteProject: (id: string) => void;

  // Export
  exportProject: () => string;
  importProject: (json: string) => void;
}

const defaultSimConfig: SimulationConfig = {
  tickIntervalUs: 100000,
  maxEventsPerTick: 1000,
  defaultSpeed: 1,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  isDirty: false,
  lastSaved: null,
  projects: [],

  createProject: (name, description = '') => {
    const project: Project = {
      id: uuid(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvas: {
        components: [],
        connections: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      tests: [],
      faultScenarios: [],
      simulationConfig: { ...defaultSimConfig },
    };
    set({ project, isDirty: true });
    return project;
  },

  loadProject: (project) => {
    set({ project: { ...project }, isDirty: false });
  },

  updateProjectName: (name) => {
    set(state => {
      if (!state.project) return state;
      return { project: { ...state.project, name, updatedAt: new Date().toISOString() }, isDirty: true };
    });
  },

  updateProjectDescription: (desc) => {
    set(state => {
      if (!state.project) return state;
      return { project: { ...state.project, description: desc, updatedAt: new Date().toISOString() }, isDirty: true };
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastSaved: (time) => set({ lastSaved: time }),

  addComponent: (type, position) => {
    const model = getComponentModel(type);
    if (!model) return null;

    const id = uuid();
    const pinValues: Record<string, number | boolean | string> = {};
    for (const pin of model.pins) {
      pinValues[pin.id] = pin.defaultValue;
    }

    const properties: Record<string, number | boolean | string> = {};
    for (const prop of model.defaultProperties) {
      properties[prop.id] = prop.defaultValue;
    }

    const comp: ComponentInstance = {
      id,
      type,
      name: `${model.displayName} ${id.substring(0, 4)}`,
      category: model.category,
      position,
      properties,
      firmware: model.defaultFirmware,
      pinValues,
      state: {},
      faults: [],
      status: 'idle',
      waveformData: {},
    };

    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: [...state.project.canvas.components, comp],
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });

    return comp;
  },

  removeComponent: (id) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: state.project.canvas.components.filter(c => c.id !== id),
            connections: state.project.canvas.connections.filter(
              c => c.sourceComponentId !== id && c.targetComponentId !== id
            ),
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  updateComponentPosition: (id, position) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: state.project.canvas.components.map(c =>
              c.id === id ? { ...c, position } : c
            ),
          },
        },
        isDirty: true,
      };
    });
  },

  updateComponentName: (id, name) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: state.project.canvas.components.map(c =>
              c.id === id ? { ...c, name } : c
            ),
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  updateComponentProperty: (id, propertyId, value) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: state.project.canvas.components.map(c =>
              c.id === id ? { ...c, properties: { ...c.properties, [propertyId]: value } } : c
            ),
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  updateComponentFirmware: (id, firmware) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            components: state.project.canvas.components.map(c =>
              c.id === id ? { ...c, firmware } : c
            ),
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  addConnection: (conn) => {
    const connection: Connection = { ...conn, id: uuid() };
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            connections: [...state.project.canvas.connections, connection],
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
    return connection;
  },

  removeConnection: (id) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          canvas: {
            ...state.project.canvas,
            connections: state.project.canvas.connections.filter(c => c.id !== id),
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  addTestSuite: (suite) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: { ...state.project, tests: [...state.project.tests, suite], updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  updateTestSuite: (id, updates) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tests: state.project.tests.map(t => t.id === id ? { ...t, ...updates } : t),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  removeTestSuite: (id) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: { ...state.project, tests: state.project.tests.filter(t => t.id !== id), updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  addFaultScenario: (scenario) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: { ...state.project, faultScenarios: [...state.project.faultScenarios, scenario], updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  removeFaultScenario: (id) => {
    set(state => {
      if (!state.project) return state;
      return {
        project: { ...state.project, faultScenarios: state.project.faultScenarios.filter(f => f.id !== id), updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  setProjects: (projects) => set({ projects }),
  deleteProject: (id) => set(state => ({ projects: state.projects.filter(p => p.id !== id) })),

  exportProject: () => {
    const { project } = get();
    if (!project) return '';
    return JSON.stringify(project, null, 2);
  },

  importProject: (json) => {
    try {
      const project = JSON.parse(json) as Project;
      project.id = uuid();
      project.updatedAt = new Date().toISOString();
      set({ project, isDirty: true });
    } catch {
      console.error('Failed to import project');
    }
  },
}));
