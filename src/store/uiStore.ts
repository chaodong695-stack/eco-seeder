import { create } from 'zustand';

export type AppPage = 'start' | 'character-select' | 'game';

/** 统一输入锁定状态。 */
export type InputMode =
  | 'gameplay'
  | 'task'
  | 'restoration'
  | 'dialog'
  | 'settings';

/**
 * 计算关闭某个 UI 后应该恢复到哪个输入模式。
 *
 * 逐个检查其他 UI 是否仍处于打开状态，
 * 如果仍有 UI 打开则返回对应的输入模式，
 * 否则恢复 gameplay。
 */
function computeModeAfterClose(state: UIState): InputMode {
  if (state.isNpcDialogOpen) return 'dialog';
  if (state.isSettingsOpen) return 'settings';
  if (state.isTaskPanelOpen) return 'task';
  return 'gameplay';
}

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
  setTaskPanelOpen: (open) =>
    set((state) => {
      if (open) {
        // 互斥：修复进行中不允许打开
        if (state.inputMode === 'restoration') return state;
        return { isTaskPanelOpen: true, inputMode: 'task' as InputMode };
      }
      return {
        isTaskPanelOpen: false,
        inputMode: computeModeAfterClose({ ...state, isTaskPanelOpen: false }),
      };
    }),
  setNpcDialogOpen: (open, npcId = null) =>
    set((state) => {
      if (open) {
        return {
          isNpcDialogOpen: true,
          currentNpcId: npcId,
          inputMode: 'dialog' as InputMode,
        };
      }
      return {
        isNpcDialogOpen: false,
        currentNpcId: npcId,
        inputMode: computeModeAfterClose({ ...state, isNpcDialogOpen: false }),
      };
    }),
  setSettingsOpen: (open) =>
    set((state) => {
      if (open) {
        return { isSettingsOpen: true, inputMode: 'settings' as InputMode };
      }
      return {
        isSettingsOpen: false,
        inputMode: computeModeAfterClose({ ...state, isSettingsOpen: false }),
      };
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
