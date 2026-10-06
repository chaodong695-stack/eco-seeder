import { describe, expect, it } from 'vitest';
import { useVisualDebugStore } from '@/game/visual/visualDebugStore';
describe('visual debug store', () => { it('starts disabled and toggles idempotently', () => { useVisualDebugStore.setState({enabled:false}); expect(useVisualDebugStore.getState().enabled).toBe(false); useVisualDebugStore.getState().setEnabled(true); expect(useVisualDebugStore.getState().enabled).toBe(true); useVisualDebugStore.getState().setEnabled(true); expect(useVisualDebugStore.getState().enabled).toBe(true); }); });
