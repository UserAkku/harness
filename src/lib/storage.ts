import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Project } from '@/types';

interface HarnessDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'updatedAt': string };
  };
}

let dbPromise: Promise<IDBPDatabase<HarnessDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<HarnessDB>('harness-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export const Storage = {
  // --- Local IDB First ---
  async saveProject(project: Project): Promise<void> {
    const db = await getDB();
    if (db) {
      project.updatedAt = new Date().toISOString();
      await db.put('projects', project);
    }
    
    // Fire and forget to custom API
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    }).catch(err => console.warn('Cloud sync failed:', err));
  },

  async getProject(id: string): Promise<Project | null> {
    const db = await getDB();
    if (db) {
      const local = await db.get('projects', id);
      if (local) return local;
    }

    // Fallback to API
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const cloudData = await res.json();
        const project = mapRowToProject(cloudData);
        if (db) await db.put('projects', project);
        return project;
      }
    } catch (err) {
      console.error('Fetch project failed:', err);
    }
    return null;
  },

  async getAllProjects(): Promise<Project[]> {
    const db = await getDB();
    let localProjects: Project[] = [];
    if (db) {
      localProjects = await db.getAllFromIndex('projects', 'updatedAt');
      localProjects.reverse();
    }
    return localProjects;
  },

  async deleteProject(id: string): Promise<void> {
    const db = await getDB();
    if (db) {
      await db.delete('projects', id);
    }
    fetch(`/api/projects/${id}`, { method: 'DELETE' })
      .catch(err => console.warn('Cloud delete failed:', err));
  },

  // --- Cloud Sync ---
  async syncFromCloud(): Promise<Project[]> {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const cloudData = await res.json();

      const projects = cloudData.map(mapRowToProject);
      
      const db = await getDB();
      if (db) {
        const tx = db.transaction('projects', 'readwrite');
        const store = tx.objectStore('projects');
        for (const p of projects) {
          await store.put(p);
        }
        await tx.done;
      }
      return projects;
    } catch (error) {
      console.error('Sync failed:', error);
      return this.getAllProjects(); // fallback to local
    }
  }
};

// Map Prisma DB schema to our frontend Project model
function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    canvas: row.canvasData || { components: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } },
    tests: row.tests || [],
    faultScenarios: row.faultScenarios || [],
    simulationConfig: row.simulationConfig || { tickIntervalUs: 1000, maxEventsPerTick: 100, defaultSpeed: 1 },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
