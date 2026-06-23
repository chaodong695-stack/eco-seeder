import { describe, it, expect } from 'vitest';
import { MockAgentService } from '@/services/agent/MockAgentService';
import type { AgentTaskContext, AgentOptionContext, AgentReviewContext } from '@/types/agent';

describe('MockAgentService', () => {
  const service = new MockAgentService();

  const taskContext: AgentTaskContext = {
    taskId: 'task.test',
    taskName: '测试任务',
    mapId: 'map.urban_wasteland',
  };

  const optionContext: AgentOptionContext = {
    dungeonId: 'dungeon.test',
    optionId: 'option.test',
    mapId: 'map.urban_wasteland',
  };

  const reviewContext: AgentReviewContext = {
    dungeonId: 'dungeon.test',
    outcomeCode: 'outcome.test',
    mapId: 'map.urban_wasteland',
  };

  it('explainTask returns fallback response', async () => {
    const response = await service.explainTask(taskContext);
    expect(response.title).toBe('AI 生态助手');
    expect(response.finalNotice).toBe('最终选择由你决定。');
    expect(response.riskItems).toEqual([]);
  });

  it('explainOptions returns fallback response', async () => {
    const response = await service.explainOptions(optionContext);
    expect(response.title).toBe('AI 生态助手');
    expect(response.stateReminder).toHaveLength(1);
  });

  it('generateReview returns fallback response', async () => {
    const response = await service.generateReview(reviewContext);
    expect(response.title).toBe('AI 生态助手');
    expect(response.uncertainty).toBeDefined();
  });
});
