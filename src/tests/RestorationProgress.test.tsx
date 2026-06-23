import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useUIStore } from '@/store/uiStore';
import { RestorationProgress } from '@/ui/components/RestorationProgress';

function emitStarted() {
  gameBridge.emit('RESTORATION_STARTED', {
    targetId: 'restoration.pollution_zone_01',
    interactionId: 'interaction.pollution_zone_01',
    displayName: '污染物堆',
    durationMs: 3000,
  });
}

function emitInterrupted(progress: number, reason: string, inRange: boolean) {
  gameBridge.emit('RESTORATION_INTERRUPTED', {
    targetId: 'restoration.pollution_zone_01',
    interactionId: 'interaction.pollution_zone_01',
    progress,
    reason,
    inRange,
  });
}

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
        inRange: true,
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

  // ─── 范围外中断与恢复 ───────────────────────────────────

  it('hides progress component after leaving range (interrupted with inRange=false)', () => {
    vi.useFakeTimers();
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    // 中断且不在范围
    act(() => {
      emitInterrupted(0.5, '离开交互范围', false);
    });

    // 短暂显示离开提示
    expect(
      screen.getByText(/清理已暂停，请返回污染物堆附近继续/),
    ).toBeInTheDocument();

    // 等待自动隐藏
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(/清理已暂停/)).not.toBeInTheDocument();
  });

  it('shows "按住 E 继续" hint when interrupted in range', () => {
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    act(() => {
      emitInterrupted(0.5, '松开 E', true);
    });

    expect(screen.getByText(/清理已暂停 — 按住 E 继续/)).toBeInTheDocument();
  });

  it('restores display when re-entering range after leaving', () => {
    vi.useFakeTimers();
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    // 离开范围
    act(() => {
      emitInterrupted(0.5, '离开交互范围', false);
    });

    // 等待自动隐藏
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/清理已暂停/)).not.toBeInTheDocument();

    // 重新进入范围
    act(() => {
      emitInterrupted(0.5, '重新进入交互范围', true);
    });

    // 应重新显示“按住 E 继续”提示
    expect(screen.getByText(/清理已暂停 — 按住 E 继续/)).toBeInTheDocument();
  });

  it('preserves progress value after leaving and re-entering range', () => {
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    act(() => {
      emitInterrupted(0.6, '离开交互范围', false);
    });

    // 进度应为 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('does not show paused UI when completed', () => {
    vi.useFakeTimers();
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    act(() => {
      gameBridge.emit('RESTORATION_COMPLETED', {
        targetId: 'restoration.pollution_zone_01',
        interactionId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
      });
    });

    // 完成状态不显示暂停提示
    expect(screen.queryByText(/清理已暂停/)).not.toBeInTheDocument();
    expect(screen.getByText(/清理完成/)).toBeInTheDocument();
  });

  it('resets UI when leaving game page (currentPage !== game)', () => {
    render(<RestorationProgress />);

    act(() => {
      emitStarted();
    });

    expect(screen.getByText(/正在清理污染物堆/)).toBeInTheDocument();

    // 模拟返回开始页
    act(() => {
      useUIStore.getState().returnToStart();
    });

    expect(screen.queryByText(/正在清理/)).not.toBeInTheDocument();
    expect(screen.queryByText(/清理已暂停/)).not.toBeInTheDocument();
  });
});
