import React, {useRef} from 'react'
import {useBox, useTopDownVehicle} from '@react-three/p2'
import {useFrame, useThree} from '@react-three/fiber'
import {useControls} from '../hooks'
import {vec2} from 'p2-es'
import type {Object3D} from 'three'
import * as THREE from 'three'
import Chassis from './Chassis'

export default function Vehicle({
                                    maxBrake = 50,
                                    steer = 0.35,
                                    force = 10,
                                }) {

    const controls = useControls()

    const {camera} = useThree()

    const chassisBody = useRef<Object3D>(null)

    const wheelInfo1 = {
        localPosition: vec2.fromValues(0, 0.7),
        sideFriction: 20,
    }
    const wheelInfo2 = {
        localPosition: vec2.fromValues(0, -0.7),
        sideFriction: 20,
    }

    const [, chassisApi] = useBox(
        () => ({
            args: [0.8, 1.6],
            mass: 3,
            angle: Math.PI,
        }),
        chassisBody
    )

    // stick the camera to vehicle position

    const positionHelper = useRef(vec2.create())

    const targetHelper = useRef(new THREE.Vector3())

    const angle = useRef(0)

    chassisApi.angle.subscribe(a => angle.current = a)

    chassisApi.position.subscribe(p => {

        vec2.rotate(positionHelper.current, [0, -10], angle.current)

        vec2.add(positionHelper.current, p, positionHelper.current)

        camera.position.lerp({x: positionHelper.current[0], y: 10, z: positionHelper.current[1]} as THREE.Vector3, 0.025)

        targetHelper.current.lerp({x: p[0], y: 0.5, z: p[1]} as THREE.Vector3, 0.075)

        camera.lookAt(targetHelper.current)

    })

    const [vehicle, vehicleApi] = useTopDownVehicle(() => ({
        chassisBody,
        wheelInfos: [wheelInfo1, wheelInfo2],
    }))

    // control the truck

    useFrame(() => {

        const {forward, backward, left, right, brake} = controls.current

        vehicleApi.applyEngineForce(forward || backward ? force * (forward && !backward ? 1 : -1) : 0, 1)

        vehicleApi.setSteeringValue(left || right ? steer * (left && !right ? -1 : 1) : 0, 0)

        vehicleApi.setBrake(brake ? maxBrake : 0, 1)

    })

    return (
        <group ref={vehicle}>
            <Chassis ref={chassisBody}/>
        </group>
    )
}
