import React, {forwardRef} from 'react'
import {useGLTF} from '@react-three/drei'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import type {BufferGeometry, Material, Object3D} from 'three'

const truckMaterials = [
    'truck_alien',
] as const
type TruckMaterial = typeof truckMaterials[number]

const truckNodes = [
    'truck_green',
] as const
type TruckNode = typeof truckNodes[number]

type truckGLTF = GLTF & {
    materials: Record<TruckMaterial, Material>
    nodes: Record<TruckNode, { geometry: BufferGeometry }>
}

export default forwardRef<Object3D>((props, ref) => {

    const {nodes, materials} = useGLTF('/kenney_retroUrbanKit/truck_green.glb') as truckGLTF

    return (
        <group ref={ref} dispose={null}>
            <mesh
                geometry={nodes.truck_green.geometry}
                material={materials.truck_alien}
            />
        </group>
    )
})
