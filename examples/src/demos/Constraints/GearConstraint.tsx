import { useBox, useCircle, useGearConstraint, useParticle, useRevoluteConstraint } from '@react-three/p2'
import React from 'react'

export const GearJoint = () => {
  const [refA] = useParticle(() => ({
    mass: 0,
    position: [-7, 5],
  }))

  const [refB] = useCircle(() => ({
    args: [0.5],
    mass: 1,
    position: [-7, 4],
  }))

  const [refC] = useBox(() => ({
    args: [0.3, 2],
    mass: 1,
    position: [-7, 2],
    velocity: [100, 0],
  }))

  useRevoluteConstraint(refA, refB, {
    collideConnected: false,
    worldPivot: [-7, 5],
  })

  useRevoluteConstraint(refA, refC, {
    collideConnected: false,
    worldPivot: [-7, 5],
  })

  useGearConstraint(refB, refC, {
    collideConnected: false,
    ratio: 5,
  })

  return (
    <>
      <mesh ref={refB}>
        <sphereBufferGeometry args={[0.5]} />
        <meshNormalMaterial />
      </mesh>
      <mesh ref={refC}>
        <boxBufferGeometry args={[0.3, 2]} />
        <meshNormalMaterial />
      </mesh>
    </>
  )
}
