import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { isMobile } from './mobile'

/* A fixed, distant sky shared by every study: a sparse field of faint ivory
   stars on the edge of the set. The floor masks the lower half, so the skyline
   is the plinth's rim, and orbiting the camera slides the stars a little
   against the sculpture — parallax, not decoration.

   The field is seeded: reloads, and switching pieces, reveal the same sky.
   Nothing animates here — the beam sweeps and the dust drifts; the sky holds
   still. */

const RADIUS = 90
const COUNT = isMobile ? 480 : 900

/* Three magnitudes, because a sky reads as sky through contrast, not count:
   many faint points, a middle layer, and a few anchors that bloom. */
const TIERS = [
  { share: 0.55, size: 0.16, magnitude: 0.6, seed: 0x1c0ffee },
  { share: 0.32, size: 0.28, magnitude: 0.95, seed: 0x5eed },
  { share: 0.13, size: 0.48, magnitude: 1.15, seed: 0xb11e },
]

const WARM = new THREE.Color('#ffe9b0')
const IVORY = new THREE.Color('#e9e4db')

/* mulberry32 — small, deterministic, and enough for a star field. */
function makeRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* One cloud of stars: positions uniform over the band of sky the set can
   actually show — above the plinth rim, below the top of the orbit — so the
   agreed count lands on screen instead of behind the floor. Colours are warm
   ivory with a per-star magnitude so the field has depth, not a flat dusting. */
function makeField(count, seed, magnitude) {
  const rand = makeRandom(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()
  const yMin = Math.sin(THREE.MathUtils.degToRad(-28))
  const yMax = Math.sin(THREE.MathUtils.degToRad(22))

  for (let i = 0; i < count; i++) {
    const y = yMin + rand() * (yMax - yMin)
    const phi = rand() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)

    positions[i * 3] = Math.cos(phi) * ring * RADIUS
    positions[i * 3 + 1] = y * RADIUS
    positions[i * 3 + 2] = Math.sin(phi) * ring * RADIUS

    color.copy(WARM).lerp(IVORY, rand() * 0.75)
    color.multiplyScalar(magnitude * (0.45 + rand() * 0.55))
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return { positions, colors }
}

/* A soft round dot; additive blending needs the dark edge, not a hard square. */
function makeSprite() {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function StarCloud({ field, sprite, size }) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[field.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={size}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

export default function Sky() {
  const sprite = useMemo(makeSprite, [])
  useEffect(() => () => sprite.dispose(), [sprite])

  const fields = useMemo(() => {
    let assigned = 0
    return TIERS.map((tier, index) => {
      const count = index === TIERS.length - 1
        ? COUNT - assigned
        : Math.round(COUNT * tier.share)
      assigned += count
      return { ...tier, ...makeField(count, tier.seed, tier.magnitude) }
    })
  }, [])

  const scale = isMobile ? 1.2 : 1

  return (
    <group>
      {fields.map((field) => (
        <StarCloud key={field.seed} field={field} sprite={sprite} size={field.size * scale} />
      ))}
    </group>
  )
}
