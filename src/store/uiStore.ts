import { create } from 'zustand';

export type AppPage = 'start' | 'character-select' | 'game';

/** 统一输入锁定状态。 */
export type InputMode = 'gameplay' | 'dialog' | 'settings';

interface UIState {
  currentPage: AppPage;
  isTaskPanelOpen: boolean;
  isNpcDialogOpen: boolean;
  isSettingsOpen: boolean;
  currentNpcId: string | null;
  inputMode: InputMode;
  isLoading: boolean;
  errorMessage: string | null;
  setPage: (page: AppPage) => void;
  setTaskPanelOpen: (open: boolean) => void;
  setNpcDialogOpen: (open: boolean, npcId?: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setInputMode: (mode: InputMode) => void;
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
  inputMode: 'gameplay',
  isLoading: false,
  errorMessage: null,
  setPage: (page) =>
    set({
      currentPage: page,
      isTaskPanelOpen: false,
      isNpcDialogOpen: false,
      isSettingsOpen: false,
      inputMode: 'gameplay',
    }),
  setTaskPanelOpen: (open) => set({ isTaskPanelOpen: open }),
  setNpcDialogOpen: (open, npcId = null) =>
    set({
      isNpcDialogOpen: open,
      currentNpcId: npcId,
      inputMode: open ? 'dialog' : 'gameplay',
    }),
  setSettingsOpen: (open) =>
    set({
      isSettingsOpen: open,
      inputMode: open ? 'settings' : 'gameplay',
    }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (message) => set({ errorMessage: message }),
  returnToStart: () =>
    set({
      currentPage: 'start',
      isTaskPanelOpen: false,
      isNpcDialogOpen: false,
      isSettingsOpen: false,
      currentNpcId: null,
      inputMode: 'gameplay',
    }),
}));
