import { describe, it, expect } from 'vitest';
import { resolveDialog } from '@/game/npc/npcDialogResolver';
import type { TaskStatus } from '@/game/tasks/taskTypes';

const NPC_NAME = '林工';
const NPC_ROLE = '生态修复工程师';

describe('NpcDialogResolver', () => {
  describe('available status', () => {
    it('returns dialog with accept task option', () => {
      const dialog = resolveDialog(NPC_NAME, NPC_ROLE, 'available');
      expect(dialog.npcName).toBe(NPC_NAME);
      expect(dialog.npcRole).toBe(NPC_ROLE);
      expect(dialog.lines).toContain(
        '旧工业区东侧还有一处污染物堆没有完成检查。',
      );
      expect(dialog.options.some((o) => o.label === '接受任务')).toBe(true);
      expect(dialog.options.some((o) => o.label === '暂时不去')).toBe(true);
    });
  });

  describe('active status', () => {
    it('returns dialog without accept task option', () => {
      const dialog = resolveDialog(NPC_NAME, NPC_ROLE, 'active');
      expect(dialog.lines).toContain('污染物堆就在工业区东侧。');
      expect(dialog.lines).toContain('完成检查后再回来找我。');
      expect(dialog.options.some((o) => o.label === '我知道了')).toBe(true);
      // Should not show accept task
      expect(dialog.options.some((o) => o.label === '接受任务')).toBe(false);
    });
  });

  describe('objective_completed status', () => {
    it('returns dialog with submit task option', () => {
      const dialog = resolveDialog(NPC_NAME, NPC_ROLE, 'objective_completed');
      expect(dialog.lines).toContain('你已经处理完那处污染物堆了吗？');
      expect(dialog.options.some((o) => o.label === '提交任务')).toBe(true);
      expect(dialog.options.some((o) => o.label === '稍后再说')).toBe(true);
    });
  });

  describe('completed status', () => {
    it('returns ending dialog', () => {
      const dialog = resolveDialog(NPC_NAME, NPC_ROLE, 'completed');
      expect(dialog.lines).toContain(
        '处理得不错。这里的污染扩散风险暂时降低了。',
      );
      expect(dialog.lines).toContain('后续我们还需要继续修复这片区域。');
      expect(dialog.options.some((o) => o.label === '结束对话')).toBe(true);
      // Should not show accept or submit
      expect(dialog.options.some((o) => o.label === '接受任务')).toBe(false);
      expect(dialog.options.some((o) => o.label === '提交任务')).toBe(false);
    });
  });

  describe('different statuses return different dialog', () => {
    it('returns different lines for each status', () => {
      const statuses: TaskStatus[] = [
        'available',
        'active',
        'objective_completed',
        'completed',
      ];
      const lines = statuses.map(
        (s) => resolveDialog(NPC_NAME, NPC_ROLE, s).lines[0],
      );
      // All first lines should be unique
      expect(new Set(lines).size).toBe(4);
    });

    it('returns different options for each status', () => {
      const statuses: TaskStatus[] = [
        'available',
        'active',
        'objective_completed',
        'completed',
      ];
      const optionLabels = statuses.map((s) =>
        resolveDialog(NPC_NAME, NPC_ROLE, s)
          .options.map((o) => o.label)
          .join(','),
      );
      // All option sets should be unique
      expect(new Set(optionLabels).size).toBe(4);
    });
  });
});
