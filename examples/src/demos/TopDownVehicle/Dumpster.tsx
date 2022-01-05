import React from 'react'
import {useGLTF} from '@react-three/drei'
import {useBox} from '@react-three/p2'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import type {BufferGeometry, Material} from 'three'

const dumpsterMaterials = [
    'wall_metal.001',
    'concrete',
    'metal',
    'doors',
] as const
type DumpsterMaterial = typeof dumpsterMaterials[number]

const dumpsterNodes = [
    'Mesh_wallB_door',
    'Mesh_wallB_door_1',
    'Mesh_wallB_door_2',
    'Mesh_wallB_door_3',
] as const
type DumpsterNode = typeof dumpsterNodes[number]

type DumpsterGLTF = GLTF & {
    materials: Record<DumpsterMaterial, Material>
    nodes: Record<DumpsterNode, { geometry: BufferGeometry }>
}

type DumpsterProps = {
    position: [x: number, y: number],
    angle: number,
}

export default function Dumpster(props: DumpsterProps) {

    const {nodes, materials} = useGLTF('/kenney_retroUrbanKit/wallB_door.glb') as DumpsterGLTF

    const [ref] = useBox(() => ({
        mass: 0,
        args: [1, 1],
        ...props
    }))

    return (
        <group ref={ref} dispose={null}>
            <mesh geometry={nodes.Mesh_wallB_door.geometry} material={materials['wall_metal.001']}/>
            <mesh geometry={nodes.Mesh_wallB_door_1.geometry} material={materials.concrete}/>
            <mesh geometry={nodes.Mesh_wallB_door_2.geometry} material={materials.metal}/>
            <mesh geometry={nodes.Mesh_wallB_door_3.geometry} material={materials.doors}/>
        </group>
    )
}
