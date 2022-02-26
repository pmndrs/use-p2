import {
  Constraint,
  DistanceConstraint,
  GearConstraint,
  LockConstraint,
  PrismaticConstraint,
  RevoluteConstraint,
} from 'p2-es'

import type { CannonMessageMap } from '../../setup'
import type { State } from '../state'
import type { WithUUID } from '../types'

export const addConstraint = (
  state: State,
  {
    props: [
      bodyA,
      bodyB,
      {
        angle,
        disableRotationalLock,
        upperLimit,
        lowerLimit,
        distance,
        maxForce,
        maxTorque,
        localAnchorA,
        localAnchorB,
        localAngleB,
        localAxisA,
        localPivotA,
        localPivotB,
        localOffsetB,
        ratio,
        worldPivot,
      },
    ],
    type,
    uuid,
  }: CannonMessageMap['addConstraint'],
) => {
  let constraint: WithUUID<Constraint>

  switch (type) {
    case 'Distance':
      constraint = new DistanceConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        distance,
        localAnchorA,
        localAnchorB,
      })
      break
    case 'Gear':
      constraint = new GearConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        angle,
        maxTorque,
        ratio,
      })
      break
    case 'Lock':
      constraint = new LockConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        localAngleB,
        localOffsetB,
        maxForce,
      })
      break
    case 'Revolute':
      constraint = new RevoluteConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        localPivotA,
        localPivotB,
        maxForce,
        worldPivot,
      })
      break
    case 'Prismatic':
      constraint = new PrismaticConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        disableRotationalLock,
        localAnchorA,
        localAnchorB,
        localAxisA,
        lowerLimit,
        maxForce,
        upperLimit,
      })
      break
    default:
      constraint = new Constraint(state.bodies[bodyA], state.bodies[bodyB], Constraint[type], {})
      break
  }
  constraint.uuid = uuid
  state.world.addConstraint(constraint)
  /*we dont use it yet*/
  /*if (maxMultiplier !== undefined) {
    const postStepConstraint = () => {
      // The multiplier is proportional to how much force is added to the bodies by the constraint.
      // If this exceeds a limit the constraint is disabled.
      const multiplier = Math.abs(constraint.equations[0].multiplier)
      if (multiplier > maxMultiplier) {
        constraint.disable()
      }
    }
    state.constraints[uuid] = postStepConstraint
    state.world.addEventListener('postStep', state.constraints[uuid])
  }*/
}
