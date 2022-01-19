import React, {useContext, useState, useRef, useMemo} from 'react'
import type {DebugOptions} from './p2-debugger'
import cannonDebugger from './p2-debugger'
import {useFrame} from '@react-three/fiber'
import {Vector3, Quaternion, Euler, Scene} from 'three'
import {vec2} from 'p2-es'
import type {Body} from 'p2-es'
import {context, debugContext} from './setup'
import propsToBody from './propsToBody'
import type {BodyProps, BodyShapeType} from './hooks'

type DebugApi = {
    update: () => void
}

export type DebuggerInterface = (scene: Scene, bodies: Body[], props?: DebugOptions) => DebugApi

export type DebugInfo = { bodies: Body[]; refs: { [uuid: string]: Body } }

export type DebugProps = {
    normalIndex: number
    children: React.ReactNode
    color?: number
    linewidth?: number
    scale?: number
    impl?: DebuggerInterface
}

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
let _v = []

export function Debug({
                          normalIndex = 0,
                          color = 0xffffff,
                          linewidth = 0.002,
                          scale = 1,
                          children,
                          impl = cannonDebugger,
                      }: DebugProps): JSX.Element {
    const [debugInfo] = useState<DebugInfo>({bodies: [], refs: {}})
    const {refs} = useContext(context)
    const [scene] = useState(() => new Scene())
    const instance = useRef<DebugApi>()

    let lastBodies = 0
    const euler = new Euler()
    useFrame(() => {
        if (!instance.current || lastBodies !== debugInfo.bodies.length) {
            lastBodies = debugInfo.bodies.length
            scene.children = []
            instance.current = impl(scene, debugInfo.bodies, {
                normalIndex,
                color,
                linewidth,
                scale,
                autoUpdate: false,
            })
        }

        for (const uuid in debugInfo.refs) {
            // refs[uuid]: mesh
            // debugInfo.refs[uuid]: body
            refs[uuid].matrix.decompose(v, q, s)
            _v = [v.x, v.y, v.z]
            _v.splice(normalIndex, 1)
            // copy body position and angle from main to debug
            vec2.set(debugInfo.refs[uuid].position, _v[0], _v[1])

            euler.setFromQuaternion(q)
            debugInfo.refs[uuid].angle = euler.toArray()[normalIndex]
        }

        instance.current.update()
    })

    const api = useMemo(
        () => ({
            add(id: string, props: BodyProps, type: BodyShapeType) {
                const body = propsToBody(id, props, type)
                debugInfo.bodies.push(body)
                debugInfo.refs[id] = body
            },
            remove(id: string) {
                const debugBodyIndex = debugInfo.bodies.indexOf(debugInfo.refs[id])
                if (debugBodyIndex > -1) debugInfo.bodies.splice(debugBodyIndex, 1)
                delete debugInfo.refs[id]
            },
        }),
        [],
    )

    return (
        <debugContext.Provider value={api}>
            <primitive object={scene}/>
            {children}
        </debugContext.Provider>
    )
}
