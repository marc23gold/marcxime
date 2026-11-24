import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { DPR, SHADOW_MAP, DUST_COUNT, isMobile } from './mobile'
import Grain from './Grain'
import Ground from './Ground'
import Sky from './Sky'

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

/* Dust that drifts on its own eddy rather than as one rigid carousel: each mote
   is displaced in the vertex shader, a third of them travel visibly, and they
   brighten as the orbiting beam crosses their side of the statue. Sizes read
   against depth, so near motes open into soft bokeh. */
const DUST_VERT = `
  attribute float aSeed;
  attribute float aSize;
  attribute float aHero;

  uniform float uTime;
  uniform vec3 uLight;
  uniform float uScale;

  varying float vBright;

  void main() {
    vec3 p = position;
    float t = uTime;
    float s = aSeed * 6.2831853;
    float amp = mix(0.035, 0.2, aHero);

    p.x += amp * (sin(t * 0.31 + s * 1.7) + 0.6 * sin(t * 0.73 + s * 4.1));
    p.y += amp * (0.8 * sin(t * 0.27 + s * 2.3) + 0.4 * sin(t * 0.61 + s * 5.7));
    p.z += amp * (cos(t * 0.23 + s * 3.1) + 0.6 * cos(t * 0.67 + s * 6.3));

    vec2 dir = normalize(p.xz + vec2(0.0001));
    vec2 ldir = normalize(uLight.xz + vec2(0.0001));
    float lit = smoothstep(0.35, 1.0, dot(dir, ldir));
    vBright = 0.5 + 0.75 * lit;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  }
`

const DUST_FRAG = `
  uniform vec3 uColor;
  varying float vBright;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.06, d);
    gl_FragColor = vec4(uColor * (a * vBright), 1.0);
  }
`

function Beam() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uLight: { value: new THREE.Vector3(RADIUS, HEIGHT, 0) },
          uScale: { value: 450 },
          uColor: { value: new THREE.Color('#ffe9b0') },
        },
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  const geometry = useMemo(() => {
    const count = DUST_COUNT
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const sizes = new Float32Array(count)
    const heroes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 0.3 + Math.random() * 1.4
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.5 + Math.random() * 2.4
      positions[i * 3 + 2] = Math.sin(angle) * radius

      seeds[i] = Math.random()
      const hero = Math.random() < 0.33 ? 1 : 0
      heroes[i] = hero
      sizes[i] = (hero ? 0.032 : 0.018) + Math.random() * (hero ? 0.045 : 0.03)
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aHero', new THREE.BufferAttribute(heroes, 1))
    return g
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    material.uniforms.uTime.value = t
    material.uniforms.uLight.value.set(
      Math.cos(t * ORBIT_SPEED) * RADIUS,
      HEIGHT,
      Math.sin(t * ORBIT_SPEED) * RADIUS,
    )
    material.uniforms.uScale.value = state.size.height * state.gl.getPixelRatio() * 0.5
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* Dark circular floor that receives the spotlight's projected pool and the
   sweeping contact shadow. */
function Floor() {
  return <Ground />
}

export default function MarbleSpotlight() {
  return (
    <Canvas
      shadows
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      camera={{ position: isMobile ? [8.6, 4.7, 1.2] : [7, 4, 1], fov: isMobile ? 42 : 40 }}
      dpr={DPR}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <Sky />
      <hemisphereLight args={['#ffffff', '#8d8d8d', 0.25]} />
      {/* Low warm fill from the viewer's side: the pool stays the drama, the
          marble still reads. Without it the statue is a silhouette on desktop. */}
      <directionalLight position={[4.5, 3.2, 5.5]} intensity={0.6} color="#ffe9b0" />

      <Suspense fallback={null}>
        <Statue />
      </Suspense>
      <Spotlight />
      <Beam />
      <Floor />
      <Grain />

      <OrbitControls
        target={[0, 1.15, 0]}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
