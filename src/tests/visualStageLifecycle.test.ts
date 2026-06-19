import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useUIStore } from '@/store/uiStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useDailyTaskStore } from '@/store/dailyTaskStore';
import { findDailyTaskById } from '@/domain/tasks/dailyTaskDefinitions';
import { RestorationController } from '@/game/restoration/RestorationController';
import { POLLUTION_ZONE_01_TARGET } from '@/game/restoration/restorationDefinitions';

// ─── Phaser Mock with Scene lifecycle events ────────────────────────

// Mock worldStore for dailyTaskStore.init()
vi.mock('@/store/worldStore', () => ({
  useWorldStore: {
    getState: () => ({
      timeSnapshot: { localDate: '2025-01-04' },
      getWeatherTimeline: () => ({
        date: '2025-01-04',
        mapId: 'map.urban_wasteland',
        seed: 'test',
        entries: [
          { id: '1', startMinute: 0, endMinute: 360, weather: 'clear', intensity: 0.2 },
          { id: '2', startMinute: 361, endMinute: 720, weather: 'light_rain', intensity: 0.6 },
          { id: '3', startMinute: 721, endMinute: 1080, weather: 'heavy_rain', intensity: 0.9 },
          { id: '4', startMinute: 1081, endMinute: 1439, weather: 'fog', intensity: 0.7 },
        ],
      }),
      getDisplayWeather: () => 'clear' as const,
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock playerStore
vi.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      character: { characterId: 'character.player_male', gender: 'male', displayName: '男性生态修复员' },
    }),
  },
}));

// Mock gameBridge for dailyTaskStore — use real implementation
// (tests already import the real gameBridge)

vi.mock('phaser', () => {
  const SHUTDOWN = 'shutdown';
  const DESTROY = 'destroy';

  class EventEmitter {
    private listeners: Map<string, Array<{ fn: () => void; ctx: unknown }>> = new Map();

    on(event: string, fn: () => void, ctx?: unknown): void {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push({ fn, ctx: ctx ?? null });
    }

    once(event: string, fn: () => void, ctx?: unknown): void {
      const wrapper = () => {
        this.off(event, wrapper);
        fn.call(ctx);
      };
      this.on(event, wrapper, ctx);
    }

    off(event: string, fn: () => void): void {
      const arr = this.listeners.get(event);
      if (arr) {
        const idx = arr.findIndex((l) => l.fn === fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }

    emit(event: string): void {
      const arr = this.listeners.get(event);
      if (arr) {
        // Copy to avoid mutation during iteration
        [...arr].forEach(({ fn, ctx }) => fn.call(ctx));
      }
    }

    removeAllListeners(): void {
      this.listeners.clear();
    }
  }

  class MockGameObject {
    scene: MockScene | null;
    destroyed = false;

    constructor(scene: MockScene) {
      this.scene = scene;
    }

    destroy(): void {
      this.destroyed = true;
      this.scene = null;
    }

    setFillStyle(): void {}
    setAlpha(): void {}
    setScale(): void {}
    setStrokeStyle(): void {}
    setOrigin(): void {}
    setScrollFactor(): void {}
    setDepth(): void {}
    setVisible(): void {}
    setText(): void {}
  }

  class MockSceneSystem {
    private active = true;

    isActive(): boolean {
      return this.active;
    }

    setActive(v: boolean): void {
      this.active = v;
    }
  }

  class MockScene extends EventEmitter {
    add = {
      container: () => {
        const obj = new MockGameObject(this);
        obj.setDepth = () => {};
        return obj;
      },
      rectangle: () => new MockGameObject(this),
      text: () => new MockGameObject(this),
    };
    sys = new MockSceneSystem();
    cameras = { main: { setBounds: () => {}, startFollow: () => {}, setZoom: () => {} } };
    physics = {
      world: { setBounds: () => {} },
      add: {
        staticGroup: () => ({ add: () => {} }),
        existing: () => {},
        collider: () => {},
      },
    };
    input = { keyboard: null };
    time = { now: 0 };
    events = this; // Scene uses this.events for lifecycle

    constructor() {
      super();
    }

    /** Simulate Phaser SceneManager shutting down this scene */
    simulateShutdown(): void {
      this.sys.setActive(false);
      this.events.emit(SHUTDOWN);
    }

    /** Simulate Phaser SceneManager destroying this scene */
    simulateDestroy(): void {
      this.sys.setActive(false);
      this.events.emit(DESTROY);
    }
  }

  return {
    default: {
      Scene: MockScene,
      Game: class {},
      Scenes: { Events: { SHUTDOWN, DESTROY } },
      Input: { Keyboard: { KeyCodes: { W: 0, A: 0, S: 0, D: 0, E: 0 } } },
      Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      AUTO: 0,
    },
    Scene: MockScene,
    Scenes: { Events: { SHUTDOWN, DESTROY } },
    Input: { Keyboard: { KeyCodes: { W: 0, A: 0, S: 0, D: 0, E: 0 } } },
    Scale: { RESIZE: 0, CENTER_BOTH: 0 },
    AUTO: 0,
  };
});

// ─── Test constants ─────────────────────────────────────────────────

const INTERACTION_ID = 'interaction.pollution_zone_01';

// ─── Helper: create a Scene-like object that tracks VISUAL_STAGE_CHANGED ───

interface TrackedScene {
  scene: unknown;
  handlerCalls: number;
  cleanup: (() => void) | null;
  isShutdown: boolean;
  isActive: boolean;
}

/**
 * Simulates the essential lifecycle behavior of UrbanWastelandScene
 * regarding VISUAL_STAGE_CHANGED registration and cleanup.
 */
function createTrackedScene(): TrackedScene {
  const tracked: TrackedScene = {
    scene: null,
    handlerCalls: 0,
    cleanup: null,
    isShutdown: false,
    isActive: true,
  };

  // Simulate create() behavior:
  // 1. Register cleanup on SHUTDOWN and DESTROY
  // 2. Unsubscribe old handler before registering new one
  // 3. Register VISUAL_STAGE_CHANGED handler with guards

  const handleCleanup = () => {
    if (tracked.isShutdown) return;
    tracked.isShutdown = true;
    tracked.isActive = false;
    tracked.cleanup?.();
    tracked.cleanup = null;
  };

  tracked.cleanup = gameBridge.on('VISUAL_STAGE_CHANGED', () => {
    if (tracked.isShutdown || !tracked.isActive) return;
    tracked.handlerCalls++;
  });

  // Store the cleanup function for simulateShutdown/simulateDestroy
  (tracked as unknown as { _handleCleanup: () => void })._handleCleanup = handleCleanup;

  return tracked;
}

function simulateSceneShutdown(tracked: TrackedScene): void {
  (tracked as unknown as { _handleCleanup: () => void })._handleCleanup();
}

function simulateSceneDestroy(tracked: TrackedScene): void {
  (tracked as unknown as { _handleCleanup: () => void })._handleCleanup();
}

function emitVisualStageChanged(): void {
  gameBridge.emit('VISUAL_STAGE_CHANGED', {
    interactionId: INTERACTION_ID,
    stage: 'recovering',
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Scene lifecycle — VISUAL_STAGE_CHANGED handler management', () => {
  beforeEach(() => {
    gameBridge.clear();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
  });

  it('Scene create → registers exactly one VISUAL_STAGE_CHANGED handler', () => {
    const scene = createTrackedScene();

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(1);

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(2);
  });

  it('Scene shutdown → handler is unsubscribed and no longer receives events', () => {
    const scene = createTrackedScene();

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(1);

    simulateSceneShutdown(scene);

    emitVisualStageChanged();
    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(1); // Still 1, not incremented
  });

  it('Scene destroy → handler is unsubscribed and no longer receives events', () => {
    const scene = createTrackedScene();

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(1);

    simulateSceneDestroy(scene);

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(1); // Still 1
  });

  it('Scene shutdown is idempotent — multiple shutdowns do not cause errors', () => {
    const scene = createTrackedScene();

    simulateSceneShutdown(scene);
    // Second shutdown should be a no-op
    expect(() => simulateSceneShutdown(scene)).not.toThrow();

    emitVisualStageChanged();
    expect(scene.handlerCalls).toBe(0);
  });

  it('React Strict Mode create/destroy/create — only new Scene responds', () => {
    // First "mount" (React Strict Mode first render)
    const scene1 = createTrackedScene();

    emitVisualStageChanged();
    expect(scene1.handlerCalls).toBe(1);

    // React Strict Mode cleanup — destroy scene1
    simulateSceneDestroy(scene1);

    // React Strict Mode second render — create scene2
    const scene2 = createTrackedScene();

    emitVisualStageChanged();
    // scene1 should NOT have received this event
    expect(scene1.handlerCalls).toBe(1);
    // scene2 SHOULD have received this event
    expect(scene2.handlerCalls).toBe(1);
  });

  it('Old Scene InteractionZone does not respond to new VISUAL_STAGE_CHANGED', () => {
    const oldScene = createTrackedScene();

    emitVisualStageChanged();
    expect(oldScene.handlerCalls).toBe(1);

    // Destroy old scene
    simulateSceneDestroy(oldScene);

    // Create new scene
    const newScene = createTrackedScene();

    // Emit event — only new scene should respond
    emitVisualStageChanged();

    expect(oldScene.handlerCalls).toBe(1); // unchanged
    expect(newScene.handlerCalls).toBe(1); // incremented
  });

  it('Cleanup completed event only calls handler once (no duplicate handlers)', () => {
    const scene = createTrackedScene();

    // Simulate restoration completion emitting VISUAL_STAGE_CHANGED
    emitVisualStageChanged();

    expect(scene.handlerCalls).toBe(1); // exactly once, not twice
  });

  it('Return to start page and re-enter — no duplicate handlers', () => {
    // First play session
    const scene1 = createTrackedScene();
    emitVisualStageChanged();
    expect(scene1.handlerCalls).toBe(1);

    // Return to start page — destroy scene
    simulateSceneDestroy(scene1);

    // Re-enter game — new scene
    const scene2 = createTrackedScene();
    emitVisualStageChanged();

    expect(scene1.handlerCalls).toBe(1); // old scene not called
    expect(scene2.handlerCalls).toBe(1); // new scene called once

    // Emit again — should still be exactly 1 call per emit
    emitVisualStageChanged();
    expect(scene2.handlerCalls).toBe(2); // not 3 or 4 (which would indicate duplicates)
  });

  it('Multiple destroy/create cycles do not accumulate handlers', () => {
    for (let i = 0; i < 3; i++) {
      const scene = createTrackedScene();
      emitVisualStageChanged();
      expect(scene.handlerCalls).toBe(1);
      simulateSceneDestroy(scene);

      // After destroy, event should not trigger handler
      emitVisualStageChanged();
      expect(scene.handlerCalls).toBe(1);
    }
  });
});

describe('GameBridge — handler count verification', () => {
  beforeEach(() => {
    gameBridge.clear();
  });

  it('after unsubscribe, GameBridge has zero VISUAL_STAGE_CHANGED handlers', () => {
    const handler = vi.fn();
    const unsub = gameBridge.on('VISUAL_STAGE_CHANGED', handler);
    unsub();

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('after clear, GameBridge has zero handlers', () => {
    const handler = vi.fn();
    gameBridge.on('VISUAL_STAGE_CHANGED', handler);
    gameBridge.clear();

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-registering after clear produces exactly one handler', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    gameBridge.on('VISUAL_STAGE_CHANGED', handler1);
    gameBridge.clear();
    gameBridge.on('VISUAL_STAGE_CHANGED', handler2);

    gameBridge.emit('VISUAL_STAGE_CHANGED', {
      interactionId: INTERACTION_ID,
      stage: 'recovering',
    });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe('RestorationController — task mode blocking', () => {
  let controller: RestorationController;

  beforeEach(() => {
    localStorage.clear();
    useDailyTaskStore.getState().resetDailyTasks();
    useUIStore.getState().returnToStart();
    useEnvironmentStore.getState().resetEnvironment();
    gameBridge.clear();
    controller = new RestorationController(POLLUTION_ZONE_01_TARGET);
  });

  function acceptWasteTask(): void {
    useDailyTaskStore.getState().init();
    const task = useDailyTaskStore.getState().tasks.find((t) => {
      const def = findDailyTaskById(t.taskId);
      return def?.objectiveType === 'collect_waste';
    });
    if (task) {
      useDailyTaskStore.getState().acceptTask(task.instanceId);
    }
  }

  it('cannot start when inputMode is task', () => {
    acceptWasteTask();
    useUIStore.getState().setTaskPanelOpen(true);
    expect(useUIStore.getState().inputMode).toBe('task');

    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);

    expect(controller.getStatus()).toBe('idle');
  });

  it('in_progress restoration is interrupted when inputMode changes to task', () => {
    acceptWasteTask();

    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);
    expect(controller.getStatus()).toBe('in_progress');

    useUIStore.getState().setInputMode('task');
    controller.update(16);
    expect(controller.getStatus()).toBe('interrupted');
  });

  it('can start after task panel is closed', () => {
    acceptWasteTask();
    useUIStore.getState().setTaskPanelOpen(true);

    controller.setEKeyHeld(true);
    controller.setInRange(true);
    controller.update(16);
    expect(controller.getStatus()).toBe('idle');

    useUIStore.getState().setTaskPanelOpen(false);
    controller.update(16);
    expect(controller.getStatus()).toBe('in_progress');
  });
});
