import { animated, config, useSpring } from '@react-spring/three'
import { useGLTF } from '@react-three/drei'
import React, { forwardRef } from 'react'
import type * as THREE from 'three'
import type { Object3D } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

type GLTFResult = GLTF & {
  nodes: {
    Mesh_wheel_frontLeft: THREE.Mesh
    Mesh_wheel_frontLeft_1: THREE.Mesh
    Mesh_wheel_frontLeft_2: THREE.Mesh
    Mesh_wheel_frontLeft001: THREE.Mesh
    Mesh_wheel_frontLeft001_1: THREE.Mesh
    Mesh_wheel_frontLeft001_2: THREE.Mesh
    Mesh_wheel_frontLeft002: THREE.Mesh
    Mesh_wheel_frontLeft002_1: THREE.Mesh
    Mesh_wheel_frontLeft002_2: THREE.Mesh
    Mesh_wheel_frontLeft003: THREE.Mesh
    Mesh_wheel_frontLeft003_1: THREE.Mesh
    Mesh_wheel_frontLeft003_2: THREE.Mesh
    Mesh_body: THREE.Mesh
    Mesh_body_1: THREE.Mesh
    Mesh_body_2: THREE.Mesh
    Mesh_body_3: THREE.Mesh
    Mesh_body_4: THREE.Mesh
    Mesh_body_5: THREE.Mesh
    Mesh_body_6: THREE.Mesh
    Mesh_body_7: THREE.Mesh
    Mesh_grill: THREE.Mesh
    Mesh_grill_1: THREE.Mesh
    Mesh_grill_2: THREE.Mesh
  }
  materials: {
    carTire: THREE.MeshStandardMaterial
    _defaultMat: THREE.MeshStandardMaterial
    plastic: THREE.MeshStandardMaterial
    lightBack: THREE.MeshStandardMaterial
    paintGreen: THREE.MeshStandardMaterial
    paintRed: THREE.MeshStandardMaterial
    lightFront: THREE.MeshStandardMaterial
    window: THREE.MeshStandardMaterial
    lightBlue: THREE.MeshStandardMaterial
  }
}

export default forwardRef<Object3D>((props, ref) => {
  const { nodes, materials } = useGLTF('/kenney_carkit/firetruck.glb') as GLTFResult

  const { chassisBody, lineRef } = ref.current

  const spring = useSpring({
    from: { lean: 0, steer: 0 },
    to: { lean: props.angularVelocity / 10, steer: -props.steeringValue },
    config: config.wobbly,
  })

  const blink = useSpring({
    from: { emissiveIntensity: 2 },
    to: { emissiveIntensity: 0.5 },
    config: {
      duration: 600,
    },
    loop: true,
  })

  return (
    <>
      <group ref={chassisBody} {...props} dispose={null}>
        <animated.group rotation-z={spring.lean} ref={lineRef}>
          <mesh geometry={nodes.Mesh_body.geometry} material={materials.lightBack} />
          <mesh geometry={nodes.Mesh_body_1.geometry} material={materials.paintGreen} />
          <mesh geometry={nodes.Mesh_body_2.geometry} material={nodes.Mesh_body_2.material} />
          <mesh geometry={nodes.Mesh_body_3.geometry} material={materials.paintRed} />
          <mesh geometry={nodes.Mesh_body_4.geometry} material={materials.lightFront} />
          <mesh geometry={nodes.Mesh_body_5.geometry} material={materials.window} />
          <mesh geometry={nodes.Mesh_body_6.geometry}>
            <animated.meshStandardMaterial
              color={0x7bebff}
              emissive={0x029eff}
              emissiveIntensity={blink.emissiveIntensity}
            />
          </mesh>
          <mesh geometry={nodes.Mesh_body_7.geometry} material={nodes.Mesh_body_7.material} />
        </animated.group>

        <group position={[0, 0.27, -1.6]}>
          <mesh geometry={nodes.Mesh_grill.geometry} material={nodes.Mesh_grill.material} />
          <mesh geometry={nodes.Mesh_grill_1.geometry} material={nodes.Mesh_grill_1.material} />
          <mesh geometry={nodes.Mesh_grill_2.geometry} material={nodes.Mesh_grill_2.material} />
        </group>
        <group position={[-0.35, 0.3, 0.66]}>
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft003.geometry}
            material={nodes.Mesh_wheel_frontLeft003.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft003_1.geometry}
            material={nodes.Mesh_wheel_frontLeft003_1.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft003_2.geometry}
            material={nodes.Mesh_wheel_frontLeft003_2.material}
          />
        </group>
        <group position={[0.35, 0.3, 0.66]}>
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft.geometry}
            material={nodes.Mesh_wheel_frontLeft.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft_1.geometry}
            material={nodes.Mesh_wheel_frontLeft_1.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft_2.geometry}
            material={nodes.Mesh_wheel_frontLeft_2.material}
          />
        </group>
        <animated.group position={[-0.35, 0.3, -0.96]} rotation-y={spring.steer}>
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft001.geometry}
            material={nodes.Mesh_wheel_frontLeft001.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft001_1.geometry}
            material={nodes.Mesh_wheel_frontLeft001_1.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft001_2.geometry}
            material={nodes.Mesh_wheel_frontLeft001_2.material}
          />
        </animated.group>
        <animated.group position={[0.35, 0.3, -0.96]} rotation-y={spring.steer}>
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft002.geometry}
            material={nodes.Mesh_wheel_frontLeft002.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft002_1.geometry}
            material={nodes.Mesh_wheel_frontLeft002_1.material}
          />
          <mesh
            geometry={nodes.Mesh_wheel_frontLeft002_2.geometry}
            material={nodes.Mesh_wheel_frontLeft002_2.material}
          />
        </animated.group>
      </group>
    </>
  )
})

useGLTF.preload('/kenney_carkit/firetruck.glb')
