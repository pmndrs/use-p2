import React, {useEffect, useState} from 'react'
import type {PropsWithChildren} from 'react'
import type {BufferGeometry, Material} from 'three'
import type {GLTF} from 'three-stdlib/loaders/GLTFLoader'
import {animated, config, useSpring} from '@react-spring/three'
import {useCircle} from '@react-three/p2'
import {useGLTF} from '@react-three/drei'
import usePlayer from './PlayerZustand'

const heartMaterials = [
    'Red',
] as const
type HeartMaterial = typeof heartMaterials[number]

const heartNodes = [
    'heart_teamRed',
] as const
type HeartNode = typeof heartNodes[number]

type HeartGLTF = GLTF & {
    materials: Record<HeartMaterial, Material>
    nodes: Record<HeartNode, { geometry: BufferGeometry }>
}

export default ({position}: PropsWithChildren<{ position: [x: number, y: number] }>) => {

    const [touched, setTouched] = useState(0)

    const [{addLife}] = usePlayer()

    const springs = useSpring({
        from: {opacity: 1, positionY: 0},
        to: {opacity: touched, positionY: touched ? 3 : 0},
        config: config.wobbly,
    })

    const loops = useSpring({
        from: {turning: 0},
        to: {turning: Math.PI * 2},
        config: {duration: 2000},
        loop: true,
    })

    useEffect(() => {
        if (touched === 0) return
        setTouched(1)
        addLife()
        setTimeout(() => setTouched(0), 2000)
    }, [touched])

    const [ref] = useCircle(() => ({
        mass: 0,
        position,
        args: [0.2],
        collisionResponse: 0,
        onCollideBegin: () => setTouched(1),
    }))

    const {nodes, materials} = useGLTF('/kaykit_miniGame/heart_teamRed.gltf.glb') as HeartGLTF

    return (
        <group ref={ref} dispose={null} scale={0.5}>
            <animated.mesh geometry={nodes.heart_teamRed.geometry} rotation-y={loops.turning} position-y={springs.positionY} material={materials.Red} />
        </group>
    )
}
