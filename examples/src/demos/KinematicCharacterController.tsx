import {Canvas, useThree} from '@react-three/fiber'
import {
    Physics,
    Debug,
    useBox,
    useKinematicCharacterController,
    usePlatformController
} from '@react-three/p2'
import {useEffect, useRef} from 'react'
import type {Object3D} from 'three'

const SCENERY_GROUP = Math.pow(2,1)
const PLAYER_GROUP = Math.pow(2,2)

function Box({args, position, angle}: {args: [width: number, height: number], position: [x: number, y: number], angle?: number}) {
    const [ref] = useBox(() => ({
        args,
        position,
        angle,
        mass: 0,
        collisionGroup: SCENERY_GROUP,
    }))
    return (
        <mesh ref={ref}>
            <boxGeometry args={args}/>
            <meshNormalMaterial />
        </mesh>
    )
}

function Platform({args, position, localWaypoints}: {args: [width: number, height: number], position: [x: number, y: number], localWaypoints: [x: number, y: number][]}) {
    const [ref] = useBox(() => ({
        args,
        position,
        mass: 0,
        collisionGroup: SCENERY_GROUP,
    }))

    usePlatformController(() => ({
        body: ref,
        passengerMask: PLAYER_GROUP,
        localWaypoints,
        speed: 4,
    }))

    return (
        <mesh ref={ref}>
            <boxGeometry args={args}/>
            <meshNormalMaterial />
        </mesh>
    )
}

function Player(props: {position: [x: number, y: number]}) {

    const {camera} = useThree()

    const body = useRef<Object3D>(null)

    const [, bodyApi] = useBox(() => ({
        mass: 0,
        position: props.position,
        fixedRotation: true,
        damping: 0,
        type: 'Kinematic',
        collisionGroup: PLAYER_GROUP,
    }),
        body
    )

    const [, controllerApi] = useKinematicCharacterController(() => ({
        body,
        collisionMask: SCENERY_GROUP,
        velocityXSmoothing: 0.0001,
        skinWidth: 0.1
    }))

    const handleKeydown = (evt: KeyboardEvent) => {

        let left = 0, right = 0

        switch(evt.code){
            case 'Space': controllerApi.setJump(true); break
            case 'KeyD': right = 1; break
            case 'KeyA': left = 1; break
        }

        controllerApi.setInput([right - left, 0])

    }

    const handleKeyup = (evt: KeyboardEvent) => {

        let left = 0, right = 0

        switch(evt.code){
            case 'Space': controllerApi.setJump(false); break
            case 'KeyD': right = 0; break
            case 'KeyA': left = 0; break
        }

        controllerApi.setInput([right - left, 0])

    }

    useEffect(() => {

        window.addEventListener('keydown', handleKeydown)
        window.addEventListener('keyup', handleKeyup)

        bodyApi.position.subscribe(p => {
            camera.position.lerp({x: p[0] - 6, y: p[1] - 3, z: 50} as THREE.Vector3, 0.02)
            camera.lookAt(p[0], p[1] + 1, 0)
        })

        return () => {
            window.removeEventListener('keydown', handleKeydown)
            window.removeEventListener('keyup', handleKeyup)
        }
    }, [])

    return (
        <mesh ref={body}>
            <boxBufferGeometry args={[1,1]} />
            <meshNormalMaterial />
        </mesh>
    )
}

export default () => (
    <Canvas camera={{position: [-2,10,30], fov: 50}}>
        <Physics normalIndex={2}>
            <Debug normalIndex={2}>
                <Player position={[0,4]} />
                <Box args={[10,1]} position={[0,0]} />
                <Box args={[1,5]} position={[-2,3]} />
                <Box args={[1,5]} position={[-15,3]} />
                <Box args={[1,6]} position={[2,8]} />
                <Box args={[3,3]} position={[-3,9]} />
                <Box args={[3,3]} position={[-3,9]} />
                <Box args={[1,6]} position={[14,9]} angle={-Math.PI/10}/>
                <Platform args={[1,6]} position={[6,0]} localWaypoints={[[0, -5],[0,10]]}/>
            </Debug>
        </Physics>
    </Canvas>
)
