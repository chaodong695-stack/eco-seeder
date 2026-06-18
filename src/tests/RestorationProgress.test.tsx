import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { gameBridge } from '@/game/bridge/GameBridge';
import { RestorationProgress } from '@/ui/components/RestorationProgress';

describe('RestorationProgress UI', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is not visible initially', () => {
    render(<RestorationProgress />);
    expect(screen.queryByText(/正在清理/)).not.toBeInTheDocument();
  });

  it('shows target name when RESTORATION_STARTED is emitted', () => {
    render(<RestorationProgress />);

    act(() => {
      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      });
    });

    expect(screen.getByText(/正在清理污染物堆/)).toBeInTheDocument();
  });

  it('shows correct percentage on progress', () => {
    render(<RestorationProgress />);

    act(() => {
      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      });
    });

    act(() => {
      gameBridge.emit('RESTORATION_PROGRESS', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        progress: 0.8,
        elapsedMs: 2400,
        durationMs: 3000,
      });
    });

    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows pause hint when interrupted', () => {
    render(<RestorationProgress />);

    act(() => {
      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      });
    });

    act(() => {
      gameBridge.emit('RESTORATION_INTERRUPTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        progress: 0.5,
        reason: '松开 E',
      });
    });

    expect(screen.getByText(/清理已暂停/)).toBeInTheDocument();
  });

  it('shows completion and then hides', () => {
    vi.useFakeTimers();
    render(<RestorationProgress />);

    act(() => {
      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      });
    });

    act(() => {
      gameBridge.emit('RESTORATION_COMPLETED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
      });
    });

    expect(screen.getByText(/清理完成/)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText(/清理完成/)).not.toBeInTheDocument();
  });

  it('shows hold E hint during progress', () => {
    render(<RestorationProgress />);

    act(() => {
      gameBridge.emit('RESTORATION_STARTED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        durationMs: 3000,
      });
    });

    expect(screen.getByText(/松开 E 将暂停清理/)).toBeInTheDocument();
  });

  it('stops responding after unmount', () => {
    const { unmount } = render(<RestorationProgress />);
    unmount();

    expect(() => {
      act(() => {
        gameBridge.emit('RESTORATION_STARTED', {
          targetId: 'test',
          interactionId: 'test',
          displayName: 'test',
          durationMs: 1000,
        });
      });
    }).not.toThrow();
  });
});
