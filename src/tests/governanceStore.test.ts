import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEnvironmentStore } from '@/store/environmentStore';
import { GOVERNANCE_POINTS } from '@/domain/governance/governanceDefinitions';
import { useGovernanceStore, loadGovernanceSave } from '@/store/governanceStore';

function operate(id: string, optionId?: string, elapsed = 2000) {
  const point = GOVERNANCE_POINTS.find(p => p.id === id)!;
  useGovernanceStore.getState().enterRegion(point.region, point.sourceId);
  return useGovernanceStore.getState().completeOperation(id, optionId ?? point.correctOptionId, elapsed);
}

describe('fixed governance mission', () => {
  beforeEach(() => {
    localStorage.clear();
    useEnvironmentStore.getState().resetEnvironment();
    useGovernanceStore.getState().reset();
    useGovernanceStore.getState().beginSession('female');
  });

  it('requires acceptance, ordered stages, correct plan and a full hold', () => {
    expect(operate('monitor.baseline').ok).toBe(false);
    useGovernanceStore.getState().acceptMission();
    expect(operate('cleanup.wastewater').ok).toBe(false);
    expect(operate('monitor.baseline', 'ignore').ok).toBe(false);
    expect(operate('monitor.baseline', undefined, 1999).ok).toBe(false);
    expect(useGovernanceStore.getState().completedPointIds).toEqual([]);
    expect(operate('monitor.baseline').ok).toBe(true);
    expect(useGovernanceStore.getState().stage).toBe('cleanup');
  });

  it('completes all six operations, applies real simulation effects and prevents duplicate rewards', () => {
    useGovernanceStore.getState().acceptMission();
    for (const point of GOVERNANCE_POINTS) expect(operate(point.id).ok).toBe(true);
    expect(useGovernanceStore.getState().stage).toBe('complete');
    expect(useEnvironmentStore.getState().state).toEqual({ pollution: 18, vegetation: 77, waterQuality: 90, restorationProgress: 100 });
    expect(operate('cleanup.leak').ok).toBe(false);
    expect(useEnvironmentStore.getState().state.pollution).toBe(18);
  });

  it('requires the current region and the correct damaged site', () => {
    useGovernanceStore.getState().acceptMission();
    expect(useGovernanceStore.getState().completeOperation('monitor.baseline', 'sample', 2000).ok).toBe(false);
    operate('monitor.baseline'); operate('cleanup.wastewater'); operate('cleanup.leak');
    useGovernanceStore.getState().enterRegion('repair', 'interaction.damaged_env_01');
    const point = GOVERNANCE_POINTS.find(p => p.id === 'repair.water')!;
    expect(useGovernanceStore.getState().completeOperation(point.id, point.correctOptionId, 2000).ok).toBe(false);
  });

  it('restores gender and progress, replays missing effects and keeps active regions transient', () => {
    useGovernanceStore.getState().acceptMission(); operate('monitor.baseline'); operate('cleanup.wastewater');
    const saved = loadGovernanceSave();
    expect(saved?.characterGender).toBe('female');
    useEnvironmentStore.getState().resetEnvironment();
    useGovernanceStore.setState({ completedPointIds: [], stage: 'briefing', activeRegion: null });
    useGovernanceStore.getState().restoreSession();
    expect(useGovernanceStore.getState().stage).toBe('cleanup');
    expect(useEnvironmentStore.getState().state.pollution).toBe(58);
    expect(useGovernanceStore.getState().activeRegion).toBeNull();
  });

  it('rejects malformed and out-of-order saves', () => {
    localStorage.setItem('eco-seeder.governance.v1', '{broken');
    expect(loadGovernanceSave()).toBeNull();
    localStorage.setItem('eco-seeder.governance.v1', JSON.stringify({ version: 1, characterGender: 'male', accepted: true, completedPointIds: ['monitor.verify'] }));
    expect(loadGovernanceSave()).toBeNull();
    expect(operate('monitor.baseline', undefined, Number.NaN).ok).toBe(false);
  });

  it('does not complete verification before environmental criteria are met', () => {
    useGovernanceStore.getState().acceptMission();
    for (const p of GOVERNANCE_POINTS.filter(p => p.id !== 'monitor.verify')) operate(p.id);
    useEnvironmentStore.setState({ state: { pollution: 50, vegetation: 77, waterQuality: 90, restorationProgress: 100 } });
    expect(operate('monitor.verify').ok).toBe(false);
  });

  it('reports storage failure without pretending the game was saved', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    useGovernanceStore.getState().acceptMission();
    expect(useGovernanceStore.getState().saveError).toBeTruthy();
    spy.mockRestore();
  });

  it('keeps newer unsaved progress when continuing without reloading', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    useGovernanceStore.getState().acceptMission(); operate('monitor.baseline');
    expect(useGovernanceStore.getState().restoreSession()).toBe('female');
    expect(useGovernanceStore.getState().stage).toBe('cleanup');
    expect(useGovernanceStore.getState().saveError).toBeTruthy();
    spy.mockRestore();
  });

  it('repairs an inconsistent environmental save without trusting stale effect ids', () => {
    useGovernanceStore.getState().acceptMission();
    for (const p of GOVERNANCE_POINTS.filter(p => p.id !== 'monitor.verify')) operate(p.id);
    useEnvironmentStore.setState({ state: { pollution: 78, vegetation: 22, waterQuality: 30, restorationProgress: 0 } });
    useGovernanceStore.getState().restoreSession();
    expect(useEnvironmentStore.getState().state.pollution).toBe(18);
    expect(useEnvironmentStore.getState().state.restorationProgress).toBe(100);
    expect(operate('monitor.verify').ok).toBe(true);
  });

  it('records baseline and verification snapshots that do not change with later daily rewards', () => {
    useGovernanceStore.getState().acceptMission();
    for (const point of GOVERNANCE_POINTS) operate(point.id);
    expect(useGovernanceStore.getState().baselineEnvironment?.restorationProgress).toBe(0);
    expect(useGovernanceStore.getState().verificationEnvironment?.waterQuality).toBe(90);
    useEnvironmentStore.getState().applyEffect('later', { pollution: -10, vegetation: 0, waterQuality: 10, restorationProgress: 0 });
    expect(useGovernanceStore.getState().verificationEnvironment?.waterQuality).toBe(90);
    const saved = loadGovernanceSave();
    expect(saved?.verificationEnvironment?.waterQuality).toBe(90);
  });
});
