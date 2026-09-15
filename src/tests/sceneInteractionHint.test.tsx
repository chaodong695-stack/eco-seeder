import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { gameBridge } from '@/game/bridge/GameBridge';
import { InteractionPrompt } from '@/ui/components/InteractionPrompt';
import { UrbanWastelandScene } from '@/game/scenes/UrbanWastelandScene';
import type { InteractionAvailablePayload } from '@/game/interaction/interactionTypes';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));

describe('scene interaction hints retain Chinese through GameBridge', () => {
  beforeEach(() => gameBridge.clear());
  afterEach(() => { cleanup(); gameBridge.clear(); });

  it.each([
    { id: 'interaction.ecology_patrol_01', name: '生态巡查点', npc: false },
    { id: 'npc.engineer.lin', name: '林工', npc: true },
    { id: 'npc_weather_ranger', name: '巡查员', npc: true },
  ])('renders readable hint for $name', ({ id, name, npc }) => {
    const scene = new UrbanWastelandScene();
    const config = { id, displayName: name, x: 900, y: 800, interactionRange: 80, type: 'ecology_patrol_point' };
    Object.assign(scene, {
      player: { gameObject: { x: 900, y: 800 } },
      interactionHintText: { setVisible: vi.fn() },
      interactionZones: npc ? [] : [{ config, available: true, checkAvailability: vi.fn(), setLabelVisible: vi.fn() }],
      npcEntities: npc ? [{ config, isAvailable: false, label: { setVisible: vi.fn() } }] : [],
    });
    const hints: InteractionAvailablePayload[] = [];
    gameBridge.on('INTERACTION_AVAILABLE', payload => hints.push(payload));
    render(<InteractionPrompt />);
    act(() => (scene as unknown as { updateInteractions(): void }).updateInteractions());
    expect(hints.length).toBeGreaterThan(0);
    hints.forEach(payload => expect(payload.hint).toBe('按 E 交互'));
    expect(screen.getByText(`${name} — 按 E 交互`)).toBeInTheDocument();
  });
});
