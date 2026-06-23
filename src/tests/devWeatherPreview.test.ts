/**
 * 开发环境天气预览功能测试。
 *
 * 验证：
 * - devWeatherPreview 不修改正式天气时间线
 * - 退出预览后恢复正式天气
 * - 连续切换天气时调用原有资源清理流程
 * - resetWorld 清理预览状态
 * - getDisplayWeather 优先返回预览天气
 * - 不影响确定性种子和时间模式
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from '@/store/worldStore';
import { gameBridge } from '@/game/bridge/GameBridge';
import { destroyTimeService } from '@/domain/time/worldTimeService';
import type { WeatherType } from '@/domain/weather/weatherTypes';

const ALL_WEATHERS: WeatherType[] = [
  'clear',
  'overcast',
  'light_rain',
  'heavy_rain',
  'fog',
];

describe('Dev weather preview — worldStore', () => {
  beforeEach(() => {
    gameBridge.clear();
    destroyTimeService();
    useWorldStore.getState().resetWorld();
  });

  it('devWeatherPreview defaults to null', () => {
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('setDevWeatherPreview sets the preview weather', () => {
    useWorldStore.getState().setDevWeatherPreview('fog');
    expect(useWorldStore.getState().devWeatherPreview).toBe('fog');
  });

  it('exitDevWeatherPreview clears the preview weather', () => {
    useWorldStore.getState().setDevWeatherPreview('clear');
    expect(useWorldStore.getState().devWeatherPreview).toBe('clear');
    useWorldStore.getState().exitDevWeatherPreview();
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('getDisplayWeather returns preview when set', () => {
    useWorldStore.getState().init('realtime');
    const formalWeather = useWorldStore.getState().weatherSnapshot.weather;
    useWorldStore.getState().setDevWeatherPreview('fog');
    expect(useWorldStore.getState().getDisplayWeather()).toBe('fog');
    // formal weather should not change
    expect(useWorldStore.getState().weatherSnapshot.weather).toBe(formalWeather);
  });

  it('getDisplayWeather returns formal weather when preview is null', () => {
    useWorldStore.getState().init('realtime');
    const formalWeather = useWorldStore.getState().weatherSnapshot.weather;
    expect(useWorldStore.getState().getDisplayWeather()).toBe(formalWeather);
  });

  it('preview does not modify the formal weather timeline', () => {
    useWorldStore.getState().init('realtime');
    const timelineBefore = useWorldStore.getState().getWeatherTimeline();
    useWorldStore.getState().setDevWeatherPreview('clear');
    useWorldStore.getState().setDevWeatherPreview('fog');
    useWorldStore.getState().exitDevWeatherPreview();
    const timelineAfter = useWorldStore.getState().getWeatherTimeline();
    expect(timelineAfter).toBe(timelineBefore);
    expect(timelineAfter?.entries).toEqual(timelineBefore?.entries);
  });

  it('preview does not modify formal weather snapshot', () => {
    useWorldStore.getState().init('realtime');
    const formalBefore = useWorldStore.getState().weatherSnapshot;
    useWorldStore.getState().setDevWeatherPreview('heavy_rain');
    const formalDuring = useWorldStore.getState().weatherSnapshot;
    expect(formalDuring).toEqual(formalBefore);
    useWorldStore.getState().exitDevWeatherPreview();
    const formalAfter = useWorldStore.getState().weatherSnapshot;
    expect(formalAfter).toEqual(formalBefore);
  });

  it('exiting preview restores formal weather for display', () => {
    useWorldStore.getState().init('realtime');
    const formalWeather = useWorldStore.getState().weatherSnapshot.weather;
    useWorldStore.getState().setDevWeatherPreview('fog');
    expect(useWorldStore.getState().getDisplayWeather()).toBe('fog');
    useWorldStore.getState().exitDevWeatherPreview();
    expect(useWorldStore.getState().getDisplayWeather()).toBe(formalWeather);
  });

  it('resetWorld clears devWeatherPreview', () => {
    useWorldStore.getState().init('realtime');
    useWorldStore.getState().setDevWeatherPreview('clear');
    useWorldStore.getState().resetWorld();
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('consecutive weather switches do not accumulate state', () => {
    useWorldStore.getState().init('realtime');
    for (const w of ALL_WEATHERS) {
      useWorldStore.getState().setDevWeatherPreview(w);
      expect(useWorldStore.getState().devWeatherPreview).toBe(w);
    }
    // Only one value at a time
    expect(useWorldStore.getState().devWeatherPreview).toBe('fog');
    useWorldStore.getState().exitDevWeatherPreview();
    expect(useWorldStore.getState().devWeatherPreview).toBeNull();
  });

  it('preview does not affect time mode', () => {
    useWorldStore.getState().init('realtime');
    expect(useWorldStore.getState().timeSnapshot.mode).toBe('realtime');
    useWorldStore.getState().setDevWeatherPreview('clear');
    expect(useWorldStore.getState().timeSnapshot.mode).toBe('realtime');
    useWorldStore.getState().setTimeMode('demo', 'night');
    useWorldStore.getState().setDevWeatherPreview('fog');
    expect(useWorldStore.getState().timeSnapshot.mode).toBe('demo');
    expect(useWorldStore.getState().timeSnapshot.demoPreset).toBe('night');
  });

  it('preview does not affect deterministic seed', () => {
    useWorldStore.getState().init('realtime');
    const seedBefore = useWorldStore.getState().getWeatherTimeline()?.seed;
    useWorldStore.getState().setDevWeatherPreview('clear');
    useWorldStore.getState().setDevWeatherPreview('fog');
    useWorldStore.getState().exitDevWeatherPreview();
    const seedAfter = useWorldStore.getState().getWeatherTimeline()?.seed;
    expect(seedAfter).toBe(seedBefore);
  });

  it('all five weather types can be previewed', () => {
    useWorldStore.getState().init('realtime');
    for (const w of ALL_WEATHERS) {
      useWorldStore.getState().setDevWeatherPreview(w);
      expect(useWorldStore.getState().getDisplayWeather()).toBe(w);
    }
  });
});
