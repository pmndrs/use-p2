import { animated, config, useSpring } from '@react-spring/three'
import { useFrame, useThree } from '@react-three/fiber'
import { useBox, useKinematicCharacterController } from '@react-three/p2'
import { useEffect, useRef, useState } from 'react'
import type { Object3D } from 'three'
import type { LineSegments } from 'three'
import * as THREE from 'three'

import { useControls } from '../hooks'
import { PLAYER_GROUP, SCENERY_GROUP } from './'

/**
 * @class KinematicCharacterController
 * @extends {Controller}
 * @constructor
 * @param {object} [options]
 * Trägheit in Luft und Boden
 * @param {number} [options.accelerationTimeAirborne=0.2]
 * @param {number} [options.accelerationTimeGrounded=0.1]
 * How fast you move
 * @param {number} [options.moveSpeed=6]
 * How fast you slide down
 * @param {number} [options.wallSlideSpeedMax=3]
 * @param {number} [options.wallStickTime=0.25]
 *
 * @param {array} [options.wallJumpClimb]
 * @param {array} [options.wallJumpOff]
 * @param {array} [options.wallLeap]
 * @param {number} [options.timeToJumpApex=0.4]
 * @param {number} [options.maxJumpHeight=4]
 * @param {number} [options.minJumpHeight=1]
 * @param {number} [options.velocityXSmoothing=0.2]
 * @param {number} [options.velocityXMin=0.0001]
 * @param {number} [options.maxClimbAngle]
 * @param {number} [options.maxDescendAngle]
 * @param {number} [options.collisionMask=-1]
 * @param {number} [options.skinWidth=0.015]
 * @param {number} [options.horizontalRayCount=4]
 * @param {number} [options.verticalRayCount=4]
 */

declare global {
  interface Window {
    joypad: any
  }
}

export default (props: { position: [x: number, y: number] }) => {
  const { camera } = useThree()

  const body = useRef<Object3D>(null)

  const controls = useControls()

  const bodyPosition = useRef<[x: number, y: number]>()
  const raysRef = useRef<LineSegments>()
  const rayData = useRef([])

  const [, bodyApi] = useBox(
    () => ({
      mass: 0,
      position: props.position,
      fixedRotation: true,
      damping: 0,
      type: 'Kinematic',
      collisionGroup: PLAYER_GROUP,
    }),
    body,
  )

  const [, controllerApi] = useKinematicCharacterController(() => ({
    body,
    collisionMask: SCENERY_GROUP,
    velocityXSmoothing: 0.0001,
  }))

  const collisions = useRef<{ below: boolean }>({ below: false })

  const [yImpulse, setYImpulse] = useState(0)

  const springs = useSpring({
    from: {
      scaleY: yImpulse,
      scaleX: 1 + (1 - yImpulse) / 2,
      positionY: yImpulse > 1 ? (yImpulse - 1) / 1.5 : yImpulse - 1,
    },
    to: { scaleY: 1, scaleX: 1, positionY: 0 },
    config: config.wobbly,
    reset: true,
  })

  useEffect(() => {
    window.joypad.set({
      axisMovementThreshold: 0.3,
    })

    controllerApi.raysData.subscribe((e) => {
      rayData.current = e
    })

    controllerApi.collisions.subscribe((e: { below: boolean }) => {
      //console.log(e);
      if (e.below !== collisions.current.below && !e.below) setYImpulse(1.2) // jumped
      if (e.below !== collisions.current.below && e.below) setYImpulse(0.8) // landed

      collisions.current = e
    })

    bodyApi.position.subscribe((p) => {
      bodyPosition.current = p

      camera.position.lerp({ x: p[0], y: p[1], z: 100 } as THREE.Vector3, 0.1)

      camera.lookAt(p[0], p[1], 0)
    })
  }, [])

  useFrame(() => {
    const { brake, left, right } = controls.current

    controllerApi.setJump(brake)

    controllerApi.setInput([~~right - ~~left, 0])

    if (!Object.entries(window.joypad.instances).length) return

    const gamepad = window.joypad.instances[0]

    controllerApi.setJump(gamepad.buttons[0].pressed)

    controllerApi.setInput([gamepad.axes[0], 0])

    return

    // Debug rays

    const points =
      rayData.current &&
      rayData.current.map((ray: [from: [x: number, y: number], to: [x: number, y: number]]) => [
        new THREE.Vector3(...ray[0], 0),
        new THREE.Vector3(...ray[1], 0),
      ])

    if (raysRef.current && points) {
      raysRef.current!.geometry.setFromPoints(points.flat(1))
      raysRef.current!.geometry.computeBoundingSphere()
    }
  })

  return (
    <group ref={body}>
      <animated.mesh scale-y={springs.scaleY} scale-x={springs.scaleX} position-y={springs.positionY}>
        <boxBufferGeometry args={[1, 1]} />
        <meshNormalMaterial />
      </animated.mesh>
    </group>
  )

  // Debug rays

  return (
    <lineSegments ref={raysRef}>
      <bufferGeometry />
      <lineBasicMaterial color={'#ff0000'} />
    </lineSegments>
  )
}
