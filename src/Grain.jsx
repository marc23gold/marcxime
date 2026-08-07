import { EffectComposer, Noise, Scanline, Vignette } from '@react-three/postprocessing'

/* Warm, fuzzy, dancing film grain: the Noise pass advances its seed with time
   (true animated grain), Scanline adds a faint shutter-line texture, and a
   soft vignette frames the edges — a cinema look over the whole scene. */
export default function Grain() {
  return (
    <EffectComposer>
      <Noise premultiply opacity={0.45} />
      <Scanline opacity={0.12} density={1.0} />
      <Vignette eskil={false} offset={0.18} darkness={0.9} />
    </EffectComposer>
  )
}
