import type { RenderCallback } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import type { FC } from 'react'
import type { PropsWithChildren } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Object3D } from 'three'
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

import type {
  ProviderContext,
  Refs,
  WorkerCollideBeginEvent,
  WorkerCollideEndEvent,
  WorkerCollideEvent,
  WorkerFrameMessage,
  WorkerRayhitEvent,
} from './setup'
import { context } from './setup'
import { useUpdateWorldPropsEffect } from './useUpdateWorldPropsEffect'
import type { CannonWorkerProps } from './cannon-worker-api'
import { CannonWorkerAPI } from './cannon-worker-api'

export type ProviderProps = PropsWithChildren<
  CannonWorkerProps & {
    isPaused?: boolean
    maxSubSteps?: number
    shouldInvalidate?: boolean
    stepSize?: number
  }
>

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
const m = new Matrix4()

function apply(index: number, positions: Float32Array, quaternions: Float32Array, object?: Object3D) {
  if (index !== undefined) {
    m.compose(
      v.fromArray(positions, index * 3),
      q.fromArray(quaternions, index * 4),
      object ? object.scale : s,
    )
    if (object) {
      object.matrixAutoUpdate = false
      object.matrix.copy(m)
    }
    return m
  }
  return m.identity()
}

export const Provider: FC<ProviderProps> = ({
  allowSleep = false,
  axisIndex = 0,
  broadphase = 'Naive',
  children,
  defaultContactMaterial = { friction: 0.3, restitution: 0 },
  gravity = [0, -9.81],
  isPaused = false,
  iterations = 5,
  maxSubSteps = 10,
  normalIndex = 0,
  quatNormalizeFast = false,
  quatNormalizeSkip = 0,
  shouldInvalidate = true,
  size = 1000,
  solver = 'GS',
  stepSize = 1 / 60,
  tolerance = 0.001,
}) => {
  const { invalidate } = useThree()

  const [worker] = useState<CannonWorkerAPI>(
    () =>
      new CannonWorkerAPI({
        allowSleep,
        axisIndex,
        broadphase,
        defaultContactMaterial,
        gravity,
        iterations,
        normalIndex,
        quatNormalizeFast,
        quatNormalizeSkip,
        size,
        solver,
        tolerance,
      }),
  )
  const [refs] = useState<Refs>({})
  const [events] = useState<ProviderContext['events']>({})
  const [subscriptions] = useState<ProviderContext['subscriptions']>({})

  const bodies = useRef<{ [uuid: string]: number }>({})

  let timeSinceLastCalled = 0

  const loop = useCallback<RenderCallback>(
    (_, delta) => {
      if (isPaused) return
      timeSinceLastCalled += delta
      worker.step({ maxSubSteps, stepSize, timeSinceLastCalled })
      timeSinceLastCalled = 0
    },
    [isPaused, maxSubSteps, stepSize],
  )

  const collideHandler = ({
    body,
    contact: { bi, bj, ...contactRest },
    target,
    ...rest
  }: WorkerCollideEvent['data']) => {
    const cb = events[target]?.collide
    cb &&
      cb({
        body: refs[body],
        contact: {
          bi: refs[bi],
          bj: refs[bj],
          ...contactRest,
        },
        target: refs[target],
        ...rest,
      })
  }

  const collideBeginHandler = ({ bodyA, bodyB }: WorkerCollideBeginEvent['data']) => {
    const cbA = events[bodyA]?.collideBegin
    cbA &&
      cbA({
        body: refs[bodyB],
        op: 'event',
        target: refs[bodyA],
        type: 'collideBegin',
      })
    const cbB = events[bodyB]?.collideBegin
    cbB &&
      cbB({
        body: refs[bodyA],
        op: 'event',
        target: refs[bodyB],
        type: 'collideBegin',
      })
  }

  const collideEndHandler = ({ bodyA, bodyB }: WorkerCollideEndEvent['data']) => {
    const cbA = events[bodyA]?.collideEnd
    cbA &&
      cbA({
        body: refs[bodyB],
        op: 'event',
        target: refs[bodyA],
        type: 'collideEnd',
      })
    const cbB = events[bodyB]?.collideEnd
    cbB &&
      cbB({
        body: refs[bodyA],
        op: 'event',
        target: refs[bodyB],
        type: 'collideEnd',
      })
  }

  const frameHandler = ({
    active,
    bodies: uuids = [],
    observations,
    positions,
    quaternions,
  }: WorkerFrameMessage['data']) => {
    for (let i = 0; i < uuids.length; i++) {
      bodies.current[uuids[i]] = i
    }
    observations.forEach(([id, value, type]) => {
      const subscription = subscriptions[id] || {}
      const cb = subscription[type]
      // HELP: We clearly know the type of the callback, but typescript can't deal with it
      cb && cb(value as never)
    })

    if (active) {
      for (const ref of Object.values(refs)) {
        if (ref instanceof InstancedMesh) {
          for (let i = 0; i < ref.count; i++) {
            const index = bodies.current[`${ref.uuid}/${i}`]
            if (index !== undefined) {
              ref.setMatrixAt(i, apply(index, positions, quaternions))
            }
            ref.instanceMatrix.needsUpdate = true
          }
        } else {
          apply(bodies.current[ref.uuid], positions, quaternions, ref)
        }
      }
      if (shouldInvalidate) {
        invalidate()
      }
    }
  }

  const rayhitHandler = ({ body, ray: { uuid, ...rayRest }, ...rest }: WorkerRayhitEvent['data']) => {
    const cb = events[uuid]?.rayhit
    cb &&
      cb({
        body: body ? refs[body] : null,
        ray: { uuid, ...rayRest },
        ...rest,
      })
  }

  // Run loop *after* all the physics objects have ran theirs!
  // Otherwise the buffers will be invalidated by the browser
  useFrame(loop)

  useLayoutEffect(() => {
    worker.init()

    worker.on('collide', collideHandler)
    worker.on('collideBegin', collideBeginHandler)
    worker.on('collideEnd', collideEndHandler)
    worker.on('frame', frameHandler)
    worker.on('rayhit', rayhitHandler)

    return () => {
      worker.terminate()
      worker.removeAllListeners()
    }
  }, [])

  useUpdateWorldPropsEffect({ axisIndex, broadphase, gravity, iterations, tolerance, worker })

  const value: ProviderContext = useMemo(
    () => ({ bodies, events, refs, subscriptions, worker }),
    [bodies, events, refs, subscriptions, worker],
  )
  return <context.Provider value={value}>{children}</context.Provider>
}
