import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCompoundBody, useRaycastClosest } from '@react-three/p2'
import { vec2 } from 'p2-es'
import type { PropsWithChildren } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import type { BufferGeometry, Material } from 'three'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'

import { useControls } from '../use-controls'

const materials = ['Black', 'White', 'Yellow'] as const
type PlayerMaterial = typeof materials[number]

const nodes = [
  'character_duck',
  'character_duckHead',
  'character_duckArmLeft',
  'character_duckArmRight',
  'Cube1338',
  'Cube1338_1',
  'Cube1338_2',
] as const
type PlayerNode = typeof nodes[number]

type PlayerGLTF = GLTF & {
  materials: Record<PlayerMaterial, Material>
  nodes: Record<PlayerNode, { geometry: BufferGeometry }>
}

export default ({ position }: PropsWithChildren<{ position: [x: number, y: number] }>) => {
  const { nodes, materials } = useGLTF('/kaykit_miniGame/character_duck.gltf') as PlayerGLTF

  const { camera } = useThree()

  const [ref, playerApi] = useCompoundBody(() => ({
    shapes: [
      {
        type: 'Circle',
        args: [0.5],
        position: [1.2, 0],
      },
      {
        type: 'Circle',
        args: [0.4],
        position: [0.4, 0],
      },
    ],
    mass: 1,
    args: [0.8],
    position,
    angle: Math.PI / 2,
    fixedRotation: true,
    onCollide: (e) => {
      // @ts-ignore
      const normal = e.contact.contactNormal
      vec2.scale(normal, normal, -0.3)
      playerApi.applyImpulse(normal, [0, 0])
    },
  }))

  const [pos, setPos] = useState(vec2.create())

  const controls = useControls()

  const isGrounded = useRef(false)

  const velocity = useRef([0, 0])

  useRaycastClosest(
    {
      from: [pos[0], pos[1] + 0.2],
      to: [pos[0], pos[1] - 0.2],
      skipBackfaces: true,
    },
    (e) => {
      isGrounded.current = e.hasHit
    },
    [pos],
  )

  useEffect(() => {
    playerApi.velocity.subscribe((e) => (velocity.current = e))

    playerApi.position.subscribe((p) => {
      camera.position.lerp({ x: p[0], y: p[1] + 10, z: 40 } as THREE.Vector3, 0.05)

      // reminder: not working if OrbitControls enabled
      camera.lookAt(p[0], p[1] + 1, 0)

      setPos(p)
    })
  }, [])

  useFrame(() => {
    const { forward, left, right } = controls.current

    playerApi.applyForce(vec2.fromValues((~~right - ~~left) * 10, 0), vec2.create())

    if (isGrounded.current && forward) playerApi.applyImpulse([0, 3], vec2.create())

    if (velocity.current[1] < 0.5) playerApi.applyForce([0, -15], vec2.create())
  })

  return (
    <group ref={ref} dispose={null} name={'player'}>
      <mesh
        geometry={nodes.character_duck.geometry}
        material={materials.White}
        //position={[-0.8, 0, 0]}
        rotation={[Math.PI / 2, 0, -Math.PI / 2]}
      >
        <mesh
          geometry={nodes.character_duckArmLeft.geometry}
          material={materials.White}
          position={[0.2, 0.63, 0]}
        />
        <mesh
          geometry={nodes.character_duckArmRight.geometry}
          material={materials.White}
          position={[-0.2, 0.63, 0]}
        />
        <group position={[0, 0.7, 0]}>
          <mesh geometry={nodes.Cube1338.geometry} material={materials.White} />
          <mesh geometry={nodes.Cube1338_1.geometry} material={materials.Yellow} />
          <mesh geometry={nodes.Cube1338_2.geometry} material={materials.Black} />
        </group>
      </mesh>
    </group>
  )
}
