import React, {useRef} from 'react'
import {Canvas, useLoader} from '@react-three/fiber'
import {Environment} from '@react-three/drei'
import {Physics, Debug} from '@react-three/p2'
import Vehicle from './Vehicle'
import Barrier from './Barrier'
import Dumpster from './Dumpster'
import * as THREE from 'three'
import {vec2} from 'p2-es'

function getRandomArbitrary(min: number, max: number) {
    return Math.random() * (max - min) + min
}

const VehicleScene = () => {

    const [
        roadMap,
        logo,
    ] = useLoader(THREE.TextureLoader, [
        './kenney_retroUrbanKit/asphalt.png',
        './kenney_retroUrbanKit/logo_kenney.png',
    ])

    const steps = 24
    const radius = 8
    const barrierPositions = useRef(new Array(steps)
        .fill([])
        .map((v, i) => vec2.fromValues(radius * Math.cos(i * 2 * Math.PI / steps), radius * Math.sin(i * 2 * Math.PI / steps))))

    const dumpsterPositions = useRef(new Array(30)
        .fill({})
        .map(() => vec2.fromValues(getRandomArbitrary(-15, 15), getRandomArbitrary(-15, 15))))

    return (
        <>
            <Canvas shadows camera={{position: [10, 20, 10], fov: 50}}>
                <color attach="background" args={['#171720']}/>
                <Environment preset={'city'}/>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                    <planeGeometry args={[10, 10]}/>
                    <meshBasicMaterial map={logo} transparent={true}/>
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[30, 30]}/>
                    <meshBasicMaterial map={roadMap} map-wrapS={THREE.RepeatWrapping} map-wrapT={THREE.RepeatWrapping} map-repeat={[10, 10]}/>
                </mesh>
                <Physics gravity={[0, 0]} normalIndex={1}>
                    <Debug normalIndex={1}>
                        <Vehicle/>
                        {barrierPositions.current.map((p, i) => <Barrier position={p} angle={i * 2 * Math.PI / steps + Math.PI / 2} key={i}/>)}
                        {dumpsterPositions.current.map((p, i) => <Dumpster position={p} angle={i * Math.PI/13} key={i}/>)}
                    </Debug>
                </Physics>
            </Canvas>
            <div style={{position: 'absolute', bottom: '50px', left: '50vw', transform: 'translate(-50%, 0)'}}>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                    <img src={'./kenney_gameicons/arrowUp.png'} alt="" />
                </div>
                <div style={{display: 'flex'}}>
                    <img src={'./kenney_gameicons/arrowLeft.png'} alt="" />
                    <img src={'./kenney_gameicons/arrowDown.png'} alt="" />
                    <img src={'./kenney_gameicons/arrowRight.png'} alt="" />
                </div>
            </div>
        </>
    )
}

export default VehicleScene
