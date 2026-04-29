'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { componentCategories, categoryInfo, getComponentsByCategory } from '@/simulation/components';
import type { ComponentModelDefinition } from '@/types';

// Dynamic icon resolver
function ComponentIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>;
  const IconComponent = icons[name];
  if (!IconComponent) return <LucideIcons.Box size={size} color={color} />;
  return <IconComponent size={size} color={color} />;
}

// Component tile — draggable
function ComponentTile({ model }: { model: ComponentModelDefinition }) {
  const cat = categoryInfo[model.category];

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/harness-component', model.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-3 p-3 mb-3 cursor-grab active:cursor-grabbing transition-all border-[3px] border-black bg-white hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1"
      title={model.displayName}
    >
      <div
        className="w-10 h-10 flex items-center justify-center shrink-0 border-[3px] border-black bg-white group-hover:bg-black transition-colors"
      >
        <ComponentIcon name={model.icon} size={20} color="currentColor" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black uppercase truncate leading-tight transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
          {model.displayName}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mt-1">
          {model.category}
        </div>
      </div>
    </div>
  );
}

export default function ComponentLibrary() {
  const searchQuery = useUIStore(s => s.componentSearchQuery);
  const setSearchQuery = useUIStore(s => s.setComponentSearchQuery);
  const expandedCategories = useUIStore(s => s.expandedCategories);
  const toggleCategory = useUIStore(s => s.toggleCategory);

  return (
    <div
      className="h-full flex flex-col overflow-hidden bg-white border-r-[3px] border-black"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b-[3px] border-black bg-white">
        <span className="text-xs font-black uppercase tracking-widest text-black">COMPONENTS</span>
      </div>

      {/* Search */}
      <div className="px-4 py-4 border-b-[3px] border-black bg-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 border-[3px] border-black bg-white focus-within:ring-4 focus-within:ring-gray-200 transition-all">
          <Search size={16} className="text-black shrink-0" strokeWidth={3} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH NODES..."
            className="bg-transparent outline-none text-xs font-bold uppercase text-black placeholder:text-gray-400 w-full"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {componentCategories.map(category => {
          const cat = categoryInfo[category];
          const components = getComponentsByCategory(category);
          const filtered = searchQuery
            ? components.filter(c =>
                c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.type.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : components;

          if (searchQuery && filtered.length === 0) return null;

          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left bg-black text-white hover:bg-gray-800 transition-colors border-[3px] border-black group"
              >
                {isExpanded
                  ? <ChevronDown size={16} className="shrink-0" strokeWidth={3} />
                  : <ChevronRight size={16} className="shrink-0" strokeWidth={3} />
                }
                <span
                  className="text-xs font-black uppercase tracking-widest"
                >
                  {cat.label}
                </span>
                <span className="text-[10px] font-bold text-black ml-auto bg-white px-2 border-2 border-black">
                  {filtered.length}
                </span>
              </button>
              {isExpanded && (
                <div className="space-y-3 pt-3">
                  {filtered.map(model => (
                    <ComponentTile key={model.type} model={model} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
