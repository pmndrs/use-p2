import { KinematicCharacterController } from '../../Controllers'
import type { CannonMessageMap } from '../../setup'
import type { State } from '../state'

export const addKinematicCharacterController = (
  state: State,
  data: CannonMessageMap['addKinematicCharacterController'],
) => {
  const [
    body,
    collisionMask,
    accelerationTimeAirborne,
    accelerationTimeGrounded,
    moveSpeed,
    wallSlideSpeedMax,
    wallStickTime,
    wallJumpClimb,
    wallJumpOff,
    wallLeap,
    timeToJumpApex,
    maxJumpHeight,
    minJumpHeight,
    velocityXSmoothing,
    velocityXMin,
    maxClimbAngle,
    maxDescendAngle,
    skinWidth,
    dstBetweenRays,
  ] = data.props
  const controller = new KinematicCharacterController({
    accelerationTimeAirborne,
    accelerationTimeGrounded,
    body: state.bodies[body],
    collisionMask,
    dstBetweenRays,
    maxClimbAngle,
    maxDescendAngle,
    maxJumpHeight,
    minJumpHeight,
    moveSpeed,
    skinWidth,
    timeToJumpApex,
    velocityXMin,
    velocityXSmoothing,
    wallJumpClimb,
    wallJumpOff,
    wallLeap,
    wallSlideSpeedMax,
    wallStickTime,
    world: state.world,
  })

  state.controllers[data.uuid] = { controller }
}
