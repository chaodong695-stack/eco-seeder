import { describe, expect, it } from 'vitest';
import { DEPTH_CONTACT_SHADOW, DEPTH_FOREGROUND, DEPTH_TASK_MARKER, entityDepth, getSceneDepth } from '@/game/config/depthConfig';
describe('stage two depth rules', () => { it('keeps shadows, markers and Y-sort in stable bands', () => { expect(DEPTH_CONTACT_SHADOW).toBeLessThan(entityDepth(700)); expect(entityDepth(1040)).toBeLessThan(DEPTH_FOREGROUND); expect(entityDepth(900)).toBeGreaterThan(entityDepth(800)); expect(getSceneDepth('taskMarker', 800)).toBe(DEPTH_TASK_MARKER); }); });
