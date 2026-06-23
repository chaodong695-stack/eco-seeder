import { describe, it, expect } from 'vitest';
import {
  canRestorationTransition,
  restorationTransition,
  isRestorationCompleted,
  isRestorationActive,
} from '@/game/restoration/restorationStateMachine';
import type { RestorationActionStatus } from '@/game/restoration/restorationTypes';

describe('RestorationStateMachine', () => {
  describe('canRestorationTransition', () => {
    it('allows idle → in_progress', () => {
      expect(canRestorationTransition('idle', 'in_progress')).toBe(true);
    });

    it('allows in_progress → interrupted', () => {
      expect(canRestorationTransition('in_progress', 'interrupted')).toBe(true);
    });

    it('allows interrupted → in_progress', () => {
      expect(canRestorationTransition('interrupted', 'in_progress')).toBe(true);
    });

    it('allows in_progress → completed', () => {
      expect(canRestorationTransition('in_progress', 'completed')).toBe(true);
    });

    it('does not allow idle → completed', () => {
      expect(canRestorationTransition('idle', 'completed')).toBe(false);
    });

    it('does not allow completed → in_progress', () => {
      expect(canRestorationTransition('completed', 'in_progress')).toBe(false);
    });

    it('does not allow completed → interrupted', () => {
      expect(canRestorationTransition('completed', 'interrupted')).toBe(false);
    });

    it('does not allow idle → interrupted', () => {
      expect(canRestorationTransition('idle', 'interrupted')).toBe(false);
    });

    it('does not allow interrupted → completed (skip)', () => {
      expect(canRestorationTransition('interrupted', 'completed')).toBe(false);
    });

    it('does not allow completed → idle (rollback)', () => {
      expect(canRestorationTransition('completed', 'idle')).toBe(false);
    });
  });

  describe('restorationTransition', () => {
    it('returns new status for valid transition', () => {
      expect(restorationTransition('idle', 'in_progress')).toBe('in_progress');
      expect(restorationTransition('in_progress', 'interrupted')).toBe('interrupted');
      expect(restorationTransition('interrupted', 'in_progress')).toBe('in_progress');
      expect(restorationTransition('in_progress', 'completed')).toBe('completed');
    });

    it('returns null for invalid transition', () => {
      expect(restorationTransition('idle', 'completed')).toBeNull();
      expect(restorationTransition('completed', 'in_progress')).toBeNull();
      expect(restorationTransition('completed', 'interrupted')).toBeNull();
    });
  });

  describe('isRestorationCompleted', () => {
    it('returns true for completed status', () => {
      expect(isRestorationCompleted('completed')).toBe(true);
    });

    it('returns false for non-completed status', () => {
      expect(isRestorationCompleted('idle')).toBe(false);
      expect(isRestorationCompleted('in_progress')).toBe(false);
      expect(isRestorationCompleted('interrupted')).toBe(false);
    });
  });

  describe('isRestorationActive', () => {
    it('returns true for in_progress status', () => {
      expect(isRestorationActive('in_progress')).toBe(true);
    });

    it('returns false for non-in_progress status', () => {
      expect(isRestorationActive('idle')).toBe(false);
      expect(isRestorationActive('interrupted')).toBe(false);
      expect(isRestorationActive('completed')).toBe(false);
    });
  });

  describe('full valid lifecycle', () => {
    it('supports idle → in_progress → interrupted → in_progress → completed', () => {
      let status: RestorationActionStatus = 'idle';
      expect(canRestorationTransition(status, 'in_progress')).toBe(true);
      status = restorationTransition(status, 'in_progress')!;
      expect(status).toBe('in_progress');

      // Interrupt
      expect(canRestorationTransition(status, 'interrupted')).toBe(true);
      status = restorationTransition(status, 'interrupted')!;
      expect(status).toBe('interrupted');

      // Resume
      expect(canRestorationTransition(status, 'in_progress')).toBe(true);
      status = restorationTransition(status, 'in_progress')!;
      expect(status).toBe('in_progress');

      // Complete
      expect(canRestorationTransition(status, 'completed')).toBe(true);
      status = restorationTransition(status, 'completed')!;
      expect(status).toBe('completed');
      expect(isRestorationCompleted(status)).toBe(true);
    });

    it('does not allow second completion after completed', () => {
      const status: RestorationActionStatus = 'completed';
      expect(canRestorationTransition(status, 'completed')).toBe(false);
      expect(canRestorationTransition(status, 'in_progress')).toBe(false);
      expect(canRestorationTransition(status, 'interrupted')).toBe(false);
    });
  });
});
