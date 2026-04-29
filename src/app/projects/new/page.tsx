'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';

// This route handles the case when a project was just imported or created
// and needs to redirect to the actual project editor
export default function NewProjectRedirect() {
  const router = useRouter();
  const project = useProjectStore(s => s.project);

  useEffect(() => {
    if (project) {
      router.replace(`/projects/${project.id}`);
    } else {
      router.replace('/');
    }
  }, [project, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <span className="text-sm font-black uppercase tracking-widest text-black">
        REDIRECTING...
      </span>
    </div>
  );
}
