import { create } from 'zustand';
import type { PlayerCharacterChoice, PlayerCharacterGender } from '@/types';

interface PlayerState {
  character: PlayerCharacterChoice | null;
  selectCharacter: (gender: PlayerCharacterGender) => void;
  resetCharacter: () => void;
}

const CHARACTER_NAMES: Record<PlayerCharacterGender, string> = {
  male: '男性生态修复员',
  female: '女性生态修复员',
};

export const usePlayerStore = create<PlayerState>((set) => ({
  character: null,
  selectCharacter: (gender) => {
    const choice: PlayerCharacterChoice = {
      characterId: `character.player_${gender}`,
      gender,
      displayName: CHARACTER_NAMES[gender],
    };
    set({ character: choice });
  },
  resetCharacter: () => set({ character: null }),
}));
