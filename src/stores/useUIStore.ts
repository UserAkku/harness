import { create } from 'zustand';

export type BottomTab = 'eventLog' | 'waveform' | 'testResults' | 'faultEvents';
export type RightPanelTab = 'properties' | 'firmware' | 'pins' | 'faults';

interface UIState {
  // Panel visibility
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;

  // Bottom panel
  bottomPanelHeight: number;
  activeBottomTab: BottomTab;

  // Right panel
  activeRightTab: RightPanelTab;

  // Selection
  selectedComponentId: string | null;
  selectedConnectionId: string | null;

  // Component library search
  componentSearchQuery: string;
  expandedCategories: Set<string>;

  // Event log filters
  logFilterComponent: string;
  logFilterLevel: string;
  logAutoScroll: boolean;

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveBottomTab: (tab: BottomTab) => void;
  setActiveRightTab: (tab: RightPanelTab) => void;
  selectComponent: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  setComponentSearchQuery: (query: string) => void;
  toggleCategory: (category: string) => void;
  setLogFilterComponent: (component: string) => void;
  setLogFilterLevel: (level: string) => void;
  setLogAutoScroll: (auto: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
  bottomPanelHeight: 240,
  activeBottomTab: 'eventLog',
  activeRightTab: 'properties',
  selectedComponentId: null,
  selectedConnectionId: null,
  componentSearchQuery: '',
  expandedCategories: new Set(['SENSOR', 'CONTROLLER', 'ACTUATOR', 'NETWORK', 'LOGIC', 'POWER']),
  logFilterComponent: '',
  logFilterLevel: '',
  logAutoScroll: true,

  toggleLeftPanel: () => set(s => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(120, Math.min(600, height)) }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  selectComponent: (id) => set({ selectedComponentId: id, selectedConnectionId: null, rightPanelOpen: id !== null }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedComponentId: null }),
  setComponentSearchQuery: (query) => set({ componentSearchQuery: query }),
  toggleCategory: (category) => set(s => {
    const newSet = new Set(s.expandedCategories);
    if (newSet.has(category)) newSet.delete(category);
    else newSet.add(category);
    return { expandedCategories: newSet };
  }),
  setLogFilterComponent: (component) => set({ logFilterComponent: component }),
  setLogFilterLevel: (level) => set({ logFilterLevel: level }),
  setLogAutoScroll: (auto) => set({ logAutoScroll: auto }),
}));
