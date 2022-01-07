import {Canvas} from '@react-three/fiber'
import {Physics, Debug, useBox, useCapsule, useCircle, useParticle, usePlane} from '@react-three/p2'
import {OrbitControls} from '@react-three/drei'
import {vec2} from 'p2-es'
import type {PropsWithChildren} from 'react'

function Box() {
    const [ref] = useBox(() => ({mass: 1, position: [0, 2]}))
    return (
        <mesh ref={ref}>
            <boxGeometry />
            <meshNormalMaterial />
        </mesh>
    )
}

function Capsule() {
    const [ref] = useCapsule(() => ({mass: 1, position: [2, 2], args: [2, 0.3], angle: Math.PI/2-0.01}))
    return (
        <group ref={ref}>
        </group>
    )
}

function Circle() {
    const [ref] = useCircle(() => ({mass: 1, position: [4, 2]}))
    return (
        <mesh ref={ref}>
            <sphereGeometry />
            <meshNormalMaterial />
        </mesh>
    )
}

function Particle({position, velocity}: PropsWithChildren<{ position: [x: number, y: number], velocity: [x: number, y: number] }>) {
    const [ref] = useParticle(() => ({mass: 0.01, position, velocity}))
    return (
        <group ref={ref}>
        </group>
    )
}

function ParticleSystem() {
    const arr = new Array(10)
        .fill([])
        .map(() => {
            const a = vec2.fromValues(-1+Math.random()*3, 3+Math.random()*3)
            return a
        })
    return <>
        {arr.map((p,i) => <Particle position={p} velocity={p} key={i} />)}
    </>
}

function Plane() {
    const [ref] = usePlane(() => ({mass: 0, position: [0, 0]}))
    return (
        <mesh ref={ref}>
            <boxGeometry args={[10,0.1,10]} />
            <meshNormalMaterial />
        </mesh>
    )
}

export default () => (
    <Canvas camera={{position: [0,0,10]}}>
        <OrbitControls/>
        <Physics normalIndex={2}>
            <Debug normalIndex={2}>
                <Box />
                <Circle />
                <Capsule />
                <ParticleSystem />
                <Plane />
            </Debug>
        </Physics>
    </Canvas>
)
