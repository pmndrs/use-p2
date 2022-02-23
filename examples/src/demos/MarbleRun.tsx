import { Canvas } from '@react-three/fiber'
import { Debug, Physics, useBox, useCircle } from '@react-three/p2'
import { vec2 } from 'p2-es'
import type { PropsWithChildren } from 'react'

type BoxProps = {
  angle: number
  args: [width: number, height: number]
  mass?: number
  position: [x: number, y: number]
}

function Box({ mass = 1, ...props }: BoxProps) {
  const [ref] = useBox(() => ({
    mass,
    ...props,
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={[props.args[0], props.args[1], 1]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Marble(props: PropsWithChildren<{ args: [radius: number], position: [x: number, y: number] }>) {
  const [ref] = useCircle(() => ({
    mass: 1,
    ...props,
  }))

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[props.args[0]]} />
      <meshNormalMaterial />
    </mesh>
  )
}

const dominoStart = [-1, 2]

const dominos = new Array(10)
  .fill([])
  .map((d, i) => vec2.fromValues(dominoStart[0] + 1.4 * i, dominoStart[1]))

export default () => (
  <Canvas shadows orthographic camera={{ far: 100, near: 1, position: [15, 10, 15], zoom: 35 }}>
    <color attach="background" args={['#171720']} />
    <fog attach="fog" args={['#171720', 20, 70]} />
    <ambientLight intensity={0.2} />
    <pointLight position={[-10, -10, -10]} color="red" intensity={1.5} />
    <axesHelper scale={10} />
    <gridHelper />
    <Physics normalIndex={2} gravity={[0, -20]}>
      <Debug normalIndex={2}>
        <Box position={[0, 8]} args={[10, 1]} angle={0.2} mass={0} />
        <Box position={[-7, 4]} args={[6, 1]} angle={-0.3} mass={0} />
        <Box position={[4, 0]} args={[16, 1]} angle={0} mass={0} />
        {dominos.map((d, i) => (
          <Box position={d} args={[0.3, 2]} angle={0} key={i} />
        ))}
        <Marble position={[4, 10]} args={[0.5]} />
      </Debug>
    </Physics>
  </Canvas>
)
