import { create } from 'zustand';
import { z } from 'zod';
import { gameBridge } from '@/game/bridge/GameBridge';
import type { PlayerCharacterGender } from '@/types';
import { INITIAL_ENVIRONMENT_STATE, useEnvironmentStore, type EnvironmentState } from './environmentStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { POLLUTION_ZONE_01_TARGET } from '@/game/restoration/restorationDefinitions';
import { clamp100 } from '@/game/restoration/restorationProgress';
import { deriveGovernanceStage, GOVERNANCE_HOLD_MS, GOVERNANCE_POINTS, type GovernanceRegion, type GovernanceStage } from '@/domain/governance/governanceDefinitions';

const SAVE_KEY = 'eco-seeder.governance.v1';
const environmentSchema = z.object({ pollution: z.number().finite().min(0).max(100), vegetation: z.number().finite().min(0).max(100), waterQuality: z.number().finite().min(0).max(100), restorationProgress: z.number().finite().min(0).max(100) });
const saveSchema = z.object({
  version: z.literal(1), characterGender: z.enum(['male', 'female']), accepted: z.boolean(), completedPointIds: z.array(z.string()),
  baselineEnvironment: environmentSchema.nullable().optional(), verificationEnvironment: environmentSchema.nullable().optional(), baselineEffectIds: z.array(z.string()).optional(),
});
type GovernanceSave = z.infer<typeof saveSchema>;

export function loadGovernanceSave(): GovernanceSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const result = saveSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;
    const saved = result.data;
    const ids = saved.completedPointIds;
    if (new Set(ids).size !== ids.length || (!saved.accepted && ids.length > 0)) return null;
    if (ids.some(id => !GOVERNANCE_POINTS.some(p => p.id === id))) return null;
    for (const id of ids) {
      const point = GOVERNANCE_POINTS.find(p => p.id === id)!;
      const previous = GOVERNANCE_POINTS.filter(p => ['monitoring', 'cleanup', 'repair', 'verification'].indexOf(p.stage) < ['monitoring', 'cleanup', 'repair', 'verification'].indexOf(point.stage));
      if (previous.some(p => !ids.includes(p.id))) return null;
    }
    return saved;
  } catch { return null; }
}

interface GovernanceState {
  characterGender: PlayerCharacterGender | null;
  accepted: boolean;
  completedPointIds: string[];
  stage: GovernanceStage;
  activeRegion: { region: GovernanceRegion; sourceId?: string } | null;
  saveError: string | null;
  baselineEnvironment: EnvironmentState | null;
  verificationEnvironment: EnvironmentState | null;
  baselineEffectIds: string[];
  beginSession: (gender: PlayerCharacterGender) => void;
  restoreSession: () => PlayerCharacterGender | null;
  acceptMission: () => void;
  enterRegion: (region: GovernanceRegion, sourceId?: string) => void;
  leaveRegion: () => void;
  completeOperation: (pointId: string, optionId: string, elapsedMs: number) => { ok: boolean; message: string };
  reset: () => void;
}

function applyCompletedEffects(ids: readonly string[]) {
  for (const point of GOVERNANCE_POINTS) {
    if (point.effect && ids.includes(point.id)) useEnvironmentStore.getState().applyEffect(`governance.${point.id}`, point.effect);
  }
}

function reconcileEnvironment(saved: Pick<GovernanceState, 'completedPointIds' | 'baselineEnvironment' | 'baselineEffectIds'>) {
  if (!saved.completedPointIds.includes('monitor.baseline')) return;
  const state = { ...(saved.baselineEnvironment ?? INITIAL_ENVIRONMENT_STATE) };
  const ids = new Set(saved.baselineEffectIds);
  const apply = (effect: Partial<EnvironmentState>) => {
    for (const key of ['pollution', 'vegetation', 'waterQuality', 'restorationProgress'] as const) state[key] = clamp100(state[key] + (effect[key] ?? 0));
  };
  for (const point of GOVERNANCE_POINTS) {
    if (point.effect && saved.completedPointIds.includes(point.id)) { apply(point.effect); ids.add(`governance.${point.id}`); }
  }
  // 保留已结算的旧任务效果，但不信任环境存档中的治理效果去重标志。
  for (const id of useEnvironmentStore.getState().appliedTargetIds) {
    if (ids.has(id)) continue;
    if (id.startsWith('reward.')) {
      const amount = findDailyTaskById(id.slice('reward.'.length))?.reward?.restorationValue;
      if (amount) { apply({ restorationProgress: amount }); ids.add(id); }
    } else if (id === POLLUTION_ZONE_01_TARGET.id) {
      for (const effect of POLLUTION_ZONE_01_TARGET.environmentEffects) apply(effect);
      ids.add(id);
    }
  }
  useEnvironmentStore.getState().restoreEnvironmentSnapshot(state, [...ids]);
}

const initialSave = loadGovernanceSave();
export const useGovernanceStore = create<GovernanceState>((set, get) => {
  const persist = () => {
    const s = get();
    if (!s.characterGender) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, characterGender: s.characterGender, accepted: s.accepted, completedPointIds: s.completedPointIds,
        baselineEnvironment: s.baselineEnvironment, verificationEnvironment: s.verificationEnvironment, baselineEffectIds: s.baselineEffectIds }));
      set({ saveError: null });
    } catch { set({ saveError: '存档未能写入，请保持页面打开；刷新可能丢失进度。' }); }
  };
  return {
    characterGender: initialSave?.characterGender ?? null,
    accepted: initialSave?.accepted ?? false,
    completedPointIds: initialSave?.completedPointIds ?? [],
    stage: deriveGovernanceStage(initialSave?.accepted ?? false, initialSave?.completedPointIds ?? []),
    activeRegion: null, saveError: null,
    baselineEnvironment: initialSave?.baselineEnvironment ?? null,
    verificationEnvironment: initialSave?.verificationEnvironment ?? null,
    baselineEffectIds: initialSave?.baselineEffectIds ?? [],
    beginSession: gender => { set({ characterGender: gender }); persist(); },
    restoreSession: () => {
      // 保留尚未写入磁盘的最新运行状态；不要用旧存档回滚同页继续。
      if (get().saveError && get().characterGender) {
        set({ activeRegion: null });
        reconcileEnvironment(get());
        return get().characterGender;
      }
      const saved = loadGovernanceSave();
      if (!saved) return null;
      set({ ...saved, baselineEnvironment: saved.baselineEnvironment ?? null, verificationEnvironment: saved.verificationEnvironment ?? null,
        baselineEffectIds: saved.baselineEffectIds ?? [], stage: deriveGovernanceStage(saved.accepted, saved.completedPointIds), activeRegion: null, saveError: null });
      reconcileEnvironment(get());
      return saved.characterGender;
    },
    acceptMission: () => {
      if (get().accepted || !get().characterGender) return;
      set({ accepted: true, stage: 'monitoring' }); persist();
    },
    enterRegion: (region, sourceId) => set({ activeRegion: { region, sourceId } }),
    leaveRegion: () => set({ activeRegion: null }),
    completeOperation: (pointId, optionId, elapsedMs) => {
      const s = get();
      const point = GOVERNANCE_POINTS.find(p => p.id === pointId);
      if (!point || !s.accepted || point.stage !== s.stage) return { ok: false, message: '请先完成当前治理阶段。' };
      if (s.completedPointIds.includes(pointId)) return { ok: false, message: '该点位已完成，无需重复操作。' };
      if (s.activeRegion?.region !== point.region || (point.sourceId && s.activeRegion.sourceId !== point.sourceId)) return { ok: false, message: '请前往对应区域和点位。' };
      if (point.correctOptionId !== optionId) return { ok: false, message: point.explanation };
      if (!Number.isFinite(elapsedMs) || elapsedMs < GOVERNANCE_HOLD_MS) return { ok: false, message: '需要持续执行，松开后可重新尝试。' };
      const env = useEnvironmentStore.getState().state;
      if (pointId === 'monitor.verify' && (env.restorationProgress < 100 || env.pollution >= 20)) return { ok: false, message: '环境指标尚未达到验收条件，请检查治理成果。' };
      const completedPointIds = [...s.completedPointIds, pointId];
      set({ completedPointIds, stage: deriveGovernanceStage(true, completedPointIds),
        ...(pointId === 'monitor.baseline' ? { baselineEnvironment: { ...env }, baselineEffectIds: [...useEnvironmentStore.getState().appliedTargetIds] } : {}),
        ...(pointId === 'monitor.verify' ? { verificationEnvironment: { ...env } } : {}),
      });
      // 先保存成果，再应用幂等环境效果；重载可重放尚未写入的效果。
      persist(); applyCompletedEffects(completedPointIds);
      if (pointId.startsWith('repair.')) gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', { objectiveType: 'restore_area', amount: 1, sourceId: point.sourceId! });
      if (point.stage === 'cleanup' && completedPointIds.includes('cleanup.wastewater') && completedPointIds.includes('cleanup.leak')) {
        gameBridge.emit('DAILY_TASK_PROGRESS_SIGNAL', { objectiveType: 'collect_waste', amount: 1, sourceId: 'interaction.pollution_zone_01' });
      }
      return { ok: true, message: point.success };
    },
    reset: () => {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* 运行时仍应能开始新局。 */ }
      set({ characterGender: null, accepted: false, completedPointIds: [], stage: 'briefing', activeRegion: null, saveError: null, baselineEnvironment: null, verificationEnvironment: null, baselineEffectIds: [] });
    },
  };
});
