/**
 * 修复行为控制器。
 *
 * 管理修复行为的启动、进度计算、中断和完成。
 * 不将修复逻辑全部写入 Scene，而是作为独立控制器。
 *
 * 职责：
 * - 根据任务状态和交互状态决定是否可启动清理；
 * - 基于 Phaser 更新循环 delta 累积进度；
 * - 中断时保留进度；
 * - 完成时只触发一次环境效果和任务目标完成；
 * - 通过 GameBridge 发出类型化事件。
 */

import type { RestorationTargetDefinition } from './restorationTypes';
import type { RestorationActionStatus } from './restorationTypes';
import { canRestorationTransition } from './restorationStateMachine';
import {
  calculateProgress,
  accumulateElapsed,
  isProgressComplete,
  clamp01,
} from './restorationProgress';
import { gameBridge } from '../bridge/GameBridge';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';

/** 进度事件最小变化阈值（避免每帧大量 React 重渲染）。 */
const PROGRESS_EMIT_THRESHOLD = 0.01;

export class RestorationController {
  private readonly target: RestorationTargetDefinition;
  private status: RestorationActionStatus = 'idle';
  private elapsedMs = 0;
  private lastEmittedProgress = -1;
  private isEKeyHeld = false;
  private isInRange = false;

  constructor(target: RestorationTargetDefinition) {
    this.target = target;
  }

  /** 获取当前状态。 */
  getStatus(): RestorationActionStatus {
    return this.status;
  }

  /** 获取当前进度（0–1）。 */
  getProgress(): number {
    return calculateProgress(this.elapsedMs, this.target.durationMs);
  }

  /** 获取当前已过时间。 */
  getElapsedMs(): number {
    return this.elapsedMs;
  }

  /** 设置 E 键持续状态。 */
  setEKeyHeld(held: boolean): void {
    this.isEKeyHeld = held;
  }

  /** 设置玩家是否在交互范围内。 */
  setInRange(inRange: boolean): void {
    const wasInRange = this.isInRange;
    this.isInRange = inRange;

    // 离开范围时，如果当前状态为 interrupted，
    // 重新发出中断事件以通知 UI 隐藏（标记 inRange=false）。
    if (wasInRange && !inRange && this.status === 'interrupted') {
      gameBridge.emit('RESTORATION_INTERRUPTED', {
        targetId: this.target.id,
        interactionId: this.target.interactionId,
        progress: this.getProgress(),
        reason: '离开交互范围',
        inRange: false,
      });
    }

    // 重新进入范围时，如果当前状态为 interrupted，
    // 重新发出中断事件以通知 UI 重新显示（标记 inRange=true）。
    if (!wasInRange && inRange && this.status === 'interrupted') {
      gameBridge.emit('RESTORATION_INTERRUPTED', {
        targetId: this.target.id,
        interactionId: this.target.interactionId,
        progress: this.getProgress(),
        reason: '重新进入交互范围',
        inRange: true,
      });
    }
  }

  /** 获取关联的修复目标定义。 */
  getTarget(): RestorationTargetDefinition {
    return this.target;
  }

  /**
   * 判断当前是否可以启动修复。
   *
   * 条件：
   * - 任务状态为 active；
   * - 修复状态为 idle 或 interrupted；
   * - E 键按住；
   * - 玩家在范围内；
   * - 输入模式为 gameplay。
   */
  canStart(): boolean {
    if (this.status === 'completed') return false;
    if (this.status === 'in_progress') return false;

    const taskStatus = useTaskStore.getState().getTaskStatus(this.target.taskId);
    if (taskStatus !== 'active') return false;

    const inputMode = useUIStore.getState().inputMode;
    if (inputMode !== 'gameplay') return false;

    return this.isEKeyHeld && this.isInRange;
  }

  /**
   * 每帧更新 — 由 Scene 调用。
   *
   * 基于 delta 时间累积进度，不依赖键盘重复事件。
   */
  update(deltaMs: number): void {
    // 已完成则不再处理
    if (this.status === 'completed') return;

    // 检查中断条件
    if (this.status === 'in_progress') {
      if (this.shouldInterrupt()) {
        this.interrupt('条件变化');
        return;
      }
    }

    // 检查启动条件
    if (this.status === 'idle' || this.status === 'interrupted') {
      if (this.canStart()) {
        this.start();
      } else {
        return;
      }
    }

    // 进行中 — 累积进度
    if (this.status === 'in_progress') {
      // 再次检查中断（可能在 start 后状态变化）
      if (this.shouldInterrupt()) {
        this.interrupt('条件变化');
        return;
      }

      this.elapsedMs = accumulateElapsed(
        this.elapsedMs,
        deltaMs,
        this.target.durationMs,
      );

      const progress = this.getProgress();
      this.emitProgress(progress);

      if (isProgressComplete(progress)) {
        this.complete();
      }
    }
  }

  /**
   * 判断是否应该中断。
   */
  private shouldInterrupt(): boolean {
    // E 键松开
    if (!this.isEKeyHeld) return true;
    // 离开范围
    if (!this.isInRange) return true;
    // 输入模式被其他 UI 占用（设置面板/NPC 对话打开）
    // restoration 模式是自身设置的，不应中断
    const currentMode = useUIStore.getState().inputMode;
    if (currentMode !== 'gameplay' && currentMode !== 'restoration') return true;
    // 如果输入模式是 gameplay 但我们在 restoration 中，说明被外部重置了
    if (currentMode === 'gameplay' && this.status === 'in_progress') return true;
    // 任务不再是 active
    const taskStatus = useTaskStore.getState().getTaskStatus(this.target.taskId);
    if (taskStatus !== 'active') return true;
    return false;
  }

  /**
   * 启动修复。
   */
  private start(): void {
    if (!canRestorationTransition(this.status, 'in_progress')) return;

    this.status = 'in_progress';

    // 锁定输入模式为 restoration
    useUIStore.getState().setInputMode('restoration');

    gameBridge.emit('RESTORATION_STARTED', {
      targetId: this.target.id,
      interactionId: this.target.interactionId,
      displayName: this.target.displayName,
      durationMs: this.target.durationMs,
    });
  }

  /**
   * 中断修复 — 保留进度。
   */
  interrupt(reason: string): void {
    if (this.status !== 'in_progress') return;
    if (!canRestorationTransition('in_progress', 'interrupted')) return;

    this.status = 'interrupted';

    // 恢复输入模式为 gameplay
    useUIStore.getState().setInputMode('gameplay');

    const progress = this.getProgress();
    gameBridge.emit('RESTORATION_INTERRUPTED', {
      targetId: this.target.id,
      interactionId: this.target.interactionId,
      progress,
      reason,
      inRange: this.isInRange,
    });
  }

  /**
   * 完成修复 — 只触发一次。
   */
  private complete(): void {
    if (this.status !== 'in_progress') return;
    if (!canRestorationTransition('in_progress', 'completed')) return;

    this.status = 'completed';

    // 恢复输入模式为 gameplay
    useUIStore.getState().setInputMode('gameplay');

    // 应用环境效果（防重复 — Store 内部保证）
    const effect = this.target.environmentEffects[0];
    if (effect) {
      const applied = useEnvironmentStore.getState().applyEffect(
        this.target.id,
        effect,
      );

      if (applied) {
        // 重新获取最新状态
        const envStore = useEnvironmentStore.getState();
        const envState = envStore.state;
        gameBridge.emit('ENVIRONMENT_UPDATED', {
          pollution: envState.pollution,
          vegetation: envState.vegetation,
          waterQuality: envState.waterQuality,
          restorationProgress: envState.restorationProgress,
          visualStage: envStore.visualStage,
        });

        gameBridge.emit('VISUAL_STAGE_CHANGED', {
          interactionId: this.target.interactionId,
          stage: envStore.visualStage,
        });
      }
    }

    // 完成任务目标（只调用一次）
    const taskStore = useTaskStore.getState();
    const success = taskStore.completeObjective(
      this.target.taskId,
      this.target.interactionId,
    );

    if (success) {
      gameBridge.emit('TASK_OBJECTIVE_COMPLETED', {
        taskId: this.target.taskId,
        interactionId: this.target.interactionId,
      });
    }

    gameBridge.emit('RESTORATION_COMPLETED', {
      targetId: this.target.id,
      interactionId: this.target.interactionId,
      displayName: this.target.displayName,
    });

    gameBridge.emit('TASK_FEEDBACK', {
      message: '污染物堆已完成临时清理，请返回林工处报告。',
    });
  }

  /**
   * 发出进度事件（带最小变化阈值节流）。
   */
  private emitProgress(progress: number): void {
    const clamped = clamp01(progress);
    if (Math.abs(clamped - this.lastEmittedProgress) < PROGRESS_EMIT_THRESHOLD) {
      return;
    }
    this.lastEmittedProgress = clamped;

    gameBridge.emit('RESTORATION_PROGRESS', {
      targetId: this.target.id,
      interactionId: this.target.interactionId,
      progress: clamped,
      elapsedMs: this.elapsedMs,
      durationMs: this.target.durationMs,
    });
  }

  /**
   * 强制中断 — 场景销毁、返回开始页等场景调用。
   *
   * 无论当前处于什么状态，都发出中断事件以通知 UI 隐藏。
   * completed 状态不发出中断事件（已完成无需隐藏进度 UI，
   * 完成事件已有自动隐藏逻辑）。
   */
  forceInterrupt(reason: string): void {
    if (this.status === 'in_progress') {
      this.interrupt(reason);
    } else if (this.status === 'interrupted' || this.status === 'idle') {
      // 已经中断或未开始 — 仍然发出中断事件以确保 UI 隐藏
      gameBridge.emit('RESTORATION_INTERRUPTED', {
        targetId: this.target.id,
        interactionId: this.target.interactionId,
        progress: this.getProgress(),
        reason,
        inRange: false,
      });
    }
    // 重置 E 键状态
    this.isEKeyHeld = false;
    this.isInRange = false;
  }

  /**
   * 重置控制器状态。
   */
  reset(): void {
    this.status = 'idle';
    this.elapsedMs = 0;
    this.lastEmittedProgress = -1;
    this.isEKeyHeld = false;
    this.isInRange = false;
  }

  /**
   * 同步为已完成状态 — 场景恢复时调用。
   * 如果环境效果已应用，将控制器状态设为 completed。
   */
  syncCompleted(): void {
    const envStore = useEnvironmentStore.getState();
    if (envStore.isEffectApplied(this.target.id)) {
      this.status = 'completed';
      this.elapsedMs = this.target.durationMs;
      this.lastEmittedProgress = 1;
    }
  }

  /**
   * 获取当前交互提示文本。
   */
  getInteractionHint(): string {
    const taskStatus = useTaskStore.getState().getTaskStatus(this.target.taskId);

    if (this.status === 'in_progress') {
      return '正在清理污染物堆';
    }

    if (this.status === 'completed') {
      return '污染物堆 — 已完成临时清理';
    }

    if (this.status === 'interrupted') {
      return '清理已暂停 — 按住 E 继续';
    }

    // idle 状态
    if (taskStatus === 'active') {
      return '污染物堆 — 按住 E 清理';
    }

    // 未接取任务
    return '污染物堆 — 按 E 检查';
  }
}
