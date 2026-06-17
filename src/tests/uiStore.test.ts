import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().returnToStart();
  });

  it('starts on start page', () => {
    expect(useUIStore.getState().currentPage).toBe('start');
  });

  it('navigates to character-select page', () => {
    useUIStore.getState().setPage('character-select');
    expect(useUIStore.getState().currentPage).toBe('character-select');
  });

  it('navigates to game page and resets overlays', () => {
    useUIStore.getState().setTaskPanelOpen(true);
    useUIStore.getState().setPage('game');
    expect(useUIStore.getState().currentPage).toBe('game');
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('opens and closes task panel', () => {
    useUIStore.getState().setTaskPanelOpen(true);
    expect(useUIStore.getState().isTaskPanelOpen).toBe(true);
    useUIStore.getState().setTaskPanelOpen(false);
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
  });

  it('opens and closes NPC dialog with npcId', () => {
    useUIStore.getState().setNpcDialogOpen(true, 'npc.test');
    expect(useUIStore.getState().isNpcDialogOpen).toBe(true);
    expect(useUIStore.getState().currentNpcId).toBe('npc.test');
    useUIStore.getState().setNpcDialogOpen(false);
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    expect(useUIStore.getState().currentNpcId).toBe(null);
  });

  it('opens and closes settings panel', () => {
    useUIStore.getState().setSettingsOpen(true);
    expect(useUIStore.getState().isSettingsOpen).toBe(true);
    useUIStore.getState().setSettingsOpen(false);
    expect(useUIStore.getState().isSettingsOpen).toBe(false);
  });

  it('returns to start and resets all overlays', () => {
    useUIStore.getState().setPage('game');
    useUIStore.getState().setTaskPanelOpen(true);
    useUIStore.getState().setNpcDialogOpen(true, 'npc.test');
    useUIStore.getState().setSettingsOpen(true);
    useUIStore.getState().returnToStart();
    expect(useUIStore.getState().currentPage).toBe('start');
    expect(useUIStore.getState().isTaskPanelOpen).toBe(false);
    expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    expect(useUIStore.getState().isSettingsOpen).toBe(false);
    expect(useUIStore.getState().currentNpcId).toBe(null);
  });
});
