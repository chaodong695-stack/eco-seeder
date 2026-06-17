import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/store/playerStore';

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.getState().resetCharacter();
  });

  it('starts with no character selected', () => {
    expect(usePlayerStore.getState().character).toBe(null);
  });

  it('selects male character', () => {
    usePlayerStore.getState().selectCharacter('male');
    const character = usePlayerStore.getState().character;
    expect(character).not.toBe(null);
    expect(character!.gender).toBe('male');
    expect(character!.characterId).toBe('character.player_male');
    expect(character!.displayName).toBe('男性生态修复员');
  });

  it('selects female character', () => {
    usePlayerStore.getState().selectCharacter('female');
    const character = usePlayerStore.getState().character;
    expect(character).not.toBe(null);
    expect(character!.gender).toBe('female');
    expect(character!.characterId).toBe('character.player_female');
    expect(character!.displayName).toBe('女性生态修复员');
  });

  it('resets character', () => {
    usePlayerStore.getState().selectCharacter('male');
    usePlayerStore.getState().resetCharacter();
    expect(usePlayerStore.getState().character).toBe(null);
  });
});
