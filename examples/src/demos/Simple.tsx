import {Canvas, useFrame} from '@react-three/fiber'
import {Physics, useBox, useCircle} from '@react-three/p2'

function Box() {
    const [ref, api] = useBox(() => ({
        type: 'Kinematic',
        position: [0, -2],
        angle: 0,
    }))
    useFrame((state) => {
        api.angle.set(Math.sin(state.clock.elapsedTime*10)/10)
    })
    return (
        <mesh ref={ref}>
            <boxGeometry />
        </mesh>
    )
}

function Ball() {
    const [ref] = useCircle(() => ({mass: 1, position: [0, 2]}))
    return (
        <mesh ref={ref}>
            <sphereGeometry/>
        </mesh>
    )
}

export default () => (
    <Canvas>
        <Physics normalIndex={2}>
            <Box />
            <Ball />
        </Physics>
    </Canvas>
)
