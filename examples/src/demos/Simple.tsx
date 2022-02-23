import { Canvas } from '@react-three/fiber'
import { Physics, useBox, useCircle } from '@react-three/p2'

function Box() {
  const [ref] = useBox(() => ({ position: [0, -2], type: 'Kinematic' }))
  return (
    <mesh ref={ref}>
      <boxGeometry />
    </mesh>
  )
}

function Ball() {
  const [ref] = useCircle(() => ({ mass: 1, position: [0, 2] }))
  return (
    <mesh ref={ref}>
      <sphereGeometry />
    </mesh>
  )
}

export default () => (
  <Canvas>
    <Physics normalIndex={2}>
      <Box />
      <Ball />
    </Physics>
  </Canvas>
)
