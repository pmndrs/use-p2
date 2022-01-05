import React from 'react'
import {useGLTF} from '@react-three/drei'
import {useBox} from '@react-three/p2'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import type {BufferGeometry, Material} from 'three'

const barrierMaterials = [
    'concrete',
    'signs',
] as const
type BarrierMaterial = typeof barrierMaterials[number]

const barrierNodes = [
    'Mesh_detailBarrierStrong_typeB',
    'Mesh_detailBarrierStrong_typeB_1',
] as const
type BarrierNode = typeof barrierNodes[number]

type BarrierGLTF = GLTF & {
    materials: Record<BarrierMaterial, Material>
    nodes: Record<BarrierNode, { geometry: BufferGeometry }>
}

type BarrierProps = {
    position: [x: number, y: number],
    angle: number,
}

export default function Barrier(props: BarrierProps) {

    const {nodes, materials} = useGLTF('/kenney_retroUrbanKit/detailBarrierStrong_typeB.glb') as BarrierGLTF

    const [ref] = useBox(() => ({
        mass: 1,
        args: [0.7, 0.3],
        angularDamping: 0.95,
        damping: 0.95,
        ...props,
    }))

    return (
        <group ref={ref} dispose={null}>
            <mesh geometry={nodes.Mesh_detailBarrierStrong_typeB.geometry} material={materials.concrete}/>
            <mesh geometry={nodes.Mesh_detailBarrierStrong_typeB_1.geometry} material={materials.signs}/>
        </group>
    )
}
