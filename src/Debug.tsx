import { useFrame } from '@react-three/fiber'
import type { Body } from 'p2-es'
import {vec2, World} from 'p2-es'
import type { FC } from 'react'
import React, { useContext, useMemo, useRef, useState } from 'react'
import { Euler, Quaternion, Scene, Vector3 } from 'three'

import type { BodyProps, BodyShapeType } from './hooks'
import type { DebugOptions } from './p2-debugger'
import CannonDebugger from './p2-debugger'
import propsToBody from './propsToBody'
import { context, debugContext } from './setup'

type DebugInfo = { bodies: Body[]; bodyMap: { [uuid: string]: Body } }

export type DebugProps = {
  color?: number
  impl?: typeof CannonDebugger
  linewidth?: number
  normalIndex: number
  scale?: number
}

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
let _v = []

export const Debug: FC<DebugProps> = ({
  children,
  color = 0xffffff,
  normalIndex = 0,
  linewidth = 0.002,
  scale = 1,
  impl = CannonDebugger,
}) => {
  const [{ bodies, bodyMap }] = useState<DebugInfo>({ bodies: [], bodyMap: {} })
  const { refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const p2DebuggerRef = useRef(impl(scene, { bodies } as World, { color, linewidth, normalIndex, scale }))

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
