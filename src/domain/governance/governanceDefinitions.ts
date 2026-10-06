import type { EnvironmentEffect } from '@/game/restoration/restorationTypes';

export type GovernanceRegion = 'monitoring' | 'cleanup' | 'repair';
export type GovernanceStage = 'briefing' | 'monitoring' | 'cleanup' | 'repair' | 'verification' | 'complete';
export interface GovernancePoint {
  id: string;
  title: string;
  region: GovernanceRegion;
  stage: GovernanceStage;
  sourceId?: string;
  problem: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  success: string;
  explanation: string;
  effect?: EnvironmentEffect;
}

export const GOVERNANCE_HOLD_MS = 2000;
export const GOVERNANCE_POINTS: GovernancePoint[] = [
  {
    id: 'monitor.baseline', title: '建立监测基线', region: 'monitoring', stage: 'monitoring',
    problem: '废水池、管线和受损地块都存在异常。先取得基线，才能确认治理目标。',
    options: [{ id: 'sample', label: '采集废水与土壤样本，记录设备读数' }, { id: 'ignore', label: '只看水的颜色，直接判断已经达标' }, { id: 'dilute', label: '加水稀释后再记录读数' }],
    correctOptionId: 'sample', success: '基线已记录：发现废水设施、泄漏管线与两处受损环境。下一步处理污染源。',
    explanation: '需要先记录原始状态；外观不能替代监测，稀释会改变基线。',
  },
  {
    id: 'cleanup.wastewater', title: '废水设施处理', region: 'cleanup', stage: 'cleanup',
    problem: '废水设施破损，污染水可能继续外泄。应先控制源头，再进入环境修复。',
    options: [{ id: 'contain', label: '隔离废水，修复防渗并收集处理' }, { id: 'discharge', label: '直接将废水排入河道' }, { id: 'paint', label: '涂上绿色油漆，遮住破损' }],
    correctOptionId: 'contain', success: '废水已隔离处理，防渗设施修复完成。',
    explanation: '外观变化不能控制污染；必须阻断外泄并处理收集的废水。',
    effect: { pollution: -20, vegetation: 0, waterQuality: 15, restorationProgress: 25 },
  },
  {
    id: 'cleanup.leak', title: '泄漏管线处理', region: 'cleanup', stage: 'cleanup',
    problem: '管线连接处持续泄漏，单纯清理地面无法消除污染来源。',
    options: [{ id: 'isolate', label: '隔离泄漏管线，修复接口并检查密封' }, { id: 'wipe', label: '只擦掉地面污渍，保持设备运行' }, { id: 'cover', label: '盖住泄漏接口，等它自行停止' }],
    correctOptionId: 'isolate', success: '泄漏源已隔离，接口修复与密封检查完成。下一步修复受损环境。',
    explanation: '源头仍泄漏时，地面清理只能暂时掩盖问题。',
    effect: { pollution: -20, vegetation: 0, waterQuality: 5, restorationProgress: 25 },
  },
  {
    id: 'repair.soil', title: '受损点一：土壤修复', region: 'repair', stage: 'repair', sourceId: 'interaction.damaged_env_01',
    problem: '污染源已控制，但土壤仍受损。应处理污染土壤，再恢复植被。',
    options: [{ id: 'remediate', label: '处理污染土壤，恢复适宜植被' }, { id: 'bury', label: '覆土掩埋污染，不再检查' }, { id: 'plant', label: '跳过土壤处理，直接种植' }],
    correctOptionId: 'remediate', success: '土壤修复完成，植被开始恢复。',
    explanation: '种植不能替代污染处理；先治理土壤，再恢复生态。',
    effect: { pollution: -10, vegetation: 30, waterQuality: 10, restorationProgress: 25 },
  },
  {
    id: 'repair.water', title: '受损点二：水岸修复', region: 'repair', stage: 'repair', sourceId: 'interaction.damaged_env_02',
    problem: '岸边残留污染物，水岸植被受损。需要清理残留并恢复生态缓冲带。',
    options: [{ id: 'restore', label: '收集残留污染物，修复水岸缓冲带' }, { id: 'flush', label: '把岸边污染物冲入水中' }, { id: 'decorate', label: '摆放装饰植物，不处理残留' }],
    correctOptionId: 'restore', success: '水岸残留已清理，缓冲带恢复。请回环境监测装置复测验收。',
    explanation: '把污染转移到水中不是治理；应收集处理残留并恢复生态功能。',
    effect: { pollution: -10, vegetation: 25, waterQuality: 30, restorationProgress: 25 },
  },
  {
    id: 'monitor.verify', title: '治理后复测验收', region: 'monitoring', stage: 'verification',
    problem: '所有治理点已完成，需要用与基线一致的方法复测，确认治理成果。',
    options: [{ id: 'compare', label: '按原方法复测，对比基线与治理结果' }, { id: 'assume', label: '看到植物变绿，就直接宣布达标' }, { id: 'skip', label: '跳过复测，修改报告数值' }],
    correctOptionId: 'compare', success: '复测通过，旧工业区首轮治理完成。',
    explanation: '验收需要可比较的监测结果，不能只凭外观或修改记录。',
  },
];

export const GOVERNANCE_STAGE_TEXT: Record<GovernanceStage, { title: string; objective: string }> = {
  briefing: { title: '接受治理委托', objective: '找到林工，接取旧工业区首轮治理任务。' },
  monitoring: { title: '监测发现问题', objective: '靠近环境监测装置按 E，建立监测基线。' },
  cleanup: { title: '处理污染源', objective: '靠近污染物堆按 E，处理废水设施和泄漏管线。' },
  repair: { title: '修复受损环境', objective: '前往两个受损环境点按 E，分别修复土壤和水岸。' },
  verification: { title: '复测验收', objective: '回到环境监测装置按 E，复测并对比治理前后结果。' },
  complete: { title: '首轮治理完成', objective: '查看治理报告，或返回主地图继续探索。' },
};

export function deriveGovernanceStage(accepted: boolean, completed: readonly string[]): GovernanceStage {
  if (!accepted) return 'briefing';
  for (const stage of ['monitoring', 'cleanup', 'repair', 'verification'] as const) {
    if (GOVERNANCE_POINTS.some(p => p.stage === stage && !completed.includes(p.id))) return stage;
  }
  return 'complete';
}
