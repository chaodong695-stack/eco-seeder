import type { AgentService } from './AgentService';
import type { AgentResponse, AgentTaskContext, AgentOptionContext, AgentReviewContext } from '@/types/agent';

/**
 * 本地占位 AI 生态助手。
 *
 * 依据 04_TECHNICAL_ARCHITECTURE.md 第 10 节：
 * v0.1 使用 MockAgentService，不接入外部大模型 API。
 */
export class MockAgentService implements AgentService {
  async explainTask(_context: AgentTaskContext): Promise<AgentResponse> {
    return this.fallback();
  }

  async explainOptions(_context: AgentOptionContext): Promise<AgentResponse> {
    return this.fallback();
  }

  async generateReview(_context: AgentReviewContext): Promise<AgentResponse> {
    return this.fallback();
  }

  private fallback(): AgentResponse {
    return {
      title: 'AI 生态助手',
      background: '当前为占位模式，AI 生态助手暂未接入正式服务。',
      riskItems: [],
      stateReminder: ['环境状态正在加载中。'],
      uncertainty: '占位模式下不提供具体环境分析。',
      finalNotice: '最终选择由你决定。',
    };
  }
}
