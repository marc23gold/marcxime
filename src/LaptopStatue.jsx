import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DPR, SHADOW_MAP, DUST_COUNT } from './mobile'

/* A classic laptop (glTF, own PBR materials) seated on a plinth and lit by the
   same orbiting, colorful, texture-projected spotlight as the other pieces.
   Replaces the hands on the random-statue branch. */

const MODEL_URL = '/models/classic_laptop_2k/classic_laptop_2k.gltf'

const RADIUS = 3.5
const ORBIT_SPEED = 0.35 // slower, more cinematic sweep
const HEIGHT = 5

function Statue() {
  const { scene } = useGLTF(MODEL_URL)

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <group>
      {/* wide plinth (floor top is y=0) */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 1.0, 64]} />
        <meshStandardMaterial color="#d9d2c6" roughness={0.4} metalness={0.06} />
      </mesh>
      {/* laptop rested on the plinth (model base ~y 0) */}
      <primitive object={scene} scale={3} position={[0, 0.04, 0]} rotation={[0, -0.5, 0]} />
    </group>
  )
}

/* Colorful, irregular gobo texture projected by the spotlight. */
function makeGoboTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2)
  grad.addColorStop(0, '#fff3c4')
  grad.addColorStop(0.3, '#ffb25e')
  grad.addColorStop(0.6, '#ff5e8a')
  grad.addColorStop(1, '#4f7bff')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.5).toFixed(2)})`
    const r = Math.random() * 22 + 2
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }

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

/* Orbiting spotlight with a projected gobo map and shadow casting. */
function Spotlight() {
  const light = useRef()
  const gobo = useMemo(() => makeGoboTexture(), [])

  useFrame((state) => {
    if (!light.current) return
    const time = state.clock.elapsedTime
    light.current.position.set(Math.cos(time * ORBIT_SPEED) * RADIUS, HEIGHT, Math.sin(time * ORBIT_SPEED) * RADIUS)
    light.current.target.position.set(0, 0.8, 0)
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
      angle={Math.PI / 5}
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

/* Drifting dust so the sweeping shaft reads in the air. */
function Beam() {
  const dust = useRef()
  useFrame((state) => {
    if (dust.current) dust.current.rotation.y = state.clock.elapsedTime * 0.05
  })
  const dustPoints = useMemo(() => {
    const count = DUST_COUNT
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 0.4 + Math.random() * 1.6
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.3 + Math.random() * 2.2
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

/* Dark circular floor that receives the spotlight's projected pool and shadow. */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <circleGeometry args={[8, 64]} />
      <meshLambertMaterial color="#bcbcbc" />
    </mesh>
  )
}

export default function LaptopStatue() {
  return (
    <Canvas
      shadows
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      camera={{ position: [6.5, 3, 2.5], fov: 40 }}
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
        target={[0, 0.8, 0]}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
