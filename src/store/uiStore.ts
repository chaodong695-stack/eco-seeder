import { create } from 'zustand';

export type AppPage = 'start' | 'character-select' | 'game';

interface UIState {
  currentPage: AppPage;
  isTaskPanelOpen: boolean;
  isNpcDialogOpen: boolean;
  isSettingsOpen: boolean;
  currentNpcId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  setPage: (page: AppPage) => void;
  setTaskPanelOpen: (open: boolean) => void;
  setNpcDialogOpen: (open: boolean, npcId?: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  returnToStart: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'start',
  isTaskPanelOpen: false,
  isNpcDialogOpen: false,
  isSettingsOpen: false,
  currentNpcId: null,
  isLoading: false,
  errorMessage: null,
  setPage: (page) =>
    set({
      currentPage: page,
      isTaskPanelOpen: false,
      isNpcDialogOpen: false,
      isSettingsOpen: false,
    }),
  setTaskPanelOpen: (open) => set({ isTaskPanelOpen: open }),
  setNpcDialogOpen: (open, npcId = null) =>
    set({ isNpcDialogOpen: open, currentNpcId: npcId }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (message) => set({ errorMessage: message }),
  returnToStart: () =>
    set({
      currentPage: 'start',
      isTaskPanelOpen: false,
      isNpcDialogOpen: false,
      isSettingsOpen: false,
      currentNpcId: null,
    }),
}));
