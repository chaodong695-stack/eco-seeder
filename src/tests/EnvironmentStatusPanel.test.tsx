import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentStatusPanel } from '@/ui/components/EnvironmentStatusPanel';
import { useEnvironmentStore } from '@/store/environmentStore';

describe('EnvironmentStatusPanel', () => {
  beforeEach(() => {
    useEnvironmentStore.getState().resetEnvironment();
  });

  it('displays region name', () => {
    render(<EnvironmentStatusPanel />);
    expect(screen.getByText(/雾港旧工业区/)).toBeInTheDocument();
  });

  it('displays initial environment values', () => {
    render(<EnvironmentStatusPanel />);
    expect(screen.getByText('污染程度')).toBeInTheDocument();
    expect(screen.getByText('植被状况')).toBeInTheDocument();
    expect(screen.getByText('水质状态')).toBeInTheDocument();
    expect(screen.getByText('修复进度')).toBeInTheDocument();
  });

  it('shows polluted stage initially', () => {
    render(<EnvironmentStatusPanel />);
    expect(screen.getByText(/污染状态/)).toBeInTheDocument();
  });

  it('updates to show recovering stage after effect applied', () => {
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    render(<EnvironmentStatusPanel />);
    expect(screen.getByText(/修复中/)).toBeInTheDocument();
  });

  it('shows updated values after environment effect', () => {
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    render(<EnvironmentStatusPanel />);
    // After effect: pollution 63, vegetation 25, waterQuality 35, restorationProgress 20
    expect(screen.getByText('63')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('preserves data when panel is re-rendered', () => {
    useEnvironmentStore.getState().applyEffect('restoration.pollution_zone_01', {
      pollution: -15,
      vegetation: 3,
      waterQuality: 5,
      restorationProgress: 20,
    });

    const { unmount } = render(<EnvironmentStatusPanel />);
    unmount();

    render(<EnvironmentStatusPanel />);
    // Data should still be there
    expect(screen.getByText('63')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
