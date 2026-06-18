import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '@/store/taskStore';

const TASK_ID = 'task.urban_wasteland.pollution_cleanup_01';

describe('TaskStore', () => {
  beforeEach(() => {
    useTaskStore.getState().resetTasks();
  });

  describe('initial state', () => {
    it('starts with task in available status', () => {
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('available');
    });

    it('has no reward claimed initially', () => {
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(false);
    });

    it('has empty objective text initially', () => {
      expect(useTaskStore.getState().tasks[TASK_ID].currentObjectiveText).toBe('');
    });
  });

  describe('acceptTask', () => {
    it('transitions to active on accept', () => {
      const result = useTaskStore.getState().acceptTask(TASK_ID);
      expect(result).toBe(true);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });

    it('sets objective text on accept', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      expect(useTaskStore.getState().tasks[TASK_ID].currentObjectiveText).toBe(
        '前往工业区东侧，检查并清理污染物堆',
      );
    });

    it('fails to accept unknown task', () => {
      const result = useTaskStore.getState().acceptTask('task.unknown');
      expect(result).toBe(false);
    });

    it('fails to accept already active task', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      const result = useTaskStore.getState().acceptTask(TASK_ID);
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });
  });

  describe('completeObjective', () => {
    it('transitions to objective_completed with correct interaction ID', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      const result = useTaskStore
        .getState()
        .completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      expect(result).toBe(true);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('objective_completed');
    });

    it('updates objective text after completion', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      expect(useTaskStore.getState().tasks[TASK_ID].currentObjectiveText).toBe(
        '返回林工处提交任务',
      );
    });

    it('fails with wrong interaction ID', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      const result = useTaskStore
        .getState()
        .completeObjective(TASK_ID, 'interaction.wrong_id');
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });

    it('fails when task is still available (not accepted)', () => {
      const result = useTaskStore
        .getState()
        .completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('available');
    });

    it('fails to complete objective twice', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      const result = useTaskStore
        .getState()
        .completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('objective_completed');
    });
  });

  describe('submitTask', () => {
    it('transitions to completed with correct NPC ID', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      const result = useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');
      expect(result).toBe(true);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('completed');
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(true);
    });

    it('fails with wrong NPC ID', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      const result = useTaskStore.getState().submitTask(TASK_ID, 'npc.wrong_id');
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('objective_completed');
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(false);
    });

    it('fails to submit when objective not completed', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      const result = useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');
      expect(result).toBe(false);
      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('active');
    });

    it('fails to submit when task is still available', () => {
      const result = useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');
      expect(result).toBe(false);
    });

    it('prevents duplicate submission (reward only once)', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      // First submission succeeds
      const result1 = useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');
      expect(result1).toBe(true);
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(true);
      // Second submission fails
      const result2 = useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');
      expect(result2).toBe(false);
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(true);
    });
  });

  describe('getTaskReward', () => {
    it('returns reward definition', () => {
      const reward = useTaskStore.getState().getTaskReward(TASK_ID);
      expect(reward).toEqual({ ecoPoints: 10, reputation: 5 });
    });

    it('returns undefined for unknown task', () => {
      const reward = useTaskStore.getState().getTaskReward('task.unknown');
      expect(reward).toBeUndefined();
    });
  });

  describe('resetTasks', () => {
    it('resets all tasks to initial state', () => {
      useTaskStore.getState().acceptTask(TASK_ID);
      useTaskStore.getState().completeObjective(TASK_ID, 'interaction.pollution_zone_01');
      useTaskStore.getState().submitTask(TASK_ID, 'npc.engineer.lin');

      useTaskStore.getState().resetTasks();

      expect(useTaskStore.getState().getTaskStatus(TASK_ID)).toBe('available');
      expect(useTaskStore.getState().isRewardClaimed(TASK_ID)).toBe(false);
      expect(useTaskStore.getState().tasks[TASK_ID].currentObjectiveText).toBe('');
    });
  });
});
