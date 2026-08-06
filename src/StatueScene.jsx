import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/* A self-contained classical bust: head + shoulders on a plinth, lit by a
   warm ceiling light, with a soft volumetric beam shining down on it. */

function Marble({ children, ...props }) {
  return (
    <meshStandardMaterial
      color="#e9e4db"
      roughness={0.32}
      metalness={0.06}
      {...props}
    />
  )
}

function Bust() {
  return (
    <group>
      {/* plinth */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.0]} />
        <Marble />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.0, 0.15, 0.7]} />
        <Marble color="#d9d2c6" />
      </mesh>
      {/* shoulders / chest block */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.52, 0.6, 24]} />
        <Marble />
      </mesh>
      {/* neck */}
      <mesh position={[0, 1.56, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.28, 20]} />
        <Marble />
      </mesh>
      {/* head */}
      <group position={[0, 1.95, 0]}>
        <mesh castShadow scale={[1, 1.16, 1]}>
          <sphereGeometry args={[0.34, 40, 32]} />
          <Marble />
        </mesh>
        {/* nose */}
        <mesh position={[0, -0.06, 0.33]} castShadow>
          <coneGeometry args={[0.055, 0.2, 12]} />
          <Marble />
        </mesh>
      </group>
    </group>
  )
}

/* Slow automatic rotation so the whole statue is admired. Must live inside
   the Canvas (useFrame requires the R3F store). */
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

/* Volumetric light beam: an upward-tapering translucent cone reaching from
   the lamp down to the statue, plus drifting dust so the beam reads. */
function Beam() {
  const cone = useRef()
  const dust = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (cone.current) {
      cone.current.material.opacity = 0.16 + Math.sin(t * 1.4) * 0.05
    }
    if (dust.current) {
      dust.current.rotation.y = t * 0.02
    }
  })

  const dustPoints = useMemo(() => {
    const count = 600
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 0.25 + Math.random() * 0.5
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 1.2 + Math.random() * 1.0
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])

  return (
    <group>
      {/* beam conic mesh */}
      <mesh ref={cone} position={[0, 2.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.55, 1.5, 32, 1, true]} />
        <meshBasicMaterial
          color="#fff3cf"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* glowing lamp housing */}
      <mesh position={[0, 3.35, 0]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#fff2c0" />
      </mesh>
      <pointLight position={[0, 3.3, 0]} intensity={40} color="#ffe9b0" distance={6} />
      {/* dust motes */}
      <points ref={dust} position={[0, 2.0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffe9b0"
          size={0.02}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#141414" roughness={0.9} metalness={0.1} />
    </mesh>
  )
}

export default function StatueScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.1, 5.4], fov: 45 }}
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0b0b0d']} />
      <ambientLight intensity={0.25} color="#8fa3c4" />
      <directionalLight position={[4, 6, 3]} intensity={0.6} color="#cfd8ff" />
      <pointLight position={[0, 1.4, 2.2]} intensity={3} color="#ffffff" />

      <Rig />
      <Beam />
      <Floor />

      <OrbitControls
        enablePan={false}
        minDistance={2.6}
        maxDistance={9}
        minPolarAngle={0.3}
        maxPolarAngle={1.5}
      />
    </Canvas>
  )
}
