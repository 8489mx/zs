import { create } from 'zustand';
import { useEffect } from 'react';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

interface ToolbarState {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (crumbs: BreadcrumbItem[]) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (isOpen: boolean) => void;
}

export const useToolbarStore = create<ToolbarState>((set) => ({
  breadcrumbs: [],
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
  globalSearchQuery: '',
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}));

export function useAppToolbar(breadcrumbs: BreadcrumbItem[]) {
  useEffect(() => {
    useToolbarStore.getState().setBreadcrumbs(breadcrumbs);
    return () => {
      // Clear on unmount so previous pages don't inherit wrong breadcrumbs if they don't set them
      useToolbarStore.getState().setBreadcrumbs([]);
    };
    // We use a serialized version for dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(breadcrumbs)]); 
}
