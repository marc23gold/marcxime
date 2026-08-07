import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Bust } from './StatueScene'

/* A single classical bust under a tall, colorful spotlight that slowly cycles
   hue, shining down on the statue and the floor. The scene reuses the marble
   bust geometry from StatueScene.jsx, wrapped in a slow auto-rotate. */

const WARM = '#ffe9b0'
const COOL = '#8fa3c4'

/* Slow rotation so the whole bust is admired. */
function Rig() {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0015
  })
  return (
    <group ref={ref}>
      <Bust />
    </group>
  )
}

/* Hue-cycling colored spotlight. Uses a real three.js SpotLight (angle /
   penumbra / decay in physical candela units) shining straight down from
   above the statue onto the bust and the floor. */
function Spotlight() {
  const light = useRef()

  useFrame((state) => {
    if (!light.current) return
    const t = state.clock.elapsedTime
    // slowly sweep a pleasant warm -> cool spectrum
    light.current.color.setHSL((t * 0.045) % 1, 0.85, 0.5)
  })

  return (
    <spotLight
      ref={light}
      position={[0, 4.4, 0]}
      angle={0.6}
      penumbra={0.55}
      decay={2}
      distance={0}
      intensity={260}
      color={WARM}
    />
  )
}

/* Volumetric beam: an open, tapered cone hanging from the light down toward
   the bust, plus drifting dust so the shaft of light reads. */
function Beam() {
  const cone = useRef()
  const dust = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (cone.current) {
      cone.current.material.opacity = 0.13 + Math.sin(t * 1.4) * 0.04
    }
    if (dust.current) {
      dust.current.rotation.y = t * 0.04
    }
  })

  const dustPoints = useMemo(() => {
    const count = 450
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 0.25 + Math.random() * 0.85
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 2.0 + Math.random() * 2.1
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])

  return (
    <group>
      {/* beam cone: apex at the light (y 4.4), opening down to just above the bust */}
      <mesh ref={cone} position={[0, 3.4, 0]}>
        <coneGeometry args={[1.05, 2.0, 32, 1, true]} />
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* drifting dust inside the shaft */}
      <points ref={dust} position={[0, 3.0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={WARM}
          size={0.02}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

/* Dark circular stage receiving the spotlight. */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[7, 64]} />
      <meshStandardMaterial color="#131315" roughness={0.85} metalness={0.1} />
    </mesh>
  )
}

export default function MarbleSpotlight() {
  return (
    <Canvas
      camera={{ position: [0, 2.2, 5.6], fov: 44 }}
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <ambientLight intensity={0.32} color={COOL} />
      <directionalLight position={[4, 6, 3]} intensity={0.5} color="#cfd8ff" />

      <Rig />
      <Spotlight />
      <Beam />
      <Floor />

      <OrbitControls
        target={[0, 1.4, 0]}
        enablePan={false}
        minDistance={3.2}
        maxDistance={9}
        minPolarAngle={0.25}
        maxPolarAngle={1.5}
      />
    </Canvas>
  )
}
