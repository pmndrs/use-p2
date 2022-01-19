import {useEffect, useMemo, useRef} from 'react'
import type {PropsWithChildren} from 'react'
import {useParticle} from '@react-three/p2'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import type {BufferGeometry, Material} from 'three'
import {useGLTF} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import type {Object3D} from 'three'

const materials = [
    'White',
] as const
type FeatherMaterial = typeof materials[number]

const nodes = [
    'Feather',
] as const
type FeatherNode = typeof nodes[number]

type FeatherGLTF = GLTF & {
    materials: Record<FeatherMaterial, Material>
    nodes: Record<FeatherNode, { geometry: BufferGeometry }>
}

function Feather({position, velocity}: PropsWithChildren<{ position: [x: number, y: number], velocity: [x: number, y: number] }>) {

    const {nodes, materials} = useGLTF('/feather.glb') as FeatherGLTF

    const [ref, api] = useParticle(() => ({
        mass: 0.01,
        damping: 0.1,
        position,
        velocity,
    }))

    const meshRef = useRef<Object3D>()

    const grounded = useRef(false)

    useEffect(() => api.velocity.subscribe(v => {
        v[1] < -0.2 && api.applyForce([0, 0.2+speed*0.1], [0,0])
        grounded.current = v[1] === 0
    }), [])

    const scale = useMemo(() => 1.5+(Math.random()-0.5), [])

    const speed = useMemo(() => Math.random(), [])

    useFrame(() => {

        if (meshRef.current && !grounded.current) meshRef.current.rotation.y += speed*0.1

    })

    return (
        <group ref={ref} dispose={null} scale={[scale,scale,scale]}>
            <mesh ref={meshRef} geometry={nodes.Feather.geometry} rotation-y={speed*Math.PI} rotation-x={Math.random()*0.3} material={materials['White']} />
        </group>
    )
}

export function Feathers({positions}: PropsWithChildren<{ positions: [x: number, y: number][] }>) {
    return <>
        {positions.map((p,i) => <Feather position={p} velocity={[(Math.random()-0.5)*20, (Math.random()-0.5)*20]} key={i} />)}
    </>
}
