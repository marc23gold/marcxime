import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/* A rotating spotlight showcase: three sculptural pieces on plinths, swept
   by an orbiting warm spotlight whose volumetric beam and drifting dust
   read against the dark backdrop. Matches the site's cinematic palette. */

const CREAM = '#e9e4db'
const WARM = '#ffe9b0'
const Y_AXIS = new THREE.Vector3(0, 1, 0)

const SPOT_RADIUS = 3.0
const SPOT_HEIGHT = 3.4

/* Small pedestal a showpiece sits on. */
function Plinth({ position, children }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.44, 0.52, 0.36, 32]} />
        <meshStandardMaterial color="#d9d2c6" roughness={0.42} metalness={0.05} />
      </mesh>
      {children}
    </group>
  )
}

/* Self-rotating centrepiece: a torus knot on the central plinth. */
function Knot() {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 0.45
      ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.15
    }
  })
  return (
    <mesh ref={ref} position={[0, 0.78, 0]}>
      <torusKnotGeometry args={[0.46, 0.15, 200, 32]} />
      <meshStandardMaterial color={CREAM} roughness={0.22} metalness={0.35} />
    </mesh>
  )
}

/* A slowly turning icosahedron on the left plinth. */
function Icosa() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.4
  })
  return (
    <mesh ref={ref} position={[0, 0.55, 0]}>
      <icosahedronGeometry args={[0.36, 0]} />
      <meshStandardMaterial color="#d7d0c2" roughness={0.35} metalness={0.4} flatShading />
    </mesh>
  )
}

/* A cluster of small spheres on the right plinth. */
function Orb() {
  const ref = useRef()
  const pieces = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.4
        return {
          pos: [Math.cos(a) * 0.34, Math.sin(a * 3) * 0.18 + 0.5, Math.sin(a) * 0.28],
          r: 0.09 + Math.random() * 0.07,
          col: i % 3 === 0 ? WARM : CREAM,
        }
      }),
    [],
  )
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.5
  })
  return (
    <group ref={ref} position={[0, 0.02, 0]}>
      {pieces.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.r, 24, 24]} />
          <meshStandardMaterial color={p.col} roughness={0.25} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/* The three pieces arranged around the centre so the orbiting light reads
   them all. */
function Showcase() {
  return (
    <group>
      <Plinth position={[0, 0, 0]}>
        <Knot />
      </Plinth>
      <Plinth position={[-1.55, 0, 0.5]}>
        <Icosa />
      </Plinth>
      <Plinth position={[1.55, 0, 0.5]}>
        <Orb />
      </Plinth>
    </group>
  )
}

/* Orbiting spotlight. The lamp arm rotates as a normal R3F group (so the
   light's world position orbits and three keeps its transforms in sync). The
   spotlight uses its default target at the stage origin; the volumetric cone
   and dust are mirrored around the same centre each frame so the light reads
   in the air. */
function Carousel() {
  const arm = useRef()
  const cone = useRef()
  const dust = useRef()

  const centre = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const ang = t * 0.35
    if (arm.current) arm.current.rotation.y = ang

    if (cone.current) {
      const from = new THREE.Vector3(SPOT_RADIUS, SPOT_HEIGHT, 0).applyAxisAngle(Y_AXIS, ang)
      const dir = new THREE.Vector3().subVectors(centre, from)
      const len = dir.length()
      cone.current.position
        .copy(from)
        .add(centre)
        .multiplyScalar(0.5)
      cone.current.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize())
      cone.current.scale.set(1, len, 1)
      cone.current.material.opacity = 0.14 + Math.sin(t * 1.6) * 0.04
    }

    if (dust.current) {
      dust.current.rotation.y = t * 0.06
    }
  })

  const dustPoints = useMemo(() => {
    const count = 500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 0.4 + Math.random() * 2.0
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.4 + Math.random() * 1.8
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])

  return (
    <group>
      <group ref={arm}>
        <spotLight
          position={[SPOT_RADIUS, SPOT_HEIGHT, 0]}
          angle={0.55}
          penumbra={0.5}
          decay={2}
          distance={0}
          intensity={160}
          color={WARM}
        />
      </group>

      {/* volumetric beam cone */}
      <mesh ref={cone} position={[SPOT_RADIUS / 2, SPOT_HEIGHT / 2, 0]}>
        <coneGeometry args={[0.62, 1, 32, 1, true]} />
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* drifting dust */}
      <points ref={dust}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={WARM}
          size={0.018}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

/* A soft circular stage that catches light. */
function Stage() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <circleGeometry args={[5.2, 64]} />
      <meshStandardMaterial color="#141414" roughness={0.7} metalness={0.25} />
    </mesh>
  )
}

export default function SpotlightShowcase() {
  return (
    <Canvas
      camera={{ position: [0, 2.0, 5.4], fov: 44 }}
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <ambientLight intensity={0.32} color="#8fa3c4" />
      <directionalLight position={[4, 6, 3]} intensity={0.55} color="#cfd8ff" />
      <directionalLight position={[-3, 2, -3]} intensity={0.2} color="#3a4a6b" />

      <Showcase />
      <Carousel />
      <Stage />

      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={9}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
      />
    </Canvas>
  )
}
