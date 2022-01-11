import React, {useContext, useState, useRef, useMemo} from 'react'
import type {DebugOptions} from './p2-debugger'
import cannonDebugger from './p2-debugger'
import {useFrame} from '@react-three/fiber'
import type {Color} from 'three'
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
    color?: string | number | Color
    scale?: number
    impl?: DebuggerInterface
}

const getYaw = (q: any) => Math.asin(-2 * (q.x * q.z - q.w * q.y))

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
let _v = [];

export function Debug({
                          normalIndex = 0,
                          color = 'green',
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
                scale,
                autoUpdate: false,
            })
        }

        for (const uuid in debugInfo.refs) {
            //refs[uuid]: mesh
            // debugInfo.refs[uuid]: body
            refs[uuid].matrix.decompose(v, q, s)
            _v = [v.x, v.y, v.z]
            _v.splice(normalIndex, 1)
            // copy body position and angle from main to debug
            // @ts-ignore
            vec2.set(debugInfo.refs[uuid].position, ..._v)

            euler.setFromQuaternion(q)
            debugInfo.refs[uuid].angle = euler.toArray()[normalIndex]
            // bypass quaternion of three mesh
            // TODO we should reconstruct the quaternion in p2-debugger from angle and delete this
            // @ts-ignore
            debugInfo.refs[uuid].quaternion.copy(q);
        }

        instance.current.update()
    })

    const api = useMemo(
        () => ({
            add(id: string, props: BodyProps, type: BodyShapeType) {
                const body = propsToBody(id, props, type)
                debugInfo.bodies.push(body)
                body.quaternion = new Quaternion();
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
