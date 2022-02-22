import 'joypad.js'

import { Canvas } from '@react-three/fiber'
import { Debug, Physics, useBox } from '@react-three/p2'

import Platform from './Platform'
import Player from './Player'

export const SCENERY_GROUP = Math.pow(2, 1)
export const PLAYER_GROUP = Math.pow(2, 2)

const MeshBox = ({
  args,
  position,
  angle,
}: {
  args: [width: number, height: number, depth: number]
  position: [x: number, y: number, z: number]
  angle?: number
}) => {
  return (
    <mesh position={position} rotation-x={angle}>
      <boxGeometry args={args} />
      <meshBasicMaterial color={0x284761} />
    </mesh>
  )
}

function Box({
  args,
  position,
  angle,
}: {
  args: [width: number, height: number]
  position: [x: number, y: number]
  angle?: number
}) {
  const [ref] = useBox(() => ({
    args,
    position,
    angle,
    mass: 0,
    collisionGroup: SCENERY_GROUP,
  }))
  return (
    <mesh ref={ref}>
      <boxGeometry args={[...args, 3]} />
      <meshNormalMaterial />
    </mesh>
  )
}

export default () => (
  <Canvas orthographic camera={{ position: [0, 0, 0], zoom: 50 }}>
    <MeshBox args={[10, 30, 3]} position={[2, 3, -5]} />
    <MeshBox args={[13, 8, 22]} position={[-12, 4, -15]} />
    <MeshBox args={[18, 14, 8]} position={[22, 0, -8]} />
    <Physics normalIndex={2}>
      <Debug normalIndex={2} linewidth={0.001}>
        <Player position={[-7, 14]} />
        <Box args={[1, 5]} position={[-2, 3]} />
        <Box args={[8, 1]} position={[-15, 5]} />
        <Box args={[16, 1]} position={[-4, 0]} />
        <Box args={[40, 1]} position={[0, -5]} />
        <Box args={[1, 6]} position={[2, 8]} />
        <Box args={[3, 3]} position={[-3, 9]} />
        <Box args={[3, 3]} position={[-3, 9]} />
        <Box args={[1, 10]} position={[14, 8]} angle={-Math.PI / 4} />
        <Platform
          args={[4, 3]}
          position={[-8, 8]}
          localWaypoints={[
            [0, 0],
            [5, 10],
          ]}
        />
        <Platform
          args={[3, 1]}
          position={[6, 9]}
          localWaypoints={[
            [0, 0],
            [4, 0],
          ]}
        />
      </Debug>
    </Physics>
  </Canvas>
)
