import { useCallback, useEffect, useRef, useState } from 'react';
import { GOVERNANCE_HOLD_MS, GOVERNANCE_POINTS, GOVERNANCE_STAGE_TEXT } from '@/domain/governance/governanceDefinitions';
import { useGovernanceStore } from '@/store/governanceStore';
import { INITIAL_ENVIRONMENT_STATE, useEnvironmentStore } from '@/store/environmentStore';
import { useUIStore } from '@/store/uiStore';
import { gameBridge } from '@/game/bridge/GameBridge';
import styles from './GovernancePanel.module.css';

export function GovernancePanel() {
  const stage = useGovernanceStore(s => s.stage);
  const completed = useGovernanceStore(s => s.completedPointIds);
  const active = useGovernanceStore(s => s.activeRegion);
  const saveError = useGovernanceStore(s => s.saveError);
  const environment = useEnvironmentStore(s => s.state);
  const baseline = useGovernanceStore(s => s.baselineEnvironment);
  const verification = useGovernanceStore(s => s.verificationEnvironment);
  const [selectedId, setSelectedId] = useState('monitor.baseline');
  const [optionId, setOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const region = active?.region;
  const sourceId = active?.sourceId;
  const points = GOVERNANCE_POINTS.filter(p => p.region === region && (!p.sourceId || p.sourceId === sourceId));
  const point = points.find(p => p.id === selectedId) ?? points.find(p => p.stage === stage) ?? points[0];
  const done = Boolean(point && completed.includes(point.id));
  const canAct = Boolean(point && point.stage === stage && !done && optionId);

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHolding(false); setHoldProgress(0);
  }, []);

  useEffect(() => {
    stopHold(); setOptionId(null); setFeedback('');
    const next = GOVERNANCE_POINTS.find(p => p.region === region && (!p.sourceId || p.sourceId === sourceId) && p.stage === useGovernanceStore.getState().stage);
    if (next) setSelectedId(next.id);
    return stopHold;
  }, [region, sourceId, stopHold]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stopHold(); };
    window.addEventListener('blur', stopHold);
    window.addEventListener('pointerup', stopHold);
    window.addEventListener('pointercancel', stopHold);
    document.addEventListener('visibilitychange', onVisibility);
    const unsubscribe = useUIStore.subscribe(s => { if (s.inputMode !== 'gameplay') stopHold(); });
    return () => {
      window.removeEventListener('blur', stopHold); window.removeEventListener('pointerup', stopHold);
      window.removeEventListener('pointercancel', stopHold); document.removeEventListener('visibilitychange', onVisibility); unsubscribe();
    };
  }, [stopHold]);

  useEffect(() => {
    if (!reportOpen || active) return;
    useUIStore.getState().setInputMode('task');
    return () => { if (useUIStore.getState().inputMode === 'task') useUIStore.getState().setInputMode('gameplay'); };
  }, [reportOpen, active]);

  const beginHold = () => {
    if (!canAct || !point || !optionId || holdTimer.current || useUIStore.getState().inputMode !== 'gameplay') return;
    const start = Date.now();
    setFeedback(''); setHolding(true);
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setHoldProgress(Math.min(1, elapsed / GOVERNANCE_HOLD_MS));
      if (elapsed >= GOVERNANCE_HOLD_MS) {
        stopHold();
        const result = useGovernanceStore.getState().completeOperation(point.id, optionId, elapsed);
        setFeedback(result.message);
        if (result.ok && useGovernanceStore.getState().stage === 'complete') setReportOpen(true);
      }
    }, 50);
  };

  const returnToMap = () => {
    stopHold(); setReportOpen(false);
    if (active) gameBridge.emit('GOVERNANCE_RETURN_REQUEST', { region: active.region });
  };
  const step = GOVERNANCE_STAGE_TEXT[stage];

  return <>
    <aside className={`${styles.mission} ${active ? styles.regionMission : ''}`} aria-label="首轮治理目标">
      <span className={styles.eyebrow}>旧工业区 · 首轮治理</span>
      <strong>{step.title} <small>{completed.length} / 6</small></strong>
      <p>{step.objective}</p>
      {!active && <small>WASD / 方向键移动 · 靠近目标按 E · 当前目标已在地图标注</small>}
      {stage === 'complete' && <button onClick={() => setReportOpen(true)}>查看治理报告</button>}
      {saveError && <p className={styles.warning}>{saveError}</p>}
    </aside>

    {active && !reportOpen && <section className={styles.operation} aria-label="治理操作面板">
      <div className={styles.heading}><h2>治理点位</h2><button onClick={returnToMap}>返回主地图</button></div>
      <div className={styles.points}>
        {points.map(p => <button key={p.id} aria-pressed={point?.id === p.id} disabled={holding} onClick={() => {
          stopHold(); setSelectedId(p.id); setOptionId(null); setFeedback('');
        }}>{completed.includes(p.id) ? '✓ ' : ''}{p.title}</button>)}
      </div>
      {point && <>
        <h3>{point.title}</h3><p>{point.problem}</p>
        {done ? <p className={styles.success}>该点位已完成，成果已保存。{step.objective}</p> : point.stage !== stage ? <p className={styles.warning}>当前目标：{step.objective}</p> : <>
          <span className={styles.eyebrow}>选择处理方案</span>
          <div className={styles.options}>{point.options.map(option => <button key={option.id} aria-pressed={optionId === option.id} disabled={holding} onClick={() => { setOptionId(option.id); setFeedback(''); }}>{option.label}</button>)}</div>
          <button className={styles.execute} disabled={!canAct} onPointerDown={e => {
            if (e.button !== 0 && e.button !== undefined) return;
            e.currentTarget.setPointerCapture?.(e.pointerId); beginHold();
          }} onPointerUp={stopHold} onPointerCancel={stopHold} onKeyDown={e => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); beginHold(); }
          }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stopHold(); } }} onBlur={stopHold}>
            {holding ? `执行中 ${Math.round(holdProgress * 100)}%` : '按住执行（2 秒）'}
          </button>
          <progress value={holdProgress} max={1} aria-label="执行进度" />
          <small>按住鼠标或空格 / Enter，松开中止；方案错误可重新选择。</small>
        </>}
      </>}
      <p role="status" className={styles.feedback}>{feedback}</p>
      <small>影像为场景背景；点位在列表中操作。指标为游戏模拟值。</small>
    </section>}

    {reportOpen && stage === 'complete' && <div className={styles.reportOverlay}>
      <section className={styles.report} role="dialog" aria-label="首轮治理报告">
        <span className={styles.eyebrow}>复测验收通过</span><h2>旧工业区首轮治理完成</h2>
        <p>完成基线监测、两处污染源处理、两处环境修复和治理后复测。</p>
        <table><caption>{baseline ? '基线监测与复测结果' : '初始场景与治理后对比'} · 游戏模拟值</caption><thead><tr><th>指标</th><th>{baseline ? '基线' : '初始'}</th><th>治理后</th></tr></thead>
          <tbody>{([
            ['污染程度（越低越好）', 'pollution'], ['植被状况', 'vegetation'], ['水质状况', 'waterQuality'], ['区域修复进度', 'restorationProgress'],
          ] as const).map(([label, key]) => <tr key={key}><th>{label}</th><td>{(baseline ?? INITIAL_ENVIRONMENT_STATE)[key]}</td><td>{(verification ?? environment)[key]}</td></tr>)}</tbody>
        </table>
        <p>已完成的治理成果将保留。可以返回主地图巡查，也可以回首页后继续游戏。</p>
        <button className={styles.execute} onClick={returnToMap}>返回主地图继续探索</button>
        {saveError && <p className={styles.warning}>{saveError}</p>}
      </section>
    </div>}
  </>;
}
