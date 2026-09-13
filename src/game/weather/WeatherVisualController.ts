/**
 * 天气视觉控制器 — 为 5 种天气提供占位视觉表现。
 *
 * 使用几何图形、颜色、透明覆盖层和 Phaser 粒子。
 * 切换天气时先正确停止旧天气。
 * 同一天气重复应用必须幂等。
 * Scene shutdown 时清理全部粒子、Timer、Tween 和 Overlay。
 */

import Phaser from 'phaser';
import type { WeatherType } from '@/domain/weather/weatherTypes';
import { DEPTH_FX } from '@/game/config/depthConfig';
import { RAIN_LAYERS, type RainLayer, type EffectsQuality, layerBudget } from './rainConfig';
import { FOG_POLICY } from '@/game/visual/atmospherePolicy';

/** 天气视觉配置。 */
interface WeatherVisualConfig {
  overlayColor: number;
  overlayAlpha: number;
  particleCount: number;
  particleColor: number;
  particleSpeed: number;
  particleSize: number;
  particleLifespan: number;
}

/** 各天气的视觉配置。 */
const WEATHER_VISUALS: Record<WeatherType, WeatherVisualConfig> = {
  clear: { overlayColor: 0x000000, overlayAlpha: 0, particleCount: 0, particleColor: 0, particleSpeed: 0, particleSize: 0, particleLifespan: 0 },
  overcast: { overlayColor: 0x666666, overlayAlpha: 0.12, particleCount: 0, particleColor: 0, particleSpeed: 0, particleSize: 0, particleLifespan: 0 },
  light_rain: { overlayColor: 0x446677, overlayAlpha: 0.15, particleCount: 60, particleColor: 0xaaccee, particleSpeed: 600, particleSize: 2, particleLifespan: 800 },
  heavy_rain: { overlayColor: 0x334455, overlayAlpha: 0.3, particleCount: 150, particleColor: 0x88aacc, particleSpeed: 900, particleSize: 3, particleLifespan: 600 },
  fog: { overlayColor: 0xaaaaaa, overlayAlpha: 0.2, particleCount: 0, particleColor: 0, particleSpeed: 0, particleSize: 0, particleLifespan: 0 },
};

export class WeatherVisualController {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private currentWeather: WeatherType | null = null;
  private rainEmitters = new Map<RainLayer, Phaser.GameObjects.Particles.ParticleEmitter>();
  private effectsQuality: EffectsQuality = 'medium';
  private fogRects: Phaser.GameObjects.Rectangle[] = [];
  private fogTweens: Phaser.Tweens.Tween[] = [];
  private flashTimer: Phaser.Time.TimerEvent | null = null;
  private isDestroyed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 应用天气视觉。
   *
   * 同一天气重复应用幂等。
   * 切换天气时先正确停止旧天气。
   */
  applyWeather(weather: WeatherType): void {
    if (this.isDestroyed) return;
    if (this.currentWeather === weather) return;

    // 停止旧天气效果
    this.stopCurrentWeather();

    const config = WEATHER_VISUALS[weather];
    const { width, height } = this.scene.scale;

    // 创建或更新覆盖层
    if (!this.overlay || !this.overlay.scene) {
      this.overlay = this.scene.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        config.overlayColor,
        config.overlayAlpha,
      );
      this.overlay.setDepth(DEPTH_FX);
      this.overlay.setScrollFactor(0);
    } else {
      this.overlay.setFillStyle(config.overlayColor, config.overlayAlpha);
    }

    // 创建粒子（雨）
    if (config.particleCount > 0) {
      this.createRainParticles();
    }

    // 创建雾层
    if (weather === 'fog') {
      this.createFogLayer();
    }

    // 暴雨闪动
    if (weather === 'heavy_rain') {
      this.startFlashEffect();
    }

    this.currentWeather = weather;
  }

  /**
   * 创建雨粒子。
   */
  private createRainParticles(): void {
    this.destroyRainParticles();
    if (!this.scene.textures.exists('rain_particle')) {
      const gfx = this.scene.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(0xffffff, 1); gfx.fillRect(0, 0, 2, 12); gfx.generateTexture('rain_particle', 2, 12); gfx.destroy();
    }
    const { width } = this.scene.scale;
    for (const [layer, cfg] of Object.entries(RAIN_LAYERS) as [RainLayer, typeof RAIN_LAYERS[RainLayer]][]) {
      const emitter = this.scene.add.particles(0, 0, 'rain_particle', {
        x: { min: 0, max: width }, y: -24, frequency: cfg.frequency, lifespan: cfg.lifespan,
        maxAliveParticles: layerBudget(layer, this.effectsQuality), quantity: 1,
        speedY: { min: cfg.speedY[0], max: cfg.speedY[1] }, speedX: { min: cfg.speedX[0], max: cfg.speedX[1] },
        scale: { start: cfg.size, end: cfg.size * 0.45 }, alpha: { start: cfg.alpha[0], end: cfg.alpha[1] }, emitting: true,
      }).setDepth(cfg.depth).setScrollFactor(cfg.scrollFactor);
      this.rainEmitters.set(layer, emitter);
    }
  }

  private destroyRainParticles(): void {
    for (const emitter of this.rainEmitters.values()) if (emitter.scene) emitter.destroy();
    this.rainEmitters.clear();
  }

  setEffectsQuality(quality: EffectsQuality): void {
    if (this.effectsQuality === quality) return;
    this.effectsQuality = quality;
    if (this.currentWeather === 'light_rain' || this.currentWeather === 'heavy_rain') this.createRainParticles();
  }

  getEffectsQuality(): EffectsQuality { return this.effectsQuality; }
  getRainEmitterCount(): number { return this.rainEmitters.size; }

  /**
   * 创建雾层 — 低速移动的半透明矩形。
   */
  private createFogLayer(): void {
    const { width, height } = this.scene.scale;
    const fogCount = 3;

    for (let i = 0; i < fogCount; i++) {
      const fogRect = this.scene.add.rectangle(
        width / 2,
        height * (0.3 + i * 0.2),
        width * 1.5,
        height * 0.25,
        i === 0 ? FOG_POLICY.far.color : i === 1 ? FOG_POLICY.mid.color : FOG_POLICY.foreground.color,
        i === 0 ? FOG_POLICY.far.alpha : i === 1 ? FOG_POLICY.mid.alpha : FOG_POLICY.foreground.alpha,
      );
      fogRect.setDepth(DEPTH_FX);
      fogRect.setScrollFactor(0);

      // 低速移动 tween
      const tween = this.scene.tweens.add({
        targets: fogRect,
        x: { from: width * 0.3, to: width * 0.7 },
        duration: 8000 + i * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.fogRects.push(fogRect);
      this.fogTweens.push(tween);
    }
  }

  /**
   * 暴雨闪动效果。
   */
  private startFlashEffect(): void {
    this.flashTimer = this.scene.time.addEvent({
      delay: 4000 + Math.random() * 6000,
      callback: () => {
        if (this.isDestroyed || !this.overlay || !this.overlay.scene) return;
        // 轻微闪动
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: this.overlay.alpha, to: this.overlay.alpha + 0.15 },
          duration: 80,
          yoyo: true,
        });
        this.startFlashEffect();
      },
    });
  }

  /**
   * 停止当前天气效果。
   */
  private stopCurrentWeather(): void {
    this.destroyRainParticles();

    for (const tween of this.fogTweens) {
      tween.stop();
    }
    this.fogTweens = [];
    for (const rect of this.fogRects) {
      if (rect.scene) rect.destroy();
    }
    this.fogRects = [];

    // 停止闪动
    if (this.flashTimer) {
      this.flashTimer.remove();
      this.flashTimer = null;
    }

    this.currentWeather = null;
  }

  /**
   * 获取当前天气。
   */
  getCurrentWeather(): WeatherType | null {
    return this.currentWeather;
  }

  /**
   * 销毁控制器 — 清理全部粒子、Timer、Tween 和 Overlay。
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.stopCurrentWeather();

    if (this.overlay && this.overlay.scene) {
      this.overlay.destroy();
    }
    this.overlay = null;

    // 清理粒子纹理
    if (this.scene.textures.exists('rain_particle')) {
      this.scene.textures.remove('rain_particle');
    }
  }
}
