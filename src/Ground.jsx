import { useMemo } from 'react'
import * as THREE from 'three'

/* The set as a black stage: a floor visible only where the beam lights it.
   The rim dissolves into the dark instead of ending in a grey disc, so the
   object sits in a pool of light rather than on a platform. */

const RADIUS = 12

function makeRimFade() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.16, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, '#fff')
  gradient.addColorStop(0.7, '#fff')
  gradient.addColorStop(1, '#000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

export default function Ground() {
  const fade = useMemo(makeRimFade, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <circleGeometry args={[RADIUS, 96]} />
      <meshStandardMaterial
        color="#232227"
        roughness={1}
        metalness={0}
        alphaMap={fade}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
