import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { RestorationController } from '@/game/restoration/RestorationController';
import { POLLUTION_ZONE_01_TARGET } from '@/game/restoration/restorationDefinitions';

const TASK_ID = 'task.urban_wasteland.pollution_cleanup_01';
const INTERACTION_ID = 'interaction.pollution_zone_01';

/**
 * 视觉阶段事件生命周期测试。
 *
 * 验证：
 * - Scene shutdown 后 VISUAL_STAGE_CHANGED 不再调用旧处理函数；
 * - 重复进入场景不会重复注册视觉事件；
 * - 视觉阶段事件只允许当前 active Scene 处理。
 */
describe('VISUAL_STAGE_CHANGED lifecycle', () => {
  beforeEach(() => {
    gameBridge.clear();
    useTaskStore.getState().resetTasks();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
  });

  it('unsubscribed handler does not receive events after unsubscribe', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('VISUAL_STAGE_CHANGED', handler);

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not receive events after gameBridge.clear() (simulating Scene shutdown)', () => {
    const handler = vi.fn();
    gameBridge.on('VISUAL_STAGE_CHANGED', handler);

    // Simulate what GameInstance.destroy does: clear all listeners
    gameBridge.clear();

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-registering after clear does not produce duplicate handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    // First "scene" registers handler1
    gameBridge.on('VISUAL_STAGE_CHANGED', handler1);
    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(0);

    // Scene shutdown / destroy — clears all
    gameBridge.clear();

    // Second "scene" registers handler2
    gameBridge.on('VISUAL_STAGE_CHANGED', handler2);
    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });

    expect(handler1).toHaveBeenCalledTimes(1); // not called again
    expect(handler2).toHaveBeenCalledTimes(1); // called once
  });

  it('multiple VISUAL_STAGE_CHANGED events each invoke handler once', () => {
    const handler = vi.fn();
    gameBridge.on('VISUAL_STAGE_CHANGED', handler);

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

/**
 * RestorationController 在 task 模式下不能启动的测试。
 */
describe('RestorationController — task mode blocking', () => {
  let controller: RestorationController;

  beforeEach(() => {
    useTaskStore.getState().resetTasks();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
    gameBridge.clear();
    controller = new RestorationController(POLLUTION_ZONE_01_TARGET);
  });

  it('cannot start when inputMode is task', () => {
    useTaskStore.getState().acceptTask(TASK_ID);

    // Set input mode to task (simulating TaskPanel open)
    useUIStore.getState().setTaskPanelOpen(true);
    expect(useUIStore.getState().inputMode).toBe('task');

    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);

    expect(controller.getStatus()).toBe('idle');
  });

  it('in_progress restoration is interrupted when inputMode changes to task', () => {
    useTaskStore.getState().acceptTask(TASK_ID);

    // Start restoration
    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);
    expect(controller.getStatus()).toBe('in_progress');

    // Simulate input mode changing to task externally
    // (e.g., another part of the system sets it)
    useUIStore.getState().setInputMode('task');
    expect(useUIStore.getState().inputMode).toBe('task');

    controller.update(16);
    expect(controller.getStatus()).toBe('interrupted');
  });

  it('can start after task panel is closed', () => {
    useTaskStore.getState().acceptTask(TASK_ID);

    useUIStore.getState().setTaskPanelOpen(true);
    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);
    expect(controller.getStatus()).toBe('idle');

    // Close task panel — back to gameplay
    useUIStore.getState().setTaskPanelOpen(false);
    expect(useUIStore.getState().inputMode).toBe('gameplay');

    controller.update(16);
    expect(controller.getStatus()).toBe('in_progress');
  });
});
