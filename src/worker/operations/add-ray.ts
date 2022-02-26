import type { Body } from 'p2-es'
import { Ray, RaycastResult, vec2 } from 'p2-es'

import type { CannonMessageMap } from '../../setup'
import type { State } from '../state'
import type { WithUUID } from '../types'

function toUppercase<T extends string>(str: T): Uppercase<T> {
  return str.toUpperCase() as Uppercase<T>
}

export const addRay = (
  state: State,
  { props: { from, mode, to, ...rayOptions }, uuid }: CannonMessageMap['addRay'],
) => {
  const ray = new Ray({ from, mode: Ray[toUppercase(mode)], to, ...rayOptions })

  const result = new RaycastResult()

  const hitPointWorld = vec2.create()
  state.rays[uuid] = () => {
    const hasHit = state.world.raycast(result, ray)

    if (hasHit) result.getHitPoint(hitPointWorld, ray)

    const { body, shape, ...rest } = result

    self.postMessage({
      body: body ? (body as WithUUID<Body>).uuid : null,
      hasHit: hasHit,
      hitDistance: result.getHitDistance(ray),
      //hitNormalWorld: hitNormalWorld.toArray(),
      hitPointWorld,
      op: 'event',
      ray: {
        collisionGroup: ray.collisionGroup,
        collisionMask: ray.collisionMask,
        direction: ray.direction,
        from: ray.from,
        to: ray.to,
        uuid,
        ...rest,
      },
      //rayFromWorld: rayFromWorld.toArray(),
      //rayToWorld: rayToWorld.toArray(),
      shape: shape ? { ...shape, body: (body as WithUUID<Body>).uuid } : null,
      type: 'rayhit',
    })
  }

  state.world.on('preSolve', state.rays[uuid])
}
