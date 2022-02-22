import { useGLTF } from '@react-three/drei'
import { useBox, useCircle, useRevoluteConstraint } from '@react-three/p2'
import type { PropsWithChildren } from 'react'
import type { BufferGeometry, Material } from 'three'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'

const materials = ['Beige', 'BrownDark'] as const
type PlatformMaterial = typeof materials[number]

const nodes = ['Cube1609', 'Cube1609_1'] as const
type PlatformNode = typeof nodes[number]

type PlatformGLTF = GLTF & {
  materials: Record<PlatformMaterial, Material>
  nodes: Record<PlatformNode, { geometry: BufferGeometry }>
}

export default ({
  position,
  length,
}: PropsWithChildren<{ position: [x: number, y: number]; length: number }>) => {
  const { nodes, materials } = useGLTF('/kaykit_miniGame/tileLow_desert.gltf.glb') as PlatformGLTF

  const [refA] = useCircle(() => ({
    args: [0.5],
    mass: 0,
    collisionResponse: 0,
    position: position,
  }))

  const [refB] = useBox(() => ({
    args: [2, 1],
    mass: 1,
    position: [position[0], position[1] - length],
  }))

  useRevoluteConstraint(refA, refB, {
    collideConnected: false,
    worldPivot: position,
  })

  return (
    <group ref={refB} dispose={null}>
      <group position-y={-0.5}>
        <mesh geometry={nodes.Cube1609.geometry} material={materials.Beige} />
        <mesh geometry={nodes.Cube1609_1.geometry} material={materials.BrownDark} />
      </group>
      <mesh position-y={length / 2} material={materials.Beige}>
        <cylinderBufferGeometry args={[0.1, 0.1, length]} />
      </mesh>
    </group>
  )
}
