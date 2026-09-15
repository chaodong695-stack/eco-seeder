# Demo Main Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not delegate; changes touch a shared scene integration.

**Goal:** Replace the playable main scene appearance with the supplied layered demo, preserving all original gameplay, characters and interaction IDs.
**Architecture:** A pure demo layout maps existing definitions without mutation. A Phaser backdrop controller owns the eight image layers and smoke/parallax lifecycle. Existing gameplay and weather remain in UrbanWastelandScene; React HUD is restyled locally. The old scene environment remains available behind a visual flag.
**Tech Stack:** Existing TypeScript, Phaser 3, React 18, CSS modules, Vitest; no new dependencies.

---

### Task 1: Baseline and contracts
- [x] Baseline `npm test -- --reporter=dot`: 79 files / 1010 tests pass, pre-existing WorldStatus act warnings.
- [x] Baseline `npm run typecheck` passes.
- [ ] Add `src/tests/demoSceneLayout.test.ts`: assert original IDs and non-visual fields unchanged, no source mutation, all targets in walking band, at least three depth bands, both NPCs reachable, all assets on disk, ground depth below entities and foreground below FX.
- [ ] Run `npm test -- src/tests/demoSceneLayout.test.ts` and observe missing-module failure.

### Task 2: Demo layout and rendering
Files: `src/content/maps/demoSceneLayout.ts`, `src/game/visual/DemoSceneBackdrop.ts`, `src/game/assets/assetManifest.ts`, `public/assets/images/demo-scene/*.png`.
- [ ] Copy exactly the eight supplied images. Add the manifest under `sceneAssets.demo`.
- [ ] Implement pure `demoInteractionObjects`, `demoNpcDefinitions`, `demoActorHeight`, and fixed spawn/obstacle/layer configuration. Preserve original objects via `{ ...config, ...placement }`.
- [ ] Keep positions within Y=700..1040, use actual sprite heights at feet; map all original IDs explicitly.
- [ ] Implement backdrop images in matching 1920×1080 coordinates, smoke tween, limited mouse parallax only on distant decoration, and foreground transparency near the player. Implement idempotent destroy.
- [ ] Run contract tests; add controller lifecycle tests before implementing controller behavior.

### Task 3: Scene integration and characters
Files: `src/game/scenes/UrbanWastelandScene.ts`, `src/game/entities/Player.ts`, `src/game/bootstrap/gameConfig.ts`.
- [ ] Extract the existing environment creation as legacy fallback, retaining user changes. Share existing interaction, NPC, task, weather, restoration and cleanup paths.
- [ ] Use demo mappings when creating zones/NPCs and locating restoration vegetation. Never change business IDs or weather conditions.
- [ ] Display the whole 1920×1080 canvas with FIT and camera zoom 1; remove duplicate canvas map title. No new camera/weather coordinate transformation.
- [ ] Apply subtle depth-based character height and facing while preserving a stable physical footprint; test the body geometry calculation before changing it.
- [ ] Check all routes using actual inflated body footprints and world limits. Preserve original legacy colliders for fallback only.

### Task 4: HUD
Files: `src/ui/components/GameHud.tsx`, `GameHud.module.css`, `WorldStatus.module.css`, `CollapsibleRightHud.module.css`, `src/ui/pages/GamePage.module.css`.
- [ ] Extend HUD tests to require the game-region heading, original task/settings/return behavior, supplied character name and movement hints.
- [ ] Scope warm green/glass styling to GamePage; do not touch global colors or StartPage.
- [ ] Keep time/weather read from existing store and right panels collapsible; maintain button input guards.

### Task 5: Verification and handoff
- [ ] Run targeted tests, then `npm test -- --reporter=dot`, `npm run typecheck`, `npm run build`.
- [ ] Run lint against touched TS/TSX files and distinguish existing findings from new ones.
- [ ] Browser: enter from existing start/selection pages; inspect both NPCs/all zones; walk to targets, open NPC dialogue and remote repair map; weather/phase changes; return and re-enter; resize.
- [ ] Review diff against saved baseline; do not stage unrelated user work or commit automatically.
- [ ] Record evidence and limitations under `docs/superpowers/acceptance/demo-main-scene.md`.

## Plan review
This plan covers visual replacement, original-ID preservation, depth placement, collision/readability, weather continuity and cleanup. Art variants are explicitly deferred. Current workspace is used as requested; existing modifications stay on the feature branch and are not overwritten.
