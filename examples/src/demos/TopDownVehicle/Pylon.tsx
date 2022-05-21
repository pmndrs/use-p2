import { useGLTF } from '@react-three/drei'
import { useCircle } from '@react-three/p2'
import React from 'react'
import type * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

type GLTFResult = GLTF & {
  nodes: {
    ID7: THREE.Mesh
    ID7_1: THREE.Mesh
  }
  materials: {
    cone: THREE.MeshBasicMaterial
    white: THREE.MeshBasicMaterial
  }
}

export default function Model(props) {
  const { nodes, materials } = useGLTF('/kenney_carkit/pylon.glb') as GLTFResult

  const [group] = useCircle(() => ({
    mass: 0.1,
    args: [0.1],
    angularDamping: 0.95,
    damping: 0.95,
    ...props,
  }))

  return (
    <group ref={group} {...props} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={[4, 4, 4]}>
        <mesh castShadow receiveShadow geometry={nodes.ID7.geometry} material={materials.cone} />
        <mesh castShadow receiveShadow geometry={nodes.ID7_1.geometry} material={materials.white} />
      </group>
    </group>
  )
}

useGLTF.preload('/kenney_carkit/pylon.glb')
