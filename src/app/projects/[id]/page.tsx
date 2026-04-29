'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useProjectStore } from '@/stores/useProjectStore';
import { Storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/useAuthStore';
import { Box } from 'lucide-react';

// Dynamically import the heavy editor to drastically improve page load time
const EditorLayout = dynamic(() => import('@/components/layout/EditorLayout'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center border-[3px] border-black m-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="w-16 h-16 bg-black flex items-center justify-center mb-6 animate-pulse">
        <Box size={32} className="text-white" />
      </div>
      <div className="text-xl font-black uppercase tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
        INITIALIZING WORKSPACE...
      </div>
    </div>
  )
});

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProjectStore(s => s.project);
  const loadProject = useProjectStore(s => s.loadProject);
  const createProject = useProjectStore(s => s.createProject);
  const setDirty = useProjectStore(s => s.setDirty);
  const isDirty = useProjectStore(s => s.isDirty);
  
  const { user, init, loading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Initialize auth first
  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    async function initProject() {
      // Don't try loading project if auth is still determining state
      if (authLoading) return;
      
      if (!project || project.id !== projectId) {
        // Try loading from DB
        const saved = await Storage.getProject(projectId);
        if (saved) {
          loadProject(saved);
        } else {
          // If still not found, we redirect back to dashboard or create
          alert('Project not found or you lack permission');
          router.replace('/dashboard');
          return;
        }
      }
      setLoading(false);
    }
    initProject();
  }, [projectId, project, loadProject, createProject, authLoading, router]);

  // Auto-save
  useEffect(() => {
    if (project && isDirty) {
      const timer = setTimeout(() => {
        Storage.saveProject(project).then(() => {
          setDirty(false);
          useProjectStore.getState().setLastSaved(new Date().toISOString());
        });
      }, 1500); // Debounce 1.5s
      return () => clearTimeout(timer);
    }
  }, [project, isDirty, setDirty]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center border-[3px] border-black m-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-16 h-16 bg-black flex items-center justify-center mb-6 animate-pulse">
          <Box size={32} className="text-white" />
        </div>
        <div className="text-xl font-black uppercase tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
          LOADING PROJECT DATA...
        </div>
      </div>
    );
  }

  return <EditorLayout />;
}
