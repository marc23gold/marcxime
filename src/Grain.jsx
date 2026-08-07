import { EffectComposer, Noise, Vignette } from '@react-three/postprocessing'

/* Soft, warm film grain: fine animated noise (no scanlines — that read as TV
   static) over a gentle, warm vignette. Quiet and filmic, not electrical. */
export default function Grain() {
  return (
    <EffectComposer>
      <Noise premultiply opacity={0.2} />
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
    </EffectComposer>
  )
}
