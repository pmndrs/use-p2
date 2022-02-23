import { Canvas } from '@react-three/fiber'
import { Debug, Physics, useBox, useCircle, usePlane } from '@react-three/p2'
import { useState } from 'react'

function Box() {
  const [color, setColor] = useState(0xff0000)

  const [ref] = useBox(() => ({
    args: [3, 1],
    isTrigger: true,
    mass: 0,
    onCollideBegin: (e) => {
      console.log('onCollideBegin BoxTrigger', e)
      setColor(0x00ff00)
    },
    onCollideEnd: (e) => {
      console.log('onCollideEnd BoxTrigger', e)
      setColor(0x0000ff)
    },
    position: [0, 3],
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={[3, 1, 1]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function Ball() {
  const [ref] = useCircle(() => ({ args: [0.5], mass: 1, position: [0, 5] }))
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Ground() {
  const [ref] = usePlane(() => ({ mass: 0, position: [0, 0] }))
  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 2]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

export default () => (
  <Canvas camera={{ position: [0, 5, 10] }}>
    <Physics normalIndex={2}>
      <Debug normalIndex={2}>
        <Ball />
        <Box />
        <Ground />
      </Debug>
    </Physics>
  </Canvas>
)
