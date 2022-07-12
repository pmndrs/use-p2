import { LinearSpring } from 'p2-es'

import type { CannonMessageMap } from '../../setup'
import type { State } from '../state'
import type { WithUUID } from '../types'

export const addSpring = (
  state: State,
  {
    props: [bodyA, bodyB, { damping, localAnchorA, localAnchorB, stiffness, worldAnchorA, worldAnchorB }],
    uuid,
  }: CannonMessageMap['addSpring'],
) => {
  const spring: WithUUID<LinearSpring> = new LinearSpring(state.bodies[bodyA], state.bodies[bodyB], {
    damping,
    localAnchorA,
    localAnchorB,
    stiffness,
    worldAnchorA,
    worldAnchorB,
  })

  spring.uuid = uuid

  const postStepSpring = () => spring.applyForce()

  state.springs[uuid] = postStepSpring
  state.springInstances[uuid] = spring

  // Compute the force after each step
  state.world.on('postStep', state.springs[uuid])
}
