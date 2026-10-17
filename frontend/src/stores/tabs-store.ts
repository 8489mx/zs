import { create } from 'zustand';

export interface AppBrowserTab {
  id: string;
  path: string;
  title: string;
  iconKey?: string;
  createdAt: number;
}

const STORAGE_KEY = 'zerp_browser_tabs_v1';
const DEFAULT_TAB: AppBrowserTab = {
  id: 'tab-initial',
  path: '/dashboard',
  title: 'الرئيسية',
  iconKey: 'dashboard',
  createdAt: 1700000000000,
};

export function normalizeAppPath(path: string): string {
  if (!path) return '/dashboard';
  let clean = path.trim().split('#')[0];
  // Remove trailing slashes
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.replace(/\/+$/, '');
  }
  // Treat root '/' or empty string as '/dashboard'
  if (clean === '' || clean === '/') {
    return '/dashboard';
  }
  return clean;
}

function loadStoredTabs(): { tabs: AppBrowserTab[]; activeTabId: string } {
  if (typeof window === 'undefined') {
    return { tabs: [DEFAULT_TAB], activeTabId: DEFAULT_TAB.id };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        // Deduplicate any tabs that share the same normalized path
        const uniqueTabs: AppBrowserTab[] = [];
        const seenPaths = new Set<string>();

        for (const tab of parsed.tabs) {
          const norm = normalizeAppPath(tab.path);
          if (!seenPaths.has(norm)) {
            seenPaths.add(norm);
            uniqueTabs.push({
              ...tab,
              path: norm,
              title: norm === '/dashboard' ? 'الرئيسية' : tab.title,
            });
          }
        }

        if (uniqueTabs.length > 0) {
          const activeExists = uniqueTabs.some((t) => t.id === parsed.activeTabId);
          return {
            tabs: uniqueTabs,
            activeTabId: activeExists ? parsed.activeTabId : uniqueTabs[0].id,
          };
        }
      }
    }
  } catch (_) {
    // fallback
  }
  return { tabs: [DEFAULT_TAB], activeTabId: DEFAULT_TAB.id };
}

function saveStoredTabs(tabs: AppBrowserTab[], activeTabId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  } catch (_) {
    // ignore storage quota errors
  }
}

interface TabsState {
  tabs: AppBrowserTab[];
  activeTabId: string;
  isTabsBarVisible: boolean;
  setTabsBarVisible: (visible: boolean) => void;
  openTab: (tab: { path: string; title: string; iconKey?: string; makeActive?: boolean }) => { id: string; isNew: boolean };
  closeTab: (tabId: string) => string | null;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => string;
  setActiveTabId: (id: string) => void;
  syncCurrentRoute: (path: string, fallbackTitle?: string, fallbackIcon?: string) => void;
}

const initialData = loadStoredTabs();

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: initialData.tabs,
  activeTabId: initialData.activeTabId,
  isTabsBarVisible: true,

  setTabsBarVisible: (visible) => set({ isTabsBarVisible: visible }),

  openTab: ({ path, title, iconKey, makeActive = true }) => {
    const { tabs, activeTabId } = get();
    const cleanPath = normalizeAppPath(path);

    // Check if a tab with this exact normalized path already exists
    const existingIndex = tabs.findIndex(
      (t) => normalizeAppPath(t.path) === cleanPath || normalizeAppPath(t.path).split('?')[0] === cleanPath.split('?')[0]
    );

    if (existingIndex >= 0) {
      const existingTab = tabs[existingIndex];
      const updatedTabs = [...tabs];
      // Refresh title and path in case query params or title evolved
      updatedTabs[existingIndex] = {
        ...existingTab,
        path: cleanPath,
        title: title || existingTab.title,
        iconKey: iconKey || existingTab.iconKey,
      };

      const newActiveId = makeActive ? existingTab.id : activeTabId;
      set({ tabs: updatedTabs, activeTabId: newActiveId });
      saveStoredTabs(updatedTabs, newActiveId);
      return { id: existingTab.id, isNew: false };
    }

    const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTab: AppBrowserTab = {
      id: newId,
      path: cleanPath,
      title: title || (cleanPath === '/dashboard' ? 'الرئيسية' : 'صفحة جديدة'),
      iconKey: iconKey || (cleanPath === '/dashboard' ? 'dashboard' : 'settings'),
      createdAt: Date.now(),
    };

    const nextTabs = [...tabs, newTab];
    const nextActiveId = makeActive ? newId : activeTabId;

    set({ tabs: nextTabs, activeTabId: nextActiveId });
    saveStoredTabs(nextTabs, nextActiveId);
    return { id: newId, isNew: true };
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) {
      // If closing the last tab, reset to default dashboard
      const resetTab: AppBrowserTab = {
        id: `tab-dash-${Date.now()}`,
        path: '/dashboard',
        title: 'الرئيسية',
        iconKey: 'dashboard',
        createdAt: Date.now(),
      };
      set({ tabs: [resetTab], activeTabId: resetTab.id });
      saveStoredTabs([resetTab], resetTab.id);
      return resetTab.path;
    }

    const indexToRemove = tabs.findIndex((t) => t.id === tabId);
    if (indexToRemove === -1) return null;

    let targetPathToNavigate: string | null = null;
    let nextActiveId = activeTabId;

    if (tabId === activeTabId) {
      // Active tab is being closed, pick an adjacent tab
      const adjacentIndex = indexToRemove > 0 ? indexToRemove - 1 : indexToRemove + 1;
      const targetTab = tabs[adjacentIndex] || tabs[0];
      nextActiveId = targetTab.id;
      targetPathToNavigate = targetTab.path;
    }

    const nextTabs = tabs.filter((t) => t.id !== tabId);
    set({ tabs: nextTabs, activeTabId: nextActiveId });
    saveStoredTabs(nextTabs, nextActiveId);
    return targetPathToNavigate;
  },

  closeOtherTabs: (tabId) => {
    const { tabs } = get();
    const keptTab = tabs.find((t) => t.id === tabId) || tabs[0];
    if (!keptTab) return;

    const nextTabs = [keptTab];
    set({ tabs: nextTabs, activeTabId: keptTab.id });
    saveStoredTabs(nextTabs, keptTab.id);
  },

  closeAllTabs: () => {
    const resetTab: AppBrowserTab = {
      id: `tab-dash-${Date.now()}`,
      path: '/dashboard',
      title: 'الرئيسية',
      iconKey: 'dashboard',
      createdAt: Date.now(),
    };
    set({ tabs: [resetTab], activeTabId: resetTab.id });
    saveStoredTabs([resetTab], resetTab.id);
    return resetTab.path;
  },

  setActiveTabId: (id) => {
    const { tabs } = get();
    const target = tabs.find((t) => t.id === id);
    if (target) {
      set({ activeTabId: id });
      saveStoredTabs(tabs, id);
    }
  },

  syncCurrentRoute: (path, fallbackTitle, fallbackIcon) => {
    const { tabs, activeTabId } = get();
    const cleanPath = normalizeAppPath(path);
    if (!cleanPath) return;

    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);

    if (activeIndex >= 0) {
      const activeTab = tabs[activeIndex];
      const currentNorm = normalizeAppPath(activeTab.path);
      // Only update if path or title changed
      if (currentNorm !== cleanPath || (fallbackTitle && activeTab.title !== fallbackTitle)) {
        const updatedTabs = [...tabs];
        updatedTabs[activeIndex] = {
          ...activeTab,
          path: cleanPath,
          title: fallbackTitle || activeTab.title,
          iconKey: fallbackIcon || activeTab.iconKey,
        };
        set({ tabs: updatedTabs });
        saveStoredTabs(updatedTabs, activeTabId);
      }
    } else {
      // If activeTabId is not found, activate matching tab or create one
      const existing = tabs.find((t) => normalizeAppPath(t.path) === cleanPath);
      if (existing) {
        set({ activeTabId: existing.id });
        saveStoredTabs(tabs, existing.id);
      } else {
        const newTab: AppBrowserTab = {
          id: `tab-${Date.now()}`,
          path: cleanPath,
          title: fallbackTitle || (cleanPath === '/dashboard' ? 'الرئيسية' : 'صفحة جديدة'),
          iconKey: fallbackIcon || (cleanPath === '/dashboard' ? 'dashboard' : 'settings'),
          createdAt: Date.now(),
        };
        const nextTabs = [...tabs, newTab];
        set({ tabs: nextTabs, activeTabId: newTab.id });
        saveStoredTabs(nextTabs, newTab.id);
      }
    }
  },
}));
