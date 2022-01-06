import {Canvas} from '@react-three/fiber'
import {Physics, Debug, useBox, useCapsule, useCircle, usePlane} from '@react-three/p2'
import {OrbitControls} from "@react-three/drei";

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

function Ball() {
    const [ref] = useCircle(() => ({mass: 1, position: [4, 2]}))
    return (
        <mesh ref={ref}>
            <sphereGeometry />
            <meshNormalMaterial />
        </mesh>
    )
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
                <Ball />
                <Capsule />
                <Plane />
            </Debug>
        </Physics>
    </Canvas>
)
