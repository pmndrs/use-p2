import React from 'react'
import type {PropsWithChildren} from 'react'
import {Canvas, useLoader} from '@react-three/fiber'
import {useGLTF, RoundedBox, OrbitControls} from '@react-three/drei'
import {Debug, Physics, useBox, usePlane} from '@react-three/p2'
import type {BufferGeometry, Material} from 'three'
import * as THREE from 'three'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import Player from './Player'
import Spikes from './Spikes'
import Heart from './Heart'
import Crane from './Crane'
import {Chain, StaticHandle} from './Bridge'
import usePlayer from './PlayerZustand'

const tileMaterials = [
    'Green',
    'BrownDark',
] as const
type TileMaterial = typeof tileMaterials[number]

const tileHighNodes = [
    'Cube1600',
    'Cube1600_1',
] as const
type TileNode = typeof tileHighNodes[number]

type tileHighGLTF = GLTF & {
    materials: Record<TileMaterial, Material>
    nodes: Record<TileNode, { geometry: BufferGeometry }>
}

const normalIndex = 2

function Block({position}: PropsWithChildren<{ position: [x: number, y: number] }>) {

    const [ref] = useBox(() => ({
        mass: 0,
        position,
        args: [2, 2],
    }))

    const {nodes, materials} = useGLTF('/kaykit_miniGame/tileHigh_forest.gltf.glb') as tileHighGLTF

    return (
        <group ref={ref} dispose={null}>
            <group position={[0, -1, 0]}>
                <mesh geometry={nodes.Cube1600.geometry} material={materials.Green}/>
                <mesh geometry={nodes.Cube1600_1.geometry} material={materials.BrownDark}/>
            </group>
        </group>
    )
}

function Ground() {

    usePlane(() => ({angle: 0, mass: 0}))

    const {materials} = useGLTF('/kaykit_miniGame/tileHigh_forest.gltf.glb') as tileHighGLTF

    return (
        <RoundedBox radius={0.125} args={[30,1,10]} position-y={-0.5} material={materials.Green}/>
    )
}

const Scene = () => {

    const [{lives}] = usePlayer()

    const [
        logo,
    ] = useLoader(THREE.TextureLoader, [
        './kaykit_miniGame/kaykit_logo.png',
    ])

    return (
        <>
            <Canvas shadows camera={{position: [12, 5, 40], fov: 24}}>
                <color attach="background" args={['#171720']}/>
                <ambientLight intensity={0.1}/>
                <spotLight position={[10, 10, -50]} angle={0.75} intensity={0.5} lookAt={() => [0,0,0]} castShadow penumbra={1}/>
                <OrbitControls enabled={true}/>
                <mesh rotation-x={0} position={[-4, 1.5, -4]} scale={[2,2,2]}>
                    <planeGeometry args={[3.92, 1]}/>
                    <meshBasicMaterial map={logo} transparent={true}/>
                </mesh>
                <Physics gravity={[0, -20]} normalIndex={normalIndex}>
                    <Debug normalIndex={normalIndex}>
                        <Block position={[2, 1]} />
                        <Block position={[4, 3]} />
                        <Block position={[12.5, 3]} />
                        <Heart position={[12.3, 7]} />
                        <Player position={[2, 3]} />
                        <Ground/>
                        <Spikes position={[-5, 1]} />
                        <Crane position={[17, 8]} length={5} />
                        <StaticHandle
                            position={[5, 4]}
                        >
                            <Chain length={10}/>
                        </StaticHandle>
                    </Debug>
                </Physics>
            </Canvas>

            <div style={{position: 'absolute', bottom: '50px', left: '50vw', transform: 'translate(-50%, 0)'}}>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                    <img src={'./kenney_gameicons/arrowUp.png'} alt=""/>
                </div>
                <div style={{display: 'flex'}}>
                    <img src={'./kenney_gameicons/arrowLeft.png'} alt=""/>
                    <img src={'./kenney_gameicons/arrowDown.png'} alt=""/>
                    <img src={'./kenney_gameicons/arrowRight.png'} alt=""/>
                </div>
            </div>

            <div style={{position: 'absolute', top: '50px', left: '50vw', transform: 'translate(-50%, 0)'}}>
                <div style={{display: 'flex'}}>
                    {new Array(lives < 0 ? 0 : lives).fill(0).map((l,i) => <img src={'./kenney_gameicons/heart.png'} alt="" key={i}/>)}
                </div>
            </div>
        </>
    )
}

export default Scene
