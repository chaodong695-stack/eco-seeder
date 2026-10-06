export interface DedicatedMapContext {
  sourceSceneKey: string;
  sourceMapId: string;
  interactionId: string;
  targetMapId: string;
  returnPosition: { x: number; y: number };
}

let activeContext: DedicatedMapContext | null = null;

export function createDedicatedMapContext(context: DedicatedMapContext): DedicatedMapContext {
  if (!context.sourceSceneKey.trim() || !context.sourceMapId.trim() || !context.interactionId.trim() || !context.targetMapId.trim()) {
    throw new Error('Dedicated map context identifiers are required');
  }
  if (!Number.isFinite(context.returnPosition.x) || !Number.isFinite(context.returnPosition.y)) {
    throw new Error('Dedicated map return position must be finite');
  }
  activeContext = { ...context, returnPosition: { ...context.returnPosition } };
  return activeContext;
}

export function getDedicatedMapContext(): DedicatedMapContext | null {
  return activeContext;
}

export function clearDedicatedMapContext(): void {
  activeContext = null;
}
