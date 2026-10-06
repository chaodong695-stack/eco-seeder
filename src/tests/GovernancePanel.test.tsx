import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GovernancePanel } from '@/ui/components/GovernancePanel';
import { useGovernanceStore } from '@/store/governanceStore';
import { useEnvironmentStore } from '@/store/environmentStore';

describe('governance controls', () => {
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); useEnvironmentStore.getState().resetEnvironment();
    useGovernanceStore.getState().reset(); useGovernanceStore.getState().beginSession('male');
    useGovernanceStore.getState().acceptMission(); useGovernanceStore.getState().enterRegion('monitoring');
  });
  afterEach(() => vi.useRealTimers());

  it('requires a held action and permits retry after an incorrect plan', () => {
    render(<GovernancePanel />);
    fireEvent.click(screen.getByRole('button', { name: '只看水的颜色，直接判断已经达标' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '按住执行（2 秒）' }));
    act(() => vi.advanceTimersByTime(2100));
    expect(useGovernanceStore.getState().stage).toBe('monitoring');
    expect(screen.getByRole('status')).toHaveTextContent('外观不能替代监测');
    fireEvent.click(screen.getByRole('button', { name: '采集废水与土壤样本，记录设备读数' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '按住执行（2 秒）' }));
    act(() => vi.advanceTimersByTime(2100));
    expect(useGovernanceStore.getState().stage).toBe('cleanup');
  });

  it('cancels on early release or window blur without granting progress', () => {
    render(<GovernancePanel />);
    fireEvent.click(screen.getByRole('button', { name: '采集废水与土壤样本，记录设备读数' }));
    const button = screen.getByRole('button', { name: '按住执行（2 秒）' });
    fireEvent.pointerDown(button); act(() => vi.advanceTimersByTime(1000)); fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(3000)); expect(useGovernanceStore.getState().stage).toBe('monitoring');
    fireEvent.pointerDown(button); act(() => vi.advanceTimersByTime(1000)); fireEvent(window, new Event('blur'));
    act(() => vi.advanceTimersByTime(3000)); expect(useGovernanceStore.getState().stage).toBe('monitoring');
  });
});
