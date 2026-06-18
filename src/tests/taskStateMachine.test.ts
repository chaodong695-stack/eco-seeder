import { describe, it, expect } from 'vitest';
import {
  canTransition,
  transition,
  isAvailable,
  isCompleted,
} from '@/game/tasks/taskStateMachine';
import type { TaskStatus } from '@/game/tasks/taskTypes';

describe('TaskStateMachine', () => {
  describe('canTransition', () => {
    it('allows available → active', () => {
      expect(canTransition('available', 'active')).toBe(true);
    });

    it('allows active → objective_completed', () => {
      expect(canTransition('active', 'objective_completed')).toBe(true);
    });

    it('allows objective_completed → completed', () => {
      expect(canTransition('objective_completed', 'completed')).toBe(true);
    });

    it('does not allow available → completed (skip)', () => {
      expect(canTransition('available', 'completed')).toBe(false);
    });

    it('does not allow active → completed (skip)', () => {
      expect(canTransition('active', 'completed')).toBe(false);
    });

    it('does not allow completed → active (rollback)', () => {
      expect(canTransition('completed', 'active')).toBe(false);
    });

    it('does not allow completed → objective_completed (rollback)', () => {
      expect(canTransition('completed', 'objective_completed')).toBe(false);
    });

    it('does not allow available → objective_completed (skip)', () => {
      expect(canTransition('available', 'objective_completed')).toBe(false);
    });

    it('does not allow active → available (rollback)', () => {
      expect(canTransition('active', 'available')).toBe(false);
    });

    it('does not allow objective_completed → active (rollback)', () => {
      expect(canTransition('objective_completed', 'active')).toBe(false);
    });
  });

  describe('transition', () => {
    it('returns new status for valid transition', () => {
      expect(transition('available', 'active')).toBe('active');
      expect(transition('active', 'objective_completed')).toBe('objective_completed');
      expect(transition('objective_completed', 'completed')).toBe('completed');
    });

    it('returns null for invalid transition', () => {
      expect(transition('available', 'completed')).toBeNull();
      expect(transition('active', 'completed')).toBeNull();
      expect(transition('completed', 'active')).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('returns true for available status', () => {
      expect(isAvailable('available')).toBe(true);
    });

    it('returns false for non-available status', () => {
      expect(isAvailable('active')).toBe(false);
      expect(isAvailable('objective_completed')).toBe(false);
      expect(isAvailable('completed')).toBe(false);
    });
  });

  describe('isCompleted', () => {
    it('returns true for completed status', () => {
      expect(isCompleted('completed')).toBe(true);
    });

    it('returns false for non-completed status', () => {
      expect(isCompleted('available')).toBe(false);
      expect(isCompleted('active')).toBe(false);
      expect(isCompleted('objective_completed')).toBe(false);
    });
  });

  describe('full valid lifecycle', () => {
    it('supports the full available → active → objective_completed → completed path', () => {
      let status: TaskStatus = 'available';
      expect(canTransition(status, 'active')).toBe(true);
      status = transition(status, 'active')!;
      expect(status).toBe('active');
      expect(canTransition(status, 'objective_completed')).toBe(true);
      status = transition(status, 'objective_completed')!;
      expect(status).toBe('objective_completed');
      expect(canTransition(status, 'completed')).toBe(true);
      status = transition(status, 'completed')!;
      expect(status).toBe('completed');
      expect(isCompleted(status)).toBe(true);
    });
  });
});
