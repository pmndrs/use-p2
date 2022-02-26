import { Body } from 'p2-es'

import type { CannonMessageMap, Observation, WorkerFrameMessage } from '../../setup'
import type { State } from '../state'
import type { CannonWorkerGlobalScope } from '../types'

declare let self: CannonWorkerGlobalScope

export const step = (
  state: State,
  { positions, props: { maxSubSteps, stepSize, timeSinceLastCalled }, quaternions }: CannonMessageMap['step'],
) => {
  state.world.step(stepSize, timeSinceLastCalled, maxSubSteps)

  for (let i = 0; i < state.world.bodies.length; i += 1) {
    const b = state.world.bodies[i]
    const p = [...b.position]
    p.splice(state.normalIndex, 0, 0)
    const s = Math.sin(b.angle * 0.5)

    positions[3 * i + 0] = p[0]
    positions[3 * i + 1] = p[1]
    positions[3 * i + 2] = p[2]
    quaternions[4 * i + 0] = s * -state.normal[0]
    quaternions[4 * i + 1] = s * state.normal[1]
    quaternions[4 * i + 2] = s * -state.normal[2]
    quaternions[4 * i + 3] = -Math.cos(b.angle * 0.5)
  }

  const observations: Observation[] = []

  for (const id of Object.keys(state.subscriptions)) {
    const [uuid, type, target = 'bodies'] = state.subscriptions[id]

    const { bodies, controllers, vehicles } = state

    const value =
      target === 'vehicles'
        ? // @ts-expect-error TODO: Differentiate these "types"
          vehicles[uuid].vehicle[type]
        : target === 'controllers'
        ? // @ts-expect-error TODO: Differentiate these "types"
          controllers[uuid].controller[type]
        : // @ts-expect-error TODO: Differentiate these "types"
          bodies[uuid][type]

    //const serializableValue: PropValue<typeof type> = isQorV(value) ? value.toArray() : value

    observations.push([
      Number(id),
      value,
      // @ts-expect-error TODO: Differentiate these "types"
      type,
    ])
  }

  const message: WorkerFrameMessage['data'] = {
    active: state.world.bodies.some((body) => body.sleepState !== Body.SLEEPING),
    observations,
    op: 'frame',
    positions,
    quaternions,
  }

  if (state.bodiesNeedSyncing) {
    message.bodies = state.world.bodies.reduce((bodies: string[], body) => {
      if (body.uuid) bodies.push(body.uuid)
      return bodies
    }, [])
    state.bodiesNeedSyncing = false
  }

  self.postMessage(message, [positions.buffer, quaternions.buffer])
}
