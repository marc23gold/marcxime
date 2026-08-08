import { EffectComposer, Noise, Vignette, DotScreen, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { isMobile } from './mobile'

/* Cinematic bright, warm bloom finish: a soft bloom lifts the highlights into a
   gentle glow, a whisper of halftone dot-screen adds print texture, and fine warm
   animated grain sits under a light vignette. Reads as warm, dreamy film rather
   than crisp digital video.

   Mobile GPUs struggle with full-res bloom + dot-screen + grain at 60 fps, so
   coarse-pointer devices drop the two expensive passes and keep only grain +
   vignette — the film look survives, the frame rate doesn't. */
export default function Grain() {
  return (
    <EffectComposer>
      {/* Cinematic bloom — soft, dreamy glow that lifts the whole frame.
          Skipped on mobile: full-res mipmap blur is the priciest pass. */}
      {!isMobile && (
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.6}
          mipmapBlur
          radius={0.85}
        />
      )}
      {/* Grainy film grain — fine, warm, low-opacity but clearly visible,
          no scanlines. This is the "grainy film" hero. */}
      <Noise premultiply opacity={0.22} />
      {/* Barely-there halftone — very fine dots (high scale = many tiny dots),
          very low opacity, so it textures without reading as print/comic.
          Skipped on mobile with the bloom. */}
      {!isMobile && (
        <DotScreen
          angle={Math.PI / 4}
          scale={6}
          opacity={0.06}
          blendFunction={BlendFunction.SOFT_LIGHT}
        />
      )}
      {/* Gentle vignette — keeps the frame bright. */}
      <Vignette eskil={false} offset={0.35} darkness={0.2} />
    </EffectComposer>
  )
}
