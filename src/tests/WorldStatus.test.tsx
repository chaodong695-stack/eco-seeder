import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldStatus } from '@/ui/components/WorldStatus';
import { useWorldStore } from '@/store/worldStore';
import { destroyTimeService } from '@/domain/time/worldTimeService';

describe('WorldStatus', () => {
  beforeEach(() => {
    destroyTimeService();
    useWorldStore.getState().resetWorld();
  });

  it('displays time phase label', () => {
    useWorldStore.setState({
      timeSnapshot: {
        mode: 'realtime',
        localDate: '2024-06-15',
        localMinutes: 720,
        timezoneOffsetMinutes: 480,
        phase: 'day',
        demoPreset: null,
      },
      weatherSnapshot: {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear',
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'test',
      },
      isInitialized: true,
    });

    render(<WorldStatus />);
    expect(screen.getByText('时间阶段')).toBeInTheDocument();
    expect(screen.getByText('白天')).toBeInTheDocument();
  });

  it('displays weather name', () => {
    useWorldStore.setState({
      timeSnapshot: {
        mode: 'realtime',
        localDate: '2024-06-15',
        localMinutes: 720,
        timezoneOffsetMinutes: 480,
        phase: 'day',
        demoPreset: null,
      },
      weatherSnapshot: {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'light_rain',
        displayName: '小雨',
        intensity: 0.6,
        visibility: 0.7,
        timelineEntryId: 'test',
      },
      isInitialized: true,
    });

    render(<WorldStatus />);
    expect(screen.getByText('天气')).toBeInTheDocument();
    expect(screen.getByText('小雨')).toBeInTheDocument();
  });

  it('displays realtime mode', () => {
    useWorldStore.setState({
      timeSnapshot: {
        mode: 'realtime',
        localDate: '2024-06-15',
        localMinutes: 720,
        timezoneOffsetMinutes: 480,
        phase: 'day',
        demoPreset: null,
      },
      weatherSnapshot: {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear',
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'test',
      },
      isInitialized: true,
    });

    render(<WorldStatus />);
    expect(screen.getByText('模式')).toBeInTheDocument();
    expect(screen.getByText('现实时间')).toBeInTheDocument();
  });

  it('displays demo mode', () => {
    useWorldStore.setState({
      timeSnapshot: {
        mode: 'demo',
        localDate: '2024-06-15',
        localMinutes: 1320,
        timezoneOffsetMinutes: 480,
        phase: 'night',
        demoPreset: 'night',
      },
      weatherSnapshot: {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'fog',
        displayName: '雾',
        intensity: 0.7,
        visibility: 0.35,
        timelineEntryId: 'test',
      },
      isInitialized: true,
    });

    render(<WorldStatus />);
    expect(screen.getByText('夜晚')).toBeInTheDocument();
    expect(screen.getByText('雾')).toBeInTheDocument();
    expect(screen.getByText('演示时间')).toBeInTheDocument();
  });

  it('updates when store changes', () => {
    useWorldStore.setState({
      timeSnapshot: {
        mode: 'realtime',
        localDate: '2024-06-15',
        localMinutes: 720,
        timezoneOffsetMinutes: 480,
        phase: 'day',
        demoPreset: null,
      },
      weatherSnapshot: {
        date: '2024-06-15',
        mapId: 'map.urban_wasteland',
        weather: 'clear',
        displayName: '晴朗',
        intensity: 0.2,
        visibility: 1.0,
        timelineEntryId: 'test',
      },
      isInitialized: true,
    });

    const { rerender } = render(<WorldStatus />);
    expect(screen.getByText('白天')).toBeInTheDocument();

    useWorldStore.setState({
      timeSnapshot: {
        mode: 'demo',
        localDate: '2024-06-15',
        localMinutes: 1320,
        timezoneOffsetMinutes: 480,
        phase: 'night',
        demoPreset: 'night',
      },
    });

    rerender(<WorldStatus />);
    expect(screen.getByText('夜晚')).toBeInTheDocument();
  });
});
