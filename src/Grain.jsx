import { EffectComposer, Noise, Vignette, Bloom } from '@react-three/postprocessing'
import { isMobile } from './mobile'

/* Film finish: a soft bloom lifts the highlights, fine grain sits under a light
   vignette. The halftone dot-screen that used to run here was removed — at
   1440px it read as a visible screen-door mesh over the marble rather than
   print texture, and the grain plus the riso overlay already carry the paper
   feel.

   Mobile GPUs struggle with a full-res bloom at 60 fps, so coarse-pointer
   devices keep only grain + vignette: the film look survives, the frame rate
   does not. */
export default function Grain() {
  return (
    <EffectComposer>
      {/* Soft, dreamy glow. Skipped on mobile: full-res mipmap blur is the
          priciest pass. */}
      {!isMobile && (
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.6}
          mipmapBlur
          radius={0.85}
        />
      )}
      {/* Fine, warm, low-opacity grain. */}
      <Noise premultiply opacity={0.22} />
      {/* Gentle vignette — keeps the frame bright. */}
      <Vignette eskil={false} offset={0.35} darkness={0.2} />
    </EffectComposer>
  )
}
