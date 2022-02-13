import { useDistanceConstraint, useBox } from '@react-three/p2'
import React, { createContext, createRef, useContext } from 'react'
import type { Color } from 'three'
import { vec2 } from 'p2-es'
import type { FC } from 'react'
import type { BoxArgs } from '@react-three/p2'
import type { Object3D } from 'three'

type StaticHandleProps = {
  position: [x: number, y: number]
}

export const DistanceHandle: FC<StaticHandleProps> = ({ children, position }) => {
  const {
    position: [x, y],
    ref: parentRef,
  } = useContext(parent)

  const [ref] = useBox(() => ({
    args: [0.2, 0.2],
    position: position || [x, y],
    type: 'Static',
  }))

  useDistanceConstraint(parentRef, ref, {
    distance: 0.04,
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
}

const parent = createContext({
  position: [0, 0] as [x: number, y: number],
  ref: createRef<Object3D>(),
})

type ChainLinkProps = {
  args?: BoxArgs
  color?: Color | string
}

const ChainLink: FC<ChainLinkProps> = ({ args = [0.6, 0.2], children, color = 'white' }) => {
  const {
    position: [x, y],
    ref: parentRef,
  } = useContext(parent)

  const [width = 0.6, height = 0.2] = args
  const position: [x: number, y: number] = [x + width + 0.1, y]

  const [ref] = useBox(() => ({
    args,
    damping: 0.99,
    angularDamping: 0.99,
    mass: 0.3,
    position,
  }))

  useDistanceConstraint(parentRef, ref, {
    collideConnected: false,
    distance: 0.04,
    localAnchorA: vec2.fromValues(width / 2, height / 2),
    localAnchorB: vec2.fromValues(-width / 2, height / 2),
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

export const DistanceChain: FC<ChainProps> = ({ children, length }) => {
  return (
    <>
      {Array.from({ length }).reduce((acc: React.ReactNode) => {
        return <ChainLink color={'red'}>{acc}</ChainLink>
      }, children)}
    </>
  )
}
