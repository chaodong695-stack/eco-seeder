export interface FrameSample { timestamp: number; deltaMs: number; fps: number; }
export function summarizeFrames(samples: readonly FrameSample[]) {
  const fps = samples.map((sample) => sample.fps).filter(Number.isFinite).sort((a, b) => a - b);
  if (!fps.length) return { average: 0, low1: 0, min: 0 };
  return { average: fps.reduce((sum, value) => sum + value, 0) / fps.length, low1: fps[Math.max(0, Math.floor(fps.length * 0.01))], min: fps[0] };
}
