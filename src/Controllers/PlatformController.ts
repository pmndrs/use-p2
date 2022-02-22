import RaycastController from './RaycastController'
import type { RaycastControllerOptns } from './RaycastController'
import { Ray, RaycastResult, vec2 } from 'p2-es'
import type { Body } from 'p2-es'
import type { Duplet } from './'
import type KinematicCharacterController from './KinematicCharacterController'

interface BodyWithUuid extends Body {
  uuid: string
}

// math helpers
function sign(x: number) {
  return x >= 0 ? 1 : -1
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// constants
const ZERO = vec2.create()

interface PlatformControllerOptns extends RaycastControllerOptns {
  controllers: { [key: string]: KinematicCharacterController }
  dstBetweenRays?: number
  localWaypoints: Duplet[]
  passengerMask: number
  skinWidth?: number
  speed?: number
}

export default class PlatformController extends RaycastController {
  cyclic: boolean
  //[Range(0,2)]
  easeAmount: number

  fromWaypointIndex: number
  globalWaypoints: Duplet[]
  localWaypoints: Duplet[]

  nextMoveTime: number

  passengerDictionary: { [key: string]: KinematicCharacterController }
  passengerMask: number
  passengerMovement: PassengerMovement[]
  percentBetweenWaypoints: number

  ray: Ray
  raycastResult: RaycastResult
  raysData: [from: Duplet, to: Duplet, hitDistance?: number][]

  speed: number

  time: number
  waitTime: number

  constructor(options: PlatformControllerOptns) {
    super(options)

    this.passengerMask = options.passengerMask || -1

    this.localWaypoints = options.localWaypoints
    this.globalWaypoints = []

    this.speed = options.speed || 5
    this.cyclic = false
    this.waitTime = 0

    // Range(0,2)
    this.easeAmount = 0

    this.fromWaypointIndex = 0
    this.percentBetweenWaypoints = 0
    this.nextMoveTime = 0

    this.passengerMovement = []
    this.passengerDictionary = {}

    this.time = 0

    this.ray = new Ray({
      from: [0, 0],
      mode: Ray.CLOSEST,
      skipBackfaces: true,
      to: [0, -1],
    })
    this.raycastResult = new RaycastResult()
    this.raysData = []

    this.globalWaypoints = new Array(this.localWaypoints.length)
    for (let i = 0; i < this.localWaypoints.length; i++) {
      const temp = vec2.create()
      vec2.add(temp, this.localWaypoints[i], this.body.position)
      this.globalWaypoints[i] = temp
    }

    Object.values(options.controllers).map((c) => {
      const body = c.body as BodyWithUuid
      if (c.constructor.name === 'KinematicCharacterController') this.passengerDictionary[body.uuid] = c
    })

    this.world.on('postStep', () => this.update(1 / 60))
  }

  calculatePassengerMovement(velocity: Duplet) {
    const movedPassengers = new Set()
    this.passengerMovement = []

    const directionX = sign(velocity[0])
    const directionY = sign(velocity[1])

    // Vertically moving platform
    if (velocity[1] !== 0) {
      const rayLength = Math.abs(velocity[1]) + this.skinWidth

      for (let i = 0; i < this.verticalRayCount; i++) {
        const ray = this.ray

        ray.collisionMask = this.passengerMask
        vec2.copy(ray.from, directionY === -1 ? this.raycastOrigins.bottomLeft : this.raycastOrigins.topLeft)
        vec2.set(ray.from, ray.from[0] + this.verticalRaySpacing * i, ray.from[1])
        vec2.set(ray.to, ray.from[0], ray.from[1] + directionY * rayLength)
        ray.update()
        this.world.raycast(this.raycastResult, ray)

        this.raysData[i] = [[...ray.from], [...ray.to], undefined]

        if (this.raycastResult.body) {
          const distance = this.raycastResult.getHitDistance(ray)
          if (distance === 0) continue

          const body = this.raycastResult.body as BodyWithUuid

          if (!movedPassengers.has(body.uuid)) {
            movedPassengers.add(body.uuid)
            const pushX = directionY === 1 ? velocity[0] : 0
            const pushY = velocity[1] - (distance - this.skinWidth) * directionY

            this.passengerMovement.push(
              new PassengerMovement({
                moveBeforePlatform: true,
                standingOnPlatform: directionY === 1,
                uuid: body.uuid,
                velocity: vec2.fromValues(pushX, pushY),
              }),
            )
          }
        }

        this.raycastResult.reset()
      }
    }

    // Horizontally moving platform
    if (velocity[0] !== 0) {
      const rayLength = Math.abs(velocity[0]) + this.skinWidth

      for (let i = 0; i < this.horizontalRayCount; i++) {
        const ray = this.ray

        ray.collisionMask = this.passengerMask
        vec2.copy(
          ray.from,
          directionX === -1 ? this.raycastOrigins.bottomLeft : this.raycastOrigins.bottomRight,
        )
        ray.from[1] += this.horizontalRaySpacing * i
        vec2.copy(ray.to, ray.from)
        ray.to[0] += directionX * rayLength
        ray.update()
        this.world.raycast(this.raycastResult, ray)

        this.raysData[this.verticalRayCount + i] = [[...ray.from], [...ray.to], undefined]

        if (this.raycastResult.body) {
          const body = this.raycastResult.body as BodyWithUuid

          const distance = this.raycastResult.getHitDistance(ray)

          if (distance === 0) {
            continue
          }

          if (!movedPassengers.has(body.uuid)) {
            movedPassengers.add(body.uuid)
            const pushX = velocity[0] - (distance - this.skinWidth) * directionX
            const pushY = -this.skinWidth

            this.passengerMovement.push(
              new PassengerMovement({
                moveBeforePlatform: true,
                standingOnPlatform: false,
                uuid: body.uuid,
                velocity: vec2.fromValues(pushX, pushY),
              }),
            )
          }
        }

        this.raycastResult.reset()
      }
    }

    // Passenger on top of a horizontally or downward moving platform
    if (directionY === -1 || (velocity[1] === 0 && velocity[0] !== 0)) {
      const rayLength = this.skinWidth * 2

      for (let i = 0; i < this.verticalRayCount; i++) {
        const ray = this.ray
        ray.collisionMask = this.passengerMask
        vec2.set(
          ray.from,
          this.raycastOrigins.topLeft[0] + this.verticalRaySpacing * i,
          this.raycastOrigins.topLeft[1],
        )
        vec2.set(ray.to, ray.from[0], ray.from[1] + rayLength)
        ray.update()
        this.world.raycast(this.raycastResult, ray)

        this.raysData[this.verticalRayCount + this.horizontalRayCount + i] = [
          [...ray.from],
          [...ray.to],
          undefined,
        ]

        if (this.raycastResult.body) {
          const distance = this.raycastResult.getHitDistance(ray)

          if (distance === 0) {
            continue
          }

          const body = this.raycastResult.body as BodyWithUuid

          if (!movedPassengers.has(body.uuid)) {
            movedPassengers.add(body.uuid)
            const pushX = velocity[0]
            const pushY = velocity[1]

            this.passengerMovement.push(
              new PassengerMovement({
                moveBeforePlatform: false,
                standingOnPlatform: true,
                uuid: body.uuid,
                velocity: vec2.fromValues(pushX, pushY),
              }),
            )
          }
        }

        this.raycastResult.reset()
      }
    }
  }

  calculatePlatformMovement(deltaTime: number): Duplet {
    if (this.time < this.nextMoveTime) {
      return ZERO
    }

    const { globalWaypoints, speed } = this

    this.fromWaypointIndex %= globalWaypoints.length
    const toWaypointIndex = (this.fromWaypointIndex + 1) % globalWaypoints.length
    const distanceBetweenWaypoints = vec2.distance(
      globalWaypoints[this.fromWaypointIndex],
      globalWaypoints[toWaypointIndex],
    )
    this.percentBetweenWaypoints += (deltaTime * speed) / distanceBetweenWaypoints
    this.percentBetweenWaypoints = clamp(this.percentBetweenWaypoints, 0, 1)
    const easedPercentBetweenWaypoints = this.ease(this.percentBetweenWaypoints)

    const newPos = vec2.create()
    vec2.lerp(
      newPos,
      globalWaypoints[this.fromWaypointIndex],
      globalWaypoints[toWaypointIndex],
      easedPercentBetweenWaypoints,
    )

    if (this.percentBetweenWaypoints >= 1) {
      this.percentBetweenWaypoints = 0
      this.fromWaypointIndex++

      if (!this.cyclic) {
        if (this.fromWaypointIndex >= globalWaypoints.length - 1) {
          this.fromWaypointIndex = 0
          globalWaypoints.reverse()
        }
      }
      this.nextMoveTime = this.time + this.waitTime
    }

    const result = vec2.create()
    vec2.subtract(result, newPos, this.body.position)
    return result
  }

  ease(x: number) {
    const a = this.easeAmount + 1
    return Math.pow(x, a) / (Math.pow(x, a) + Math.pow(1 - x, a))
  }

  movePassengers(beforeMovePlatform: boolean) {
    this.passengerMovement.map((passenger) => {
      if (!(passenger.uuid in this.passengerDictionary)) {
        console.error('passenger uuid not in passengerDictionary')
      }

      if (passenger.moveBeforePlatform === beforeMovePlatform) {
        this.passengerDictionary[passenger.uuid].moveWithZeroInput(
          passenger.velocity,
          passenger.standingOnPlatform,
        )
      }
    })
  }

  update(deltaTime: number) {
    this.time += deltaTime

    super.updateRaycastOrigins()

    const velocity = this.calculatePlatformMovement(deltaTime)

    this.updateRaycastOrigins()

    this.calculatePassengerMovement(velocity)

    this.movePassengers(true)
    vec2.set(this.body.position, this.body.position[0] + velocity[0], this.body.position[1] + velocity[1])
    this.movePassengers(false)
  }
}

type PassengerMovementOptns = {
  moveBeforePlatform: boolean
  standingOnPlatform: boolean
  uuid: string
  velocity: Duplet
}

class PassengerMovement {
  moveBeforePlatform: boolean
  standingOnPlatform: boolean
  uuid: string
  velocity: Duplet

  constructor(options: PassengerMovementOptns) {
    this.velocity = options.velocity || [0, 0]
    this.standingOnPlatform = options.standingOnPlatform || false
    this.moveBeforePlatform = options.moveBeforePlatform || false
    this.uuid = options.uuid || ''
  }
}
