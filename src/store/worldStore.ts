import { create } from 'zustand';
import type { MapState } from '@/types';
import { INITIAL_MAP_STATE } from '@/content/maps/urbanWasteland';

interface WorldState {
  currentMapId: string | null;
  mapState: MapState;
  setMapId: (mapId: string) => void;
  setMapState: (state: MapState) => void;
  resetWorld: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  currentMapId: null,
  mapState: INITIAL_MAP_STATE,
  setMapId: (currentMapId) => set({ currentMapId }),
  setMapState: (mapState) => set({ mapState }),
  resetWorld: () => set({ currentMapId: null, mapState: INITIAL_MAP_STATE }),
}));
