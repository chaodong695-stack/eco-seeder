import type { AgentResponse, AgentTaskContext, AgentOptionContext, AgentReviewContext } from '@/types/agent';

/**
 * Agent 服务接口。
 *
 * 依据 04_TECHNICAL_ARCHITECTURE.md 第 10 节和 05_INTERFACE_CONTRACTS.md 第 9 节。
 *
 * v0.1 使用 MockAgentService，不接入：
 * - 外部大模型 API
 * - API Key
 * - Token
 * - 远程推理服务
 * - 自建后端
 */
export interface AgentService {
  explainTask(context: AgentTaskContext): Promise<AgentResponse>;
  explainOptions(context: AgentOptionContext): Promise<AgentResponse>;
  generateReview(context: AgentReviewContext): Promise<AgentResponse>;
}
