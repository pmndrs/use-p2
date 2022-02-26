import type { Body } from 'p2-es'
import { Broadphase, GSSolver, NaiveBroadphase, SAPBroadphase } from 'p2-es'

import type { CannonMessageProps } from '../../setup'
import type { State } from '../state'
import type { CannonCollideEvent, WithUUID } from '../types'

type TwoBodies = {
  bodyA?: WithUUID<Body>
  bodyB?: WithUUID<Body>
}

function emitBeginContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA || !bodyB) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideBegin' })
}

function emitEndContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA || !bodyB) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideEnd' })
}

export const init = (
  state: State,
  {
    //allowSleep,
    axisIndex = 0,
    broadphase,
    defaultContactMaterial,
    gravity,
    iterations,
    normalIndex,
    //quatNormalizeFast,
    //quatNormalizeSkip,
    //solver,
    tolerance,
  }: CannonMessageProps<'init'>,
) => {
  //state.world.allowSleep = allowSleep
  state.world.gravity = [gravity[0], gravity[1]]
  //state.world.quatNormalizeFast = quatNormalizeFast
  //state.world.quatNormalizeSkip = quatNormalizeSkip
  state.normalIndex = normalIndex
  state.normal.splice(normalIndex, 1, 1)

  /*if (solver === 'Split') {
    state.world.solver = new SplitSolver(new GSSolver())
  }*/

  if (state.world.solver instanceof GSSolver) {
    state.world.solver.tolerance = tolerance
    state.world.solver.iterations = iterations
  }

  state.world.broadphase =
    broadphase === 'SAP' ? new SAPBroadphase(Broadphase.SAP) : new NaiveBroadphase(Broadphase.NAIVE)

  if (state.world.broadphase instanceof SAPBroadphase) {
    state.world.broadphase.axisIndex = axisIndex
  }

  state.world.on('beginContact', emitBeginContact)
  state.world.on('endContact', emitEndContact)
  state.world.on('impact', (event: CannonCollideEvent) => {
    const { bodyA, bodyB, contactEquation } = event
    const { normalA, contactPointA, contactPointB, index, shapeA, shapeB } = contactEquation
    const contactPoint = [bodyA.position[0] + contactPointA[0], bodyA.position[1] + contactPointA[1]]
    const contactNormal = normalA //bodyA === body ? normalA : vec2.scale(normalA, normalA, -1)
    self.postMessage({
      body: bodyA.uuid,
      collisionFilters: {
        bodyFilterGroup: shapeA.collisionGroup,
        bodyFilterMask: shapeA.collisionMask,
        targetFilterGroup: shapeB.collisionGroup,
        targetFilterMask: shapeB.collisionMask,
      },
      contact: {
        bi: bodyA.uuid,
        bj: bodyB.uuid,
        // Normal of the contact, relative to the colliding body
        contactNormal: contactNormal,
        // World position of the contact
        contactPoint: contactPoint,
        impactVelocity: contactEquation.getVelocityAlongNormal(),
        index,
        ni: normalA,
        ri: contactPointA,
        rj: contactPointB,
      },
      op: 'event',
      target: bodyB.uuid,
      type: 'collide', //event.type
    })
  })

  Object.assign(state.world.defaultContactMaterial, defaultContactMaterial)
}
