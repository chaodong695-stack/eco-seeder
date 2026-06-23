import { describe, it, expect } from 'vitest';
import { assetsManifest } from '@/services/asset/assetManifest';
import { audioManifest } from '@/services/audio/audioManifest';

describe('assetsManifest', () => {
  it('has version', () => {
    expect(assetsManifest.version).toBeDefined();
  });

  it('has baseUrl', () => {
    expect(assetsManifest.baseUrl).toBe('/assets');
  });

  it('has core-ui bundle', () => {
    const coreUi = assetsManifest.bundles.find((b) => b.id === 'core-ui');
    expect(coreUi).toBeDefined();
    expect(coreUi!.entryIds.length).toBeGreaterThan(0);
  });

  it('has urban-wasteland bundle', () => {
    const mapBundle = assetsManifest.bundles.find((b) => b.id === 'urban-wasteland');
    expect(mapBundle).toBeDefined();
  });

  it('has character bundles', () => {
    expect(assetsManifest.bundles.find((b) => b.id === 'character-male')).toBeDefined();
    expect(assetsManifest.bundles.find((b) => b.id === 'character-female')).toBeDefined();
  });
});

describe('audioManifest', () => {
  it('has version', () => {
    expect(audioManifest.version).toBeDefined();
  });

  it('has entries', () => {
    expect(audioManifest.entries.length).toBeGreaterThan(0);
  });

  it('entries have valid structure', () => {
    audioManifest.entries.forEach((entry) => {
      expect(entry.id).toBeDefined();
      expect(entry.type).toBeDefined();
      expect(entry.path).toBeDefined();
      expect(entry.volume).toBeGreaterThanOrEqual(0);
      expect(entry.volume).toBeLessThanOrEqual(1);
    });
  });

  it('has UI sound effects', () => {
    const uiEntries = audioManifest.entries.filter((e) => e.category === 'ui');
    expect(uiEntries.length).toBeGreaterThan(0);
  });

  it('has music entries', () => {
    const musicEntries = audioManifest.entries.filter((e) => e.type === 'music');
    expect(musicEntries.length).toBeGreaterThan(0);
  });
});
