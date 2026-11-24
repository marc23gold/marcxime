import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DPR, SHADOW_MAP, DUST_COUNT, isMobile } from './mobile'
import Grain from './Grain'
import Sky from './Sky'

/* A classic laptop (glTF, own PBR materials) seated on a plinth and lit by the
   same orbiting, colorful, texture-projected spotlight as the other pieces.
   Replaces the hands on the random-statue branch. */

const MODEL_URL = '/models/classic_laptop/classic_laptop.gltf'

const RADIUS = 3.5
const ORBIT_SPEED = 0.35 // slower, more cinematic sweep
const HEIGHT = 5

/* Screen power-on: the glTF screen material starts near-black (off). The first
   time the camera looks at the screen front, it boots with a warm flicker and
   settles into a dim, breathing glow that fits the film faint-light look. */
const SCREEN_MAT = 'classic_laptop_screen'
const SCREEN_COLOR = new THREE.Color('#ffe9b0')
const _p = new THREE.Vector3()
const _d = new THREE.Vector3()
const _f = new THREE.Vector3()

const ease = (x) => x * x * (3 - 2 * x)

/* The screen boots by drawing a warm, analog-style boot animation onto a canvas
   texture that feeds the screen material's emissiveMap — the display shows
   content as it powers on, not a flat filled panel. RGB encodes brightness
   (alpha is ignored by emissiveMap), so every layer writes scaled rgb(). */
const SCREEN_W = 256
const SCREEN_H = 160

const warm = (b) => `rgb(${Math.round(255 * b)},${Math.round(214 * b)},${Math.round(150 * b)})`

function makeScreen() {
  const canvas = document.createElement('canvas')
  canvas.width = SCREEN_W
  canvas.height = SCREEN_H
  const ctx = canvas.getContext('2d')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  return { ctx, tex }
}

/* The screen mesh's original UVs point at the shared texture atlas (or are
   missing), so a dedicated canvas map would sample a stray region. Re-map the
   screen geometry to a full 0-1 quad along its two widest local axes so the
   boot canvas fills the whole display. */
function fitScreenUVs(geo) {
  if (!geo) return
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const pos = geo.attributes.position
  if (!pos) return
  const ext = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z]
  const [ax, ay] = [0, 1, 2].sort((p, q) => ext[q] - ext[p]).slice(0, 2)
  const uv = new Float32Array(pos.count * 2)
  const minA = bb.min.getComponent(ax)
  const minB = bb.min.getComponent(ay)
  const sA = ext[ax] || 1
  const sB = ext[ay] || 1
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getComponent(i, ax) - minA) / sA
    uv[i * 2 + 1] = (pos.getComponent(i, ay) - minB) / sB
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

function drawScreen(ctx, t) {
  const W = SCREEN_W, H = SCREEN_H
  ctx.clearRect(0, 0, W, H)

  // ignition: a warm core flashes, expands, then fades into the glass
  const core = ease(Math.min(1, Math.max(0, (t - 0.05) / 0.5)))
  if (core > 0) {
    const b = 0.85 * core * Math.max(0, 1 - Math.max(0, t - 0.55) / 0.4)
    const r = 6 + core * H * 0.55
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r)
    g.addColorStop(0, `rgb(${Math.round(255 * b)},${Math.round(235 * b)},${Math.round(180 * b)})`)
    g.addColorStop(1, 'rgb(0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // the screen fills to a warm dark glass
  const fill = ease(Math.min(1, Math.max(0, (t - 0.45) / 0.7)))
  if (fill > 0) {
    const b = 0.5 * fill
    ctx.fillStyle = `rgb(${Math.round(50 * b)},${Math.round(34 * b)},${Math.round(16 * b)})`
    ctx.fillRect(0, 0, W, H)
  }

  // scanlines shimmer faintly once alive
  const alive = ease(Math.min(1, Math.max(0, (t - 0.2) / 2.2)))
  if (alive > 0) {
    for (let y = 2; y < H; y += 6) {
      const b = (0.05 + 0.09 * Math.abs(Math.sin(t * 30 + y))) * alive
      ctx.fillStyle = warm(b)
      ctx.fillRect(0, y, W, 1)
    }
  }

  // a thin progress bar grows across, then lingers
  const p = ease(Math.min(1, Math.max(0, (t - 0.9) / 1.1)))
  if (p > 0) {
    const bx = W * 0.16, bw = W * 0.68, by = H * 0.78
    ctx.fillStyle = warm(0.28)
    ctx.fillRect(bx, by, bw, 2)
    ctx.fillStyle = warm(1)
    ctx.fillRect(bx, by, bw * p, 2)
    ctx.fillStyle = 'rgb(255,232,180)'
    ctx.fillRect(bx + bw * p - 1, by - 1, 2, 4)
  }

  // idle: a dim warm breathing glow keeps the on-screen alive
  const idle = Math.max(0.04, 0.1 + 0.03 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 5.4))
  if (t > 0.6) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 3, W / 2, H / 2, H * 0.72)
    g.addColorStop(0, `rgb(${Math.round(255 * idle)},${Math.round(215 * idle)},${Math.round(150 * idle)})`)
    g.addColorStop(1, 'rgb(0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
}

function Statue() {
  const { scene } = useGLTF(MODEL_URL)
  const screen = useRef(null)
  const draw = useRef(null)
  const poweredOn = useRef(false)
  const bootT = useRef(0)

  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      if (o.material?.name === SCREEN_MAT) {
        screen.current = o
        draw.current = makeScreen()
        const mat = o.material.clone()
        mat.emissive.copy(SCREEN_COLOR)
        mat.emissiveMap = draw.current.tex
        mat.emissiveIntensity = 0.55
        o.material = mat
        o.geometry = o.geometry.clone()
        fitScreenUVs(o.geometry)
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    const mesh = screen.current
    if (!mesh) return

    // Armed once the scene has settled; fires on the first real look at the front.
    if (!poweredOn.current) {
      if (state.clock.elapsedTime < 2) return
      mesh.getWorldPosition(_p)
      _d.subVectors(state.camera.position, _p).normalize()
      mesh.getWorldDirection(_f)
      if (_d.dot(_f) < 0.5) return
      poweredOn.current = true
    }

    bootT.current += delta
    drawScreen(draw.current.ctx, bootT.current)
    draw.current.tex.needsUpdate = true
  })

  return (
    <group>
      {/* wide plinth (floor top is y=0) */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 1.0, 64]} />
        <meshStandardMaterial color="#c6bdb0" roughness={0.45} metalness={0.06} />
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
      <meshLambertMaterial color="#a8a29b" />
    </mesh>
  )
}

export default function LaptopStatue() {
  return (
    <Canvas
      shadows
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      camera={{ position: isMobile ? [6.3, 2.5, 4.1] : [5.1, 2.05, 3.3], fov: isMobile ? 42 : 38 }}
      dpr={DPR}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <Sky />
      <hemisphereLight args={['#ffffff', '#8d8d8d', 0.25]} />
      {/* Low warm fill from the viewer's side so the case and keys read. */}
      <directionalLight position={[4.5, 3.2, 5.5]} intensity={0.6} color="#ffe9b0" />

      <Suspense fallback={null}>
        <Statue />
      </Suspense>
      <Spotlight />
      <Beam />
      <Floor />
      <Grain />

      <OrbitControls
        target={[0, 0.95, 0]}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
