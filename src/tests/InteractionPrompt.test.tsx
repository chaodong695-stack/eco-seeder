import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { gameBridge } from '@/game/bridge/GameBridge';
import { InteractionPrompt } from '@/ui/components/InteractionPrompt';

describe('InteractionPrompt', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows interaction hint when INTERACTION_AVAILABLE is emitted', () => {
    render(<InteractionPrompt />);

    act(() => {
      gameBridge.emit('INTERACTION_AVAILABLE', {
        objectId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        type: 'pollution',
        hint: '按 E 交互',
      });
    });

    expect(screen.getByText(/污染物堆/)).toBeInTheDocument();
    expect(screen.getByText(/按 E 交互/)).toBeInTheDocument();
  });

  it('hides hint when INTERACTION_UNAVAILABLE is emitted', () => {
    render(<InteractionPrompt />);

    act(() => {
      gameBridge.emit('INTERACTION_AVAILABLE', {
        objectId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        type: 'pollution',
        hint: '按 E 交互',
      });
    });

    expect(screen.getByText(/污染物堆/)).toBeInTheDocument();

    act(() => {
      gameBridge.emit('INTERACTION_UNAVAILABLE', {
        objectId: 'interaction.pollution_zone_01',
      });
    });

    expect(screen.queryByText(/污染物堆/)).not.toBeInTheDocument();
  });

  it('shows feedback message when INTERACTION_TRIGGERED is emitted', () => {
    vi.useFakeTimers();
    render(<InteractionPrompt />);

    act(() => {
      gameBridge.emit('INTERACTION_TRIGGERED', {
        objectId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        type: 'pollution',
        message: '已检查污染区域，正式修复功能将在后续任务中实现。',
      });
    });

    expect(
      screen.getByText('已检查污染区域，正式修复功能将在后续任务中实现。'),
    ).toBeInTheDocument();
  });

  it('feedback disappears after timeout', () => {
    vi.useFakeTimers();
    render(<InteractionPrompt />);

    act(() => {
      gameBridge.emit('INTERACTION_TRIGGERED', {
        objectId: 'interaction.pollution_zone_01',
        displayName: '污染物堆',
        type: 'pollution',
        message: '已检查污染区域，正式修复功能将在后续任务中实现。',
      });
    });

    expect(
      screen.getByText('已检查污染区域，正式修复功能将在后续任务中实现。'),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.queryByText('已检查污染区域，正式修复功能将在后续任务中实现。'),
    ).not.toBeInTheDocument();
  });

  it('stops responding after unmount', () => {
    const { unmount } = render(<InteractionPrompt />);

    unmount();

    // Should not throw after unmount
    expect(() => {
      act(() => {
        gameBridge.emit('INTERACTION_AVAILABLE', {
          objectId: 'test',
          displayName: 'test',
          type: 'pollution',
          hint: 'test',
        });
      });
    }).not.toThrow();
  });
});
