import { useBox, useDistanceConstraint } from '@react-three/p2'
import { createContext, createRef, useContext } from 'react'
import type { Color } from 'three'
import { vec2 } from 'p2-es'
import type { FC } from 'react'
import type { BoxArgs } from '@react-three/p2'
import type { Object3D } from 'three'

type StaticHandleProps = {
  position: [x: number, y: number]
}

export const StaticHandle: FC<StaticHandleProps> = ({ children, position }) => {
  const {
    position: [x, y],
    ref: parentRef,
  } = useContext(parent)

  const [ref] = useBox(() => ({
    args: [0.2, 0.2],
    position: position || [x + 0.6, y],
    type: 'Static',
  }))

  useDistanceConstraint(parentRef, ref, {
    collideConnected: false,
    distance: 0.1,
    localAnchorA: vec2.fromValues(0.6 / 2, 0.2 / 2),
    localAnchorB: vec2.fromValues(-0.6 / 2, 0.2 / 2),
  })

  return (
    <group>
      <mesh ref={ref}>
        <boxBufferGeometry args={[0.2, 0.2]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ position, ref }}>{children}</parent.Provider>
    </group>
  )
}

type ChainProps = {
  length: number
  maxMultiplier?: number
}

const parent = createContext({
  position: [0, 0] as [x: number, y: number],
  ref: createRef<Object3D>(),
})

type ChainLinkProps = {
  args?: BoxArgs
  color?: Color | string
  maxMultiplier?: number
}

const ChainLink: FC<ChainLinkProps> = ({ args = [0.6, 0.2], children, color = 'white' }) => {
  const {
    position: [x, y],
    ref: parentRef,
  } = useContext(parent)

  const [width = 0.6] = args
  const position: [x: number, y: number] = [x + width, y]

  const [ref] = useBox(() => ({
    args,
    damping: 0.99,
    //angularDamping: 0.99,
    mass: 0.3,
    position,
  }))

  useDistanceConstraint(parentRef, ref, {
    collideConnected: false,
    distance: 0.1,
    localAnchorA: vec2.fromValues(0.6 / 2, 0.2 / 2),
    localAnchorB: vec2.fromValues(-0.6 / 2, 0.2 / 2),
  })

  return (
    <>
      <mesh ref={ref}>
        <boxBufferGeometry args={args} />
        <meshStandardMaterial color={color} />
      </mesh>
      <parent.Provider value={{ position, ref }}>{children}</parent.Provider>
    </>
  )
}

export const Chain: FC<ChainProps> = ({ children, length }) => {
  return (
    <>
      {Array.from({ length }).reduce((acc: React.ReactNode = <StaticHandle />) => {
        return <ChainLink color={'red'}>{acc}</ChainLink>
      }, children)}
    </>
  )
}
