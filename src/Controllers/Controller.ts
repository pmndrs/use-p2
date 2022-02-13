import { Ray, RaycastResult, vec2 } from 'p2-es'
import type { KinematicCharacterControllerOptns } from './KinematicCharacterController'
import RaycastController from './RaycastController'

import type { Duplet } from './'

// constants
const ZERO = vec2.create()
const UNIT_Y = vec2.fromValues(0, 1)

// math helpers
function sign(x: number) {
  return x >= 0 ? 1 : -1
}

function angle(a: Duplet, b: Duplet) {
  return Math.acos(vec2.dot(a, b))
}

/**
 * @class Controller
 * @extends {RaycastController}
 * @constructor
 * @param {object} [options]
 * @param {number} [options.maxClimbAngle]
 * @param {number} [options.maxDescendAngle]
 */
export default class Controller extends RaycastController {
  maxClimbAngle: number
  maxDescendAngle: number
  collisions: {
    above: boolean
    below: boolean
    left: boolean
    right: boolean
    climbingSlope: boolean
    descendingSlope: boolean
    slopeAngle: number
    slopeAngleOld: number
    velocityOld: Duplet
    faceDir: number
    fallingThroughPlatform: boolean
  }
  ray: Ray
  raycastResult: RaycastResult
  raysData: [from: Duplet, to: Duplet, hitPoint: [number, number]][]
  constructor({
    world,
    body,
    collisionMask,
    skinWidth,
    dstBetweenRays,
    maxClimbAngle,
    maxDescendAngle,
  }: Pick<
    KinematicCharacterControllerOptns,
    'world' | 'body' | 'collisionMask' | 'skinWidth' | 'dstBetweenRays' | 'maxClimbAngle' | 'maxDescendAngle'
  >) {
    super({ world, body, collisionMask, skinWidth, dstBetweenRays })

    const DEG_TO_RAD = Math.PI / 180

    this.maxClimbAngle = maxClimbAngle !== undefined ? maxClimbAngle : 80 * DEG_TO_RAD

    this.maxDescendAngle = maxDescendAngle !== undefined ? maxDescendAngle : 80 * DEG_TO_RAD

    this.collisions = {
      above: false,
      below: false,
      left: false,
      right: false,
      climbingSlope: false,
      descendingSlope: false,
      slopeAngle: 0,
      slopeAngleOld: 0,
      velocityOld: vec2.create(),
      faceDir: 1,
      fallingThroughPlatform: false,
    }

    this.ray = new Ray({
      mode: Ray.CLOSEST,
      from: [0, 0],
      to: [0, 0],
      skipBackfaces: true,
    })
    this.raycastResult = new RaycastResult()
    this.raysData = []
  }

  resetCollisions(velocity: Duplet) {
    const collisions = this.collisions

    collisions.above = collisions.below = false
    collisions.left = collisions.right = false
    collisions.climbingSlope = false
    collisions.descendingSlope = false
    collisions.slopeAngleOld = collisions.slopeAngle
    collisions.slopeAngle = 0
    vec2.copy(collisions.velocityOld, velocity)
  }

  moveWithZeroInput(velocity: Duplet, standingOnPlatform: boolean) {
    return this.move(velocity, ZERO, standingOnPlatform)
  }

  move(velocity: Duplet, input: Duplet, standingOnPlatform?: boolean) {
    const collisions = this.collisions
    this.updateRaycastOrigins()
    this.resetCollisions(velocity)

    if (velocity[0] !== 0) {
      collisions.faceDir = sign(velocity[0])
    }

    if (velocity[1] < 0) {
      this.descendSlope(velocity)
    }
    this.horizontalCollisions(velocity)
    if (velocity[1] !== 0) {
      this.verticalCollisions(velocity)
    }

    vec2.add(this.body.position, this.body.position, velocity)

    if (standingOnPlatform) {
      collisions.below = true
    }
  }

  horizontalCollisions(velocity: Duplet) {
    const collisions = this.collisions
    const maxClimbAngle = this.maxClimbAngle
    const directionX = collisions.faceDir
    const skinWidth = this.skinWidth
    const rayLength = Math.abs(velocity[0]) + skinWidth
    const raycastOrigins = this.raycastOrigins

    // if (Math.abs(velocity[0]) < skinWidth) {
    // rayLength = 2 * skinWidth;
    // }

    for (let i = 0; i < this.horizontalRayCount; i++) {
      const ray = this.ray
      ray.collisionMask = this.collisionMask
      vec2.copy(ray.from, directionX === -1 ? raycastOrigins.bottomLeft : raycastOrigins.bottomRight)
      ray.from[1] += this.horizontalRaySpacing * i
      vec2.copy(ray.to, [ray.from[0] + directionX * rayLength, ray.from[1]])
      ray.update()
      this.world.raycast(this.raycastResult, ray)

      this.raysData[i] = [[...ray.from], [...ray.to], [0, 0]]

      if (this.raycastResult.body) {
        const distance = this.raycastResult.getHitDistance(ray)
        this.raycastResult.getHitPoint(this.raysData[i][2], ray)

        if (distance === 0) continue

        const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)

        if (i === 0 && slopeAngle <= maxClimbAngle) {
          if (collisions.descendingSlope) {
            collisions.descendingSlope = false
            vec2.copy(velocity, collisions.velocityOld)
          }
          let distanceToSlopeStart = 0
          if (slopeAngle !== collisions.slopeAngleOld) {
            distanceToSlopeStart = distance - skinWidth
            velocity[0] -= distanceToSlopeStart * directionX
          }
          this.climbSlope(velocity, slopeAngle)
          velocity[0] += distanceToSlopeStart * directionX
        }

        if (!collisions.climbingSlope || slopeAngle > maxClimbAngle) {
          velocity[0] = (distance - skinWidth) * directionX
          //rayLength = distance

          if (collisions.climbingSlope) {
            velocity[1] = Math.tan(collisions.slopeAngle) * Math.abs(velocity[0])
          }

          collisions.left = directionX === -1
          collisions.right = directionX === 1
        }
      }

      this.raycastResult.reset()
    }
  }

  verticalCollisions(velocity: Duplet) {
    const collisions = this.collisions
    const skinWidth = this.skinWidth
    const raycastOrigins = this.raycastOrigins
    const directionY = sign(velocity[1])
    let rayLength = Math.abs(velocity[1]) + skinWidth
    const ray = this.ray

    for (let i = 0; i < this.verticalRayCount; i++) {
      ray.collisionMask = this.collisionMask
      vec2.copy(ray.from, directionY === -1 ? raycastOrigins.bottomLeft : raycastOrigins.topLeft)
      ray.from[0] += this.verticalRaySpacing * i + velocity[0]
      vec2.set(ray.to, ray.from[0], ray.from[1] + directionY * rayLength)
      ray.update()
      this.world.raycast(this.raycastResult, ray)

      this.raysData[this.horizontalRayCount + i] = [[...ray.from], [...ray.to], [0, 0]]

      if (this.raycastResult.body) {
        const distance = this.raycastResult.getHitDistance(ray)
        this.raycastResult.getHitPoint(this.raysData[this.horizontalRayCount + i][2], ray)
        velocity[1] = (distance - skinWidth) * directionY
        rayLength = distance

        if (collisions.climbingSlope) {
          velocity[0] = (velocity[1] / Math.tan(collisions.slopeAngle)) * sign(velocity[0])
        }

        collisions.below = directionY === -1
        collisions.above = directionY === 1
      }

      this.raycastResult.reset()
    }

    if (collisions.climbingSlope) {
      const directionX = sign(velocity[0])
      rayLength = Math.abs(velocity[0]) + skinWidth

      ray.collisionMask = this.collisionMask
      vec2.copy(ray.from, directionX === -1 ? raycastOrigins.bottomLeft : raycastOrigins.bottomRight)
      ray.from[1] += velocity[1]
      vec2.set(ray.to, ray.from[0] + directionX * rayLength, ray.from[1])
      ray.update()
      this.world.raycast(this.raycastResult, ray)

      if (this.raycastResult.body) {
        const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)
        if (slopeAngle !== collisions.slopeAngle) {
          velocity[0] = (this.raycastResult.getHitDistance(ray) - skinWidth) * directionX
          collisions.slopeAngle = slopeAngle
        }
      }
    }
  }

  climbSlope(velocity: Duplet, slopeAngle: number) {
    const collisions = this.collisions
    const moveDistance = Math.abs(velocity[0])
    const climbVelocityY = Math.sin(slopeAngle) * moveDistance

    if (velocity[1] <= climbVelocityY) {
      velocity[1] = climbVelocityY
      velocity[0] = Math.cos(slopeAngle) * moveDistance * sign(velocity[0])
      collisions.below = true
      collisions.climbingSlope = true
      collisions.slopeAngle = slopeAngle
    }
  }

  descendSlope(velocity: Duplet) {
    const raycastOrigins = this.raycastOrigins
    const directionX = sign(velocity[0])
    const collisions = this.collisions
    const ray = this.ray
    ray.collisionMask = this.collisionMask
    vec2.copy(ray.from, directionX === -1 ? raycastOrigins.bottomRight : raycastOrigins.bottomLeft)
    vec2.set(ray.to, ray.from[0], ray.from[1] - 1e6)
    ray.update()

    this.world.raycast(this.raycastResult, ray)

    if (this.raycastResult.body) {
      const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)
      if (slopeAngle !== 0 && slopeAngle <= this.maxDescendAngle) {
        if (sign(this.raycastResult.normal[0]) === directionX) {
          if (
            this.raycastResult.getHitDistance(ray) - this.skinWidth <=
            Math.tan(slopeAngle) * Math.abs(velocity[0])
          ) {
            const moveDistance = Math.abs(velocity[0])
            const descendVelocityY = Math.sin(slopeAngle) * moveDistance
            velocity[0] = Math.cos(slopeAngle) * moveDistance * sign(velocity[0])
            velocity[1] -= descendVelocityY

            collisions.slopeAngle = slopeAngle
            collisions.descendingSlope = true
            collisions.below = true
          }
        }
      }
    }

    this.raycastResult.reset()
  }

  resetFallingThroughPlatform() {
    this.collisions.fallingThroughPlatform = false
  }
}
