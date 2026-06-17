import { describe, it, expect } from 'vitest';
import { computeMovementVector } from '@/game/entities/movementVector';

describe('computeMovementVector', () => {
  const SPEED = 200;

  it('returns zero vector when no input', () => {
    const result = computeMovementVector(
      { up: false, down: false, left: false, right: false },
      SPEED,
    );
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });

  it('moves right when only right is pressed', () => {
    const result = computeMovementVector(
      { up: false, down: false, left: false, right: true },
      SPEED,
    );
    expect(result.vx).toBe(SPEED);
    expect(result.vy).toBe(0);
  });

  it('moves left when only left is pressed', () => {
    const result = computeMovementVector(
      { up: false, down: false, left: true, right: false },
      SPEED,
    );
    expect(result.vx).toBe(-SPEED);
    expect(result.vy).toBe(0);
  });

  it('moves up when only up is pressed', () => {
    const result = computeMovementVector(
      { up: true, down: false, left: false, right: false },
      SPEED,
    );
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(-SPEED);
  });

  it('moves down when only down is pressed', () => {
    const result = computeMovementVector(
      { up: false, down: true, left: false, right: false },
      SPEED,
    );
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(SPEED);
  });

  it('normalizes diagonal movement — no speed gain', () => {
    const result = computeMovementVector(
      { up: true, down: false, left: false, right: true },
      SPEED,
    );
    // 对角线归一化后，每个分量应为 speed / sqrt(2)
    const expected = SPEED / Math.sqrt(2);
    expect(result.vx).toBeCloseTo(expected, 5);
    expect(result.vy).toBeCloseTo(-expected, 5);

    // 总速度应等于单方向速度
    const totalSpeed = Math.sqrt(result.vx ** 2 + result.vy ** 2);
    expect(totalSpeed).toBeCloseTo(SPEED, 5);
  });

  it('diagonal speed equals single-direction speed', () => {
    const single = computeMovementVector(
      { up: false, down: false, left: false, right: true },
      SPEED,
    );
    const diagonal = computeMovementVector(
      { up: true, down: false, left: true, right: false },
      SPEED,
    );

    const singleSpeed = Math.sqrt(single.vx ** 2 + single.vy ** 2);
    const diagonalSpeed = Math.sqrt(diagonal.vx ** 2 + diagonal.vy ** 2);

    expect(diagonalSpeed).toBeCloseTo(singleSpeed, 5);
  });

  it('up-left diagonal is normalized', () => {
    const result = computeMovementVector(
      { up: true, down: false, left: true, right: false },
      SPEED,
    );
    const expected = SPEED / Math.sqrt(2);
    expect(result.vx).toBeCloseTo(-expected, 5);
    expect(result.vy).toBeCloseTo(-expected, 5);
  });

  it('down-right diagonal is normalized', () => {
    const result = computeMovementVector(
      { up: false, down: true, left: false, right: true },
      SPEED,
    );
    const expected = SPEED / Math.sqrt(2);
    expect(result.vx).toBeCloseTo(expected, 5);
    expect(result.vy).toBeCloseTo(expected, 5);
  });

  it('down-left diagonal is normalized', () => {
    const result = computeMovementVector(
      { up: false, down: true, left: true, right: false },
      SPEED,
    );
    const expected = SPEED / Math.sqrt(2);
    expect(result.vx).toBeCloseTo(-expected, 5);
    expect(result.vy).toBeCloseTo(expected, 5);
  });

  it('opposing keys cancel out', () => {
    const result = computeMovementVector(
      { up: false, down: false, left: true, right: true },
      SPEED,
    );
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(0);
  });
});
