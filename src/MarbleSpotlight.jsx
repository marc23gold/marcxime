import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DPR, SHADOW_MAP, DUST_COUNT } from './mobile'

/* The genuine Stanford "Lucy" statue, decimated to ~10k tris and exported as a
   small GLB (181 KB vs the 1.9 MB PLY) for fast loads and light mobile GPUs. */

function Statue() {
  const { scene } = useGLTF('/models/Lucy.glb')

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <primitive
      object={scene}
      position={[0, 0.8, 0]}
      rotation={[0, -Math.PI / 2, 0]}
      scale={0.0024}
    />
  )
}

/* A single classical statue under an orbiting spotlight that sweeps a colorful,
   texture-projected beam around it — mirroring three.js webgl_lights_spotlight. */

const RADIUS = 2.5
const ORBIT_SPEED = 0.35 // slower, more cinematic sweep
const HEIGHT = 5

/* A colorful, irregular gobo texture projected by the spotlight — the
   reference uses textures/disturb.jpg; here a generated multicolor pattern
   gives the same projected-light-pool effect. */
function makeGoboTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  // colourful base wash
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2)
  grad.addColorStop(0, '#fff3c4')
  grad.addColorStop(0.3, '#ffb25e')
  grad.addColorStop(0.6, '#ff5e8a')
  grad.addColorStop(1, '#4f7bff')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // bright speckle
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.5).toFixed(2)})`
    const r = Math.random() * 22 + 2
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // dark scribbled "disturb" strokes
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(15,15,35,${(Math.random() * 0.6).toFixed(2)})`
    ctx.lineWidth = Math.random() * 14 + 3
    ctx.beginPath()
    const x0 = Math.random() * size
    const y0 = Math.random() * size
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(
      x0 + Math.random() * 120 - 60, y0 + Math.random() * 120 - 60,
      x0 + Math.random() * 120 - 60, y0 + Math.random() * 120 - 60,
      x0 + Math.random() * 240 - 120, y0 + Math.random() * 240 - 120,
    )
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/* Orbiting spotlight with a projected gobo map and shadow casting, matching
   the reference (angle PI/6, penumbra 1, decay 2, distance 0, intensity 100).
   The light circle-sweeps around the bust at height 5, aimed at its centre. */
function Spotlight() {
  const light = useRef()
  const gobo = useMemo(() => makeGoboTexture(), [])

  useFrame((state) => {
    if (!light.current) return
    const time = state.clock.elapsedTime
    light.current.position.set(Math.cos(time * ORBIT_SPEED) * RADIUS, HEIGHT, Math.sin(time * ORBIT_SPEED) * RADIUS)
    // aim the light at the statue's centre
    light.current.target.position.set(0, 1, 0)
    light.current.target.updateMatrixWorld()
  })

  return (
    <spotLight
      ref={light}
      position={[RADIUS, HEIGHT, RADIUS]}
      map={gobo}
      castShadow
      intensity={100}
      distance={0}
      angle={Math.PI / 6}
      penumbra={1}
      decay={2}
      color="#ffffff"
      shadow-mapSize-width={SHADOW_MAP}
      shadow-mapSize-height={SHADOW_MAP}
      shadow-camera-near={2}
      shadow-camera-far={10}
      shadow-focus={1}
      shadow-bias={-0.003}
    />
  )
}

/* A handful of drifting dust motes so the sweeping shaft reads in the air. */
function Beam() {
  const dust = useRef()
  useFrame((state) => {
    if (dust.current) dust.current.rotation.y = state.clock.elapsedTime * 0.05
  })
  const dustPoints = useMemo(() => {
    const count = DUST_COUNT
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 0.3 + Math.random() * 1.4
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.5 + Math.random() * 2.4
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])
  return (
    <points ref={dust}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[dustPoints, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe9b0"
        size={0.02}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* Dark circular floor that receives the spotlight's projected pool and the
   sweeping contact shadow. */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <circleGeometry args={[7, 64]} />
      <meshLambertMaterial color="#bcbcbc" />
    </mesh>
  )
}

export default function MarbleSpotlight() {
  return (
    <Canvas
      shadows
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      camera={{ position: [7, 4, 1], fov: 40 }}
      dpr={DPR}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <hemisphereLight args={['#ffffff', '#8d8d8d', 0.25]} />

      <Suspense fallback={null}>
        <Statue />
      </Suspense>
      <Spotlight />
      <Beam />
      <Floor />

      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
