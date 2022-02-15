import { useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useGLTF } from '@react-three/drei'
import { useBox } from '@react-three/p2'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'
import type { BufferGeometry, Material } from 'three'
import type { Object3D } from 'three'
import { useFrame } from '@react-three/fiber'
import usePlayer from './PlayerZustand'
import { Feathers } from './Feathers'

const materials = ['BrownDark', 'Black', 'Metal'] as const
type SpikesMaterial = typeof materials[number]

const nodes = ['Cylinder048', 'Cylinder048_1', 'Cylinder048_2'] as const
type SpikesNode = typeof nodes[number]

type SpikesGLTF = GLTF & {
  materials: Record<SpikesMaterial, Material>
  nodes: Record<SpikesNode, { geometry: BufferGeometry }>
}

export default ({ position }: PropsWithChildren<{ position: [x: number, y: number] }>) => {
  const { nodes, materials } = useGLTF('/kaykit_miniGame/spikeRoller.gltf.glb') as SpikesGLTF

  const meshRef = useRef<Object3D>()

  const [{ loseLife }] = usePlayer()

  const [feathers, setFeathers] = useState([[0, 0]])

  const [ref] = useBox(() => ({
    mass: 0,
    args: [1, 2],
    position,
  }))

  useBox(() => ({
    mass: 0,
    args: [1.8, 1.2],
    collisionResponse: 0,
    position: [position[0], position[1] + 0.2],
    onCollideBegin: (e) => {
      if (e.body.name === 'player') {
        loseLife()
        // @ts-ignore
        setFeathers((f) => [...f, ...new Array(10).fill(e.contacts[0].contactPoint)])
      }
    },
  }))

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.1
  })

  return (
    <>
      <group ref={ref} dispose={null}>
        <group ref={meshRef} position={[0, -1, 0]} name={'spikes'}>
          <mesh geometry={nodes.Cylinder048.geometry} material={materials.BrownDark} />
          <mesh geometry={nodes.Cylinder048_1.geometry} material={materials.Black} />
          <mesh geometry={nodes.Cylinder048_2.geometry} material={materials.Metal} />
        </group>
      </group>
      <Feathers positions={feathers} />
    </>
  )
}
