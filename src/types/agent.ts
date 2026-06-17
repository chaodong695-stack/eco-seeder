export interface AgentResponse {
  title: string;
  background: string;
  riskItems: AgentRiskItem[];
  stateReminder: string[];
  uncertainty?: string;
  finalNotice: string;
  knowledgeEntryIds?: string[];
}

export interface AgentTaskContext {
  taskId: string;
  taskName: string;
  mapId: string;
}

export interface AgentOptionContext {
  dungeonId: string;
  optionId: string;
  mapId: string;
}

export interface AgentReviewContext {
  dungeonId: string;
  outcomeCode: string;
  mapId: string;
}

export interface AgentRiskItem {
  optionId?: string;
  level: 'low' | 'medium' | 'high' | 'unknown';
  text: string;
}
