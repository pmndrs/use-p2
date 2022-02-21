import React, { useContext, useState, useRef, useMemo } from 'react'
import type { DebugOptions } from './p2-debugger'
import cannonDebugger from './p2-debugger'
import { useFrame } from '@react-three/fiber'
import { Vector3, Quaternion, Euler, Scene } from 'three'
import { vec2 } from 'p2-es'
import type { Body } from 'p2-es'
import { context, debugContext } from './setup'
import propsToBody from './propsToBody'
import type { BodyProps, BodyShapeType } from './hooks'

type DebugApi = {
  update: () => void
}

export type DebuggerInterface = (scene: Scene, bodies: Body[], props?: DebugOptions) => DebugApi

type DebugInfo = { bodies: Body[]; bodyMap: { [uuid: string]: Body } }

export type DebugProps = {
  children: React.ReactNode
  color?: number
  impl?: DebuggerInterface
  linewidth?: number
  normalIndex: number
  scale?: number
}

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
let _v = []

export function Debug({
  children,
  color = 0xffffff,
  normalIndex = 0,
  linewidth = 0.002,
  scale = 1,
  impl = cannonDebugger,
}: DebugProps): JSX.Element {
  const [{ bodies, bodyMap }] = useState<DebugInfo>({ bodies: [], bodyMap: {} })
  const { refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const p2DebuggerRef = useRef<DebugApi>(impl(scene, bodies, { color, linewidth, normalIndex, scale }))

  const euler = new Euler()
  const order = ['XYZ', 'YZX', 'ZXY']
  useFrame(() => {
    for (const uuid in bodyMap) {
      // refs[uuid]: mesh
      // debugInfo.refs[uuid]: body
      refs[uuid].matrix.decompose(v, q, s)
      _v = [v.x, v.y, v.z]
      _v.splice(normalIndex, 1)
      // copy body position and angle from main to debug
      vec2.set(bodyMap[uuid].position, _v[0], _v[1])
      // convert rotations to euler, important to start to unroll with our normalIndex
      euler.setFromQuaternion(q, order[normalIndex])
      bodyMap[uuid].angle = euler.toArray()[normalIndex]
    }

    p2DebuggerRef.current.update()
  })

  const api = useMemo(
    () => ({
      add(uuid: string, props: BodyProps, type: BodyShapeType) {
        const body = propsToBody({ props, type, uuid })
        bodies.push(body)
        bodyMap[uuid] = body
      },
      remove(uuid: string) {
        const index = bodies.indexOf(bodyMap[uuid])
        if (index !== -1) bodies.splice(index, 1)
        delete bodyMap[uuid]
      },
    }),
    [],
  )

  return (
    <debugContext.Provider value={api}>
      <primitive object={scene} />
      {children}
    </debugContext.Provider>
  )
}
