// Lightweight device detection shared by the R3F scenes to scale rendering
// budget: cap DPR lower on coarse-pointer (touch) devices to cut fill rate,
// shrink the shadow map, and draw fewer dust motes.

const coarse =
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia) &&
  window.matchMedia('(pointer: coarse)').matches

export const isMobile = coarse
export const DPR = isMobile ? [1, 1.5] : [1, 2]
export const SHADOW_MAP = isMobile ? 512 : 1024
// The star sky carries the far field; the dust only has to make the beam read
// in the air, so it stays a light layer rather than a full particle sim.
export const DUST_COUNT = isMobile ? 96 : 240
