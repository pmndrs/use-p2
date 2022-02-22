import { AABB, EventEmitter, vec2 } from 'p2-es'

import type { Body, World } from 'p2-es'

import type { Duplet } from './'

function expandAABB({ lowerBound, upperBound }: { lowerBound: Duplet; upperBound: Duplet }, amount: number) {
  const halfAmount = amount * 0.5
  lowerBound[0] -= halfAmount
  lowerBound[1] -= halfAmount
  upperBound[0] += halfAmount
  upperBound[1] += halfAmount
}

export type RaycastControllerOptns = {
  body: Body
  collisionMask?: number
  dstBetweenRays?: number
  skinWidth?: number
  world: World
}

export default class RaycastController extends EventEmitter {
  body: Body
  bounds: AABB
  collisionMask: number
  dstBetweenRays: number
  horizontalRayCount: number
  horizontalRaySpacing: number
  raycastOrigins: {
    bottomLeft: Duplet
    bottomRight: Duplet
    topLeft: Duplet
    topRight: Duplet
  }
  skinWidth: number
  verticalRayCount: number
  verticalRaySpacing: number
  world: World
  constructor(options: RaycastControllerOptns) {
    super()

    this.world = options.world
    this.body = options.body

    this.bounds = new AABB()

    this.collisionMask = options.collisionMask || -1

    this.skinWidth = options.skinWidth || 0.015
    this.dstBetweenRays = options.dstBetweenRays || 0.25

    this.horizontalRayCount = 4
    this.verticalRayCount = 4

    this.horizontalRaySpacing = 0
    this.verticalRaySpacing = 0

    this.raycastOrigins = {
      bottomLeft: vec2.create(),
      bottomRight: vec2.create(),
      topLeft: vec2.create(),
      topRight: vec2.create(),
    }

    this.calculateRaySpacing()
  }

  calculateRaySpacing() {
    this.body.aabbNeedsUpdate = true
    this.bounds.copy(this.body.getAABB())
    expandAABB(this.bounds, this.skinWidth * -2)

    const boundsWidth = this.bounds.upperBound[0] - this.bounds.lowerBound[0]
    const boundsHeight = this.bounds.upperBound[1] - this.bounds.lowerBound[1]

    this.horizontalRayCount = Math.round(boundsHeight / this.dstBetweenRays)
    this.verticalRayCount = Math.round(boundsWidth / this.dstBetweenRays)

    this.horizontalRaySpacing = boundsHeight / (this.horizontalRayCount - 1)
    this.verticalRaySpacing = boundsWidth / (this.verticalRayCount - 1)
  }

  updateRaycastOrigins() {
    this.calculateRaySpacing()

    vec2.set(this.raycastOrigins.bottomLeft, this.bounds.lowerBound[0], this.bounds.lowerBound[1])
    vec2.set(this.raycastOrigins.bottomRight, this.bounds.upperBound[0], this.bounds.lowerBound[1])
    vec2.set(this.raycastOrigins.topLeft, this.bounds.lowerBound[0], this.bounds.upperBound[1])
    vec2.set(this.raycastOrigins.topRight, this.bounds.upperBound[0], this.bounds.upperBound[1])
  }
}
