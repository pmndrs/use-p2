import { useBox, useCircle, useRevoluteConstraint } from '@react-three/p2'
import React from 'react'

export const RevoluteJoint = () => {
  const [refA] = useCircle(() => ({
    args: [0.5],
    mass: 0,
    position: [0, 5],
  }))

  const [refB] = useBox(() => ({
    args: [2, 1],
    mass: 1,
    position: [0, 3],
    velocity: [20, 0],
  }))

  useRevoluteConstraint(refA, refB, {
    collideConnected: false,
    worldPivot: [0, 5],
  })

  return (
    <>
      <mesh ref={refA}>
        <sphereBufferGeometry args={[0.5]} />
        <meshNormalMaterial />
      </mesh>
      <mesh ref={refB}>
        <boxBufferGeometry args={[2, 1]} />
        <meshNormalMaterial />
      </mesh>
    </>
  )
}
