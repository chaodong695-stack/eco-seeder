/**
 * NPC 对话框测试 — DEV-06 第二轮修复后。
 *
 * 所有 NPC 只展示每日任务对话，不再有旧任务系统的接受/提交流程。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NpcDialog } from '@/ui/components/NpcDialog';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from "@/store/environmentStore";
import { useDailyTaskStore } from '@/store/dailyTaskStore';

// Mock worldStore
vi.mock('@/store/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      timeSnapshot: { localDate: '2025-06-18' },
      getWeatherTimeline: () => ({
        date: '2025-06-18',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '1', startMinute: 0, endMinute: 360, weather: 'clear', intensity: 0.2 },
          { id: '2', startMinute: 361, endMinute: 720, weather: 'light_rain', intensity: 0.6 },
          { id: '3', startMinute: 721, endMinute: 1080, weather: 'heavy_rain', intensity: 0.9 },
          { id: '4', startMinute: 1081, endMinute: 1439, weather: 'fog', intensity: 0.7 },
        ],
      }),
      getDisplayWeather: () => 'clear' as const,
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock playerStore
vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' },
    }),
  },
}));

// Mock gameBridge
vi.mock('@/game/bridge/GameBridge', () => ({
  gameBridge: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
    off: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('NpcDialog — daily task only', () => {
  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useEnvironmentStore.getState().resetEnvironment();
    useUIStore.getState().returnToStart();
    vi.clearAllMocks();
  });

  describe('林工 dialog', () => {
    beforeEach(() => {
      useDailyTaskStore.getState().init();
      useUIStore.getState().setNpcDialogOpen(true, 'npc.engineer.lin');
    });

    it('renders NPC name and role', () => {
      render(<NpcDialog />);
      expect(screen.getByText('林工')).toBeInTheDocument();
      expect(screen.getByText('生态修复工程师')).toBeInTheDocument();
    });

    it('shows daily task content — no old task accept dialog', () => {
      render(<NpcDialog />);
      // Should NOT show old task text
      expect(screen.queryByText('旧工业区东侧还有一处污染物堆没有完成检查。')).not.toBeInTheDocument();
      expect(screen.queryByText('接受任务')).not.toBeInTheDocument();
    });

    it('shows daily task accept options or close', () => {
      render(<NpcDialog />);
      // Should show either daily task accept options or end dialog
      const endButton = screen.queryByText('结束对话');
      const dismissButton = screen.queryByText('稍后再说');
      const acceptButtons = screen.queryAllByText(/接取：/);

      // At least one option should be present
      expect(endButton || dismissButton || acceptButtons.length > 0).toBeTruthy();
    });

    it('closes on close button', () => {
      render(<NpcDialog />);
      fireEvent.click(screen.getByText('✕'));
      expect(useUIStore.getState().isNpcDialogOpen).toBe(false);
    });
  });

  describe('巡查员 dialog', () => {
    beforeEach(() => {
      useDailyTaskStore.getState().init();
      useUIStore.getState().setNpcDialogOpen(true, 'npc_weather_ranger');
    });

    it('renders NPC name and role', () => {
      render(<NpcDialog />);
      expect(screen.getByText('巡查员')).toBeInTheDocument();
      expect(screen.getByText('环境巡查员')).toBeInTheDocument();
    });

    it('shows daily task dialog content', () => {
      render(<NpcDialog />);
      // Should not show old task text
      expect(screen.queryByText('接受任务')).not.toBeInTheDocument();
      // Should show daily task content
      const endButton = screen.queryByText('结束对话');
      const dismissButton = screen.queryByText('稍后再说');
      const acceptButtons = screen.queryAllByText(/接取：/);

      expect(endButton || dismissButton || acceptButtons.length > 0).toBeTruthy();
    });
  });
});
