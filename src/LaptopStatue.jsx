import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DPR, SHADOW_MAP, DUST_COUNT, isMobile } from './mobile'
import Grain from './Grain'
import Ground from './Ground'
import Sky from './Sky'

/* A classic laptop (glTF, own PBR materials) seated on a plinth and lit by the
   same orbiting, colorful, texture-projected spotlight as the other pieces.
   Replaces the hands on the random-statue branch. */

const MODEL_URL = '/models/classic_laptop/classic_laptop.gltf'

const RADIUS = 3.5
const ORBIT_SPEED = 0.35 // slower, more cinematic sweep
const HEIGHT = 5

/* Screen power-on: the glTF screen material starts near-black (off). The first
   time the camera looks at the screen front, a green CRT boots — a line becomes
   a raster, the BIOS prints, then the work's line is typed and a cursor blinks.
   The canvas feeds the material's emissiveMap; RGB encodes brightness. */
const SCREEN_MAT = 'classic_laptop_screen'
const SCREEN_COLOR = new THREE.Color('#e9fff2')
const SCREEN_INTENSITY = 1.15

const ease = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.min(1, Math.max(0, x))

const SCREEN_W = 512
const SCREEN_H = 320

/* Sage phosphor: a desaturated green that sits inside the film's warm palette. */
const CRT_BG = '#04110a'
const CRT_DIM = 'rgba(190,245,205,0.92)'
const CRT_HOT = '#e4ffea'
const CRT_GLOW = 'rgba(130,235,170,0.85)'
const CRT_FONT = '26px "SF Mono", Menlo, Consolas, monospace'
const CRT_LH = 34
const CHAR_W = 15.6

const BOOT_LINES = [
  [1.0, 'MARXIME BIOS v2.11'],
  [1.3, '80386SX / 16 MHz'],
  [1.55, 'MEMORY TEST: 640K OK'],
  [1.85, 'IDE 0: PAPER   IDE 1: NONE'],
  [2.15, 'BOOTING FROM PAPER...'],
]
const DIR_CMD_T = 2.7
const DIR_STARTS = [3.15, 3.37, 3.82]
const DIR_LINES = [
  'WINGED.VIC    1989   198K',
  'LAPTOP.EXE    2026   640K',
  'ABSENCE.TXT   2026     0K',
]
const DIR_FONT = '20px "SF Mono", Menlo, Consolas, monospace'
const DIR_CW = 12

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
  const W = SCREEN_W
  const H = SCREEN_H
  ctx.clearRect(0, 0, W, H)

  // phosphor background: near-black green with a soft centre glow
  ctx.fillStyle = CRT_BG
  ctx.fillRect(0, 0, W, H)
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 12, W / 2, H * 0.45, H * 0.9)
  bg.addColorStop(0, 'rgba(70,170,100,0.10)')
  bg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // ignition: a bright line opens sideways, then expands into the raster
  if (t < 0.95) {
    const w = W * ease(clamp01((t - 0.05) / 0.5))
    const h = 2 + (H - 2) * ease(clamp01((t - 0.45) / 0.5))
    const b = 0.95 - 0.25 * ease(clamp01((t - 0.45) / 0.5))
    ctx.save()
    ctx.shadowColor = 'rgba(180,255,210,0.95)'
    ctx.shadowBlur = 16
    ctx.fillStyle = `rgba(214,255,226,${b})`
    ctx.fillRect((W - w) / 2, (H - h) / 2, w, h)
    ctx.restore()
    drawRaster(ctx, t)
    return
  }

  // content sits on a slightly unstable vertical hold
  const jy = 1.6 * Math.sin(t * 11.3) + 1.1 * Math.sin(t * 23.7 + 1.2)
  ctx.save()
  ctx.translate(0, jy)
  ctx.font = CRT_FONT

  // BIOS header, printed character by character
  let y = 40
  for (const [start, text] of BOOT_LINES) {
    const n = Math.floor((t - start) / 0.012)
    if (n > 0) {
      ctx.fillStyle = CRT_DIM
      ctx.shadowColor = CRT_GLOW
      ctx.shadowBlur = 4
      ctx.fillText(text.slice(0, n), 28, y)
      ctx.shadowBlur = 0
    }
    y += CRT_LH
  }

  // prompt, a typed command, and a listing with a file that shouldn't exist
  if (t > 2.5) {
    ctx.font = CRT_FONT
    ctx.fillStyle = CRT_HOT
    ctx.shadowColor = CRT_GLOW
    ctx.shadowBlur = 6
    ctx.fillText('C:\\>', 28, y + 6)
    ctx.shadowBlur = 0

    const cmd = 'dir'
    const typed = Math.min(cmd.length, Math.floor((t - DIR_CMD_T) / 0.09))
    if (typed > 0) {
      ctx.fillStyle = CRT_HOT
      ctx.shadowColor = CRT_GLOW
      ctx.shadowBlur = 6
      ctx.fillText(cmd.slice(0, typed), 28 + 4 * CHAR_W, y + 6)
      ctx.shadowBlur = 0
    }

    if (t > DIR_STARTS[0]) {
      ctx.font = DIR_FONT
      const count = DIR_STARTS.filter((s) => t > s).length
      for (let i = 0; i < count; i++) {
        const stinger = i === DIR_LINES.length - 1
        ctx.fillStyle = stinger ? CRT_HOT : CRT_DIM
        ctx.shadowColor = CRT_GLOW
        ctx.shadowBlur = stinger ? 7 : 3
        ctx.fillText(DIR_LINES[i], 28, y + 36 + i * 22)
        ctx.shadowBlur = 0
      }

      // no prompt returns: the cursor stops at the end of the listing
      if (count === DIR_LINES.length && Math.floor(t * 3) % 2 === 0) {
        const last = DIR_LINES[DIR_LINES.length - 1]
        ctx.fillStyle = 'rgba(220,255,228,0.92)'
        ctx.fillRect(28 + last.length * DIR_CW + 2, y + 36 + 2 * 22 - 18, DIR_CW, 20)
      }
    }
  }

  // boot progress bar, fading once the boot hands over to the listing
  const bp = clamp01((t - 0.95) / 1.9)
  if (bp > 0) {
    const fade = t > 3.0 ? clamp01(1 - (t - 3.0) / 0.6) : 1
    const bx = 28
    const bw = W - 56
    const by = H - 10
    ctx.globalAlpha = fade
    ctx.fillStyle = 'rgba(120,200,150,0.25)'
    ctx.fillRect(bx, by, bw, 4)
    ctx.fillStyle = 'rgba(170,240,190,0.9)'
    ctx.fillRect(bx, by, bw * ease(bp), 4)
    ctx.globalAlpha = 1
  }

  ctx.restore()

  // ignition flash
  const fl = 1 - clamp01((t - 0.95) / 0.4)
  if (fl > 0) {
    ctx.fillStyle = `rgba(200,255,220,${0.3 * fl})`
    ctx.fillRect(0, 0, W, H)
  }

  drawRaster(ctx, t)
}

/* scanlines, a slow rolling refresh band, and a vignette */
function drawRaster(ctx, t) {
  const W = SCREEN_W
  const H = SCREEN_H

  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0, y, W, 1)
  }

  const ry = ((t * 36) % (H + 200)) - 100
  const band = ctx.createLinearGradient(0, ry, 0, ry + 90)
  band.addColorStop(0, 'rgba(160,255,190,0)')
  band.addColorStop(0.45, 'rgba(160,255,190,0.045)')
  band.addColorStop(1, 'rgba(160,255,190,0)')
  ctx.fillStyle = band
  ctx.fillRect(0, ry, W, 90)

  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

function Statue() {
  const { scene } = useGLTF(MODEL_URL)
  const screen = useRef(null)
  const draw = useRef(null)
  const spill = useRef(null)
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
        mat.emissiveIntensity = SCREEN_INTENSITY
        o.material = mat
        o.geometry = o.geometry.clone()
        fitScreenUVs(o.geometry)

        // the phosphor spills a little green onto the keyboard and bezel
        if (!o.userData.screenLight) {
          const light = new THREE.PointLight('#9fe3ae', 0, 3.4, 2)
          light.position.set(0, -0.2, 0.1)
          o.add(light)
          o.userData.screenLight = light
        }
        spill.current = o.userData.screenLight
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    const mesh = screen.current
    if (!mesh) return

    // The camera is static, so the screen boots once the scene has settled.
    if (!poweredOn.current) {
      if (state.clock.elapsedTime < 1.8) return
      poweredOn.current = true
    }

    bootT.current += delta
    drawScreen(draw.current.ctx, bootT.current)
    draw.current.tex.needsUpdate = true

    // the spill fades up with the boot and stays while the screen is lit
    if (spill.current) {
      const target = poweredOn.current ? 1.1 : 0
      spill.current.intensity += (target - spill.current.intensity) * Math.min(1, delta * 2)
    }
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
  return <Ground />
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
