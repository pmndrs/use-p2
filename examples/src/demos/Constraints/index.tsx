import type { FC } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox, OrbitControls } from '@react-three/drei'
import { Debug, Physics, useCircle, usePlane } from '@react-three/p2'
import { DistanceHandle, DistanceChain } from './DistanceConstraint'
import { LockHandle, LockChain } from './LockConstraint'
import { RevoluteJoint } from './RevoluteConstraint'
import { GearJoint } from './GearConstraint'

const normalIndex = 2

function Ground() {
  usePlane(() => ({ angle: 0, mass: 0 }))

  return <RoundedBox radius={0.125} args={[30, 1, 10]} position-y={-0.5}></RoundedBox>
}

const PointerHandle: FC = () => {
  const position: [x: number, y: number] = [0, 0]

  const [ref, api] = useCircle(() => ({
    args: [1],
    position,
    type: 'Kinematic',
  }))

  useFrame(({ mouse: { x, y }, viewport: { height, width } }) => {
    api.position.set((x * width) / 2, (y * height) / 2)
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[1]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

const Scene = () => {
  return (
    <>
      <Canvas shadows camera={{ position: [0, 5, 40], fov: 24 }}>
        <color attach="background" args={['#171720']} />
        <ambientLight intensity={0.1} />
        <spotLight
          position={[10, 10, -50]}
          angle={0.75}
          intensity={0.5}
          lookAt={() => [0, 0, 0]}
          castShadow
          penumbra={1}
        />
        <OrbitControls enabled={false} />
        <Physics gravity={[0, -20]} normalIndex={normalIndex}>
          <Debug normalIndex={normalIndex}>
            <Ground />
            <DistanceHandle position={[5, 5]}>
              <DistanceChain length={10} />
            </DistanceHandle>

            <LockHandle position={[10, 5]}>
              <LockChain length={10} />
            </LockHandle>
            <RevoluteJoint />
            <GearJoint />
            <PointerHandle />
          </Debug>
        </Physics>
      </Canvas>
    </>
  )
}

export default Scene
