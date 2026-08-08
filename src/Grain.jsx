import { EffectComposer, Noise, Vignette, DotScreen, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

/* Cinematic bright, warm bloom finish: a soft bloom lifts the highlights into a
   gentle glow, a whisper of halftone dot-screen adds print texture, and fine warm
   animated grain sits under a light vignette. Reads as warm, dreamy film rather
   than crisp digital video. */
export default function Grain() {
  return (
    <EffectComposer>
      {/* Cinematic bloom — soft, dreamy glow that lifts the whole frame. */}
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.6}
        mipmapBlur
        radius={0.85}
      />
      {/* Grainy film grain — fine, warm, low-opacity but clearly visible,
          no scanlines. This is the "grainy film" hero. */}
      <Noise premultiply opacity={0.22} />
      {/* Barely-there halftone — very fine dots (high scale = many tiny dots),
          very low opacity, so it textures without reading as print/comic. */}
      <DotScreen
        angle={Math.PI / 4}
        scale={6}
        opacity={0.06}
        blendFunction={BlendFunction.SOFT_LIGHT}
      />
      {/* Gentle vignette — keeps the frame bright. */}
      <Vignette eskil={false} offset={0.35} darkness={0.2} />
    </EffectComposer>
  )
}
