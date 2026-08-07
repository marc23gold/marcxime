import { EffectComposer, Noise } from '@react-three/postprocessing'

/* Subtle film grain over the whole scene — a quiet "projected film" texture on
   the dark cinematic backdrop. Drop inside any Canvas to apply. */
export default function Grain() {
  return (
    <EffectComposer>
      <Noise premultiply opacity={0.07} />
    </EffectComposer>
  )
}
