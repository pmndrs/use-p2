import {
    AABB,
    EventEmitter,
    vec2,
} from 'p2-es'

import type {
    Body,
    World,
} from 'p2-es'

import type {Duplet} from './'

function clamp(value: number, min: number, max: number){
    return Math.min(max, Math.max(min, value))
}

function expandAABB({lowerBound, upperBound}: {lowerBound: Duplet, upperBound: Duplet}, amount: number) {
    const halfAmount = amount * 0.5
    lowerBound[0] -= halfAmount
    lowerBound[1] -= halfAmount
    upperBound[0] += halfAmount
    upperBound[1] += halfAmount
}

/**
 * @class RaycastController
 * @constructor
 * @param {object} [options]
 * @param {number} [options.collisionMask=-1]
 * @param {number} [options.skinWidth=0.015]
 * @param {number} [options.horizontalRayCount=4]
 * @param {number} [options.verticalRayCount=4]
 */

export type RaycastControllerOptns = {
    world: World
    body: Body
    collisionMask?: number
    skinWidth?: number
    horizontalRayCount?: number
    verticalRayCount?: number
}

export default class RaycastController extends EventEmitter {
    world: World
    body: Body

    collisionMask: number
    skinWidth: number
    horizontalRayCount: number
    verticalRayCount: number
    horizontalRaySpacing: number
    verticalRaySpacing: number
    raycastOrigins: {
        topLeft: Duplet,
        topRight: Duplet,
        bottomLeft: Duplet,
        bottomRight: Duplet,
    }
    constructor(options: RaycastControllerOptns) {
        super()

        this.world = options.world
        this.body = options.body

        /**
         * @property {number} collisionMask
         */
        this.collisionMask = options.collisionMask !== undefined ? options.collisionMask : -1

        /**
         * @property {number} skinWidth
         */
        this.skinWidth = options.skinWidth !== undefined ? options.skinWidth : 0.015

        /**
         * @property {number} horizontalRayCount
         */
        this.horizontalRayCount = options.horizontalRayCount !== undefined ? options.horizontalRayCount : 4

        /**
         * @property {number} verticalRayCount
         */
        this.verticalRayCount = options.verticalRayCount !== undefined ? options.verticalRayCount : 4

        this.horizontalRaySpacing = 0
        this.verticalRaySpacing = 0

        this.raycastOrigins = {
            topLeft: vec2.create(),
            topRight: vec2.create(),
            bottomLeft: vec2.create(),
            bottomRight: vec2.create()
        }
        const calculateRaySpacing = this.calculateRaySpacing()
        calculateRaySpacing()
    }

    updateRaycastOrigins () {
        const bounds = new AABB()
        const calculateRaySpacing = this.calculateRaySpacing()
        return () => {
            this.body.aabbNeedsUpdate = true
            calculateRaySpacing()
            bounds.copy(this.body.getAABB())

            expandAABB(bounds, this.skinWidth * -2)

            const { raycastOrigins } = this

            vec2.copy(raycastOrigins.bottomLeft, bounds.lowerBound)
            vec2.set(raycastOrigins.bottomRight, bounds.upperBound[0], bounds.lowerBound[1])
            vec2.set(raycastOrigins.topLeft, bounds.lowerBound[0], bounds.upperBound[1])
            vec2.copy(raycastOrigins.topRight, bounds.upperBound)
        }
    }

    calculateRaySpacing() {
        const bounds = new AABB()
        return () => {
            this.body.aabbNeedsUpdate = true
            bounds.copy(this.body.getAABB())
            expandAABB(bounds, this.skinWidth * -2)

            this.horizontalRayCount = clamp(this.horizontalRayCount, 2, Number.MAX_SAFE_INTEGER)
            this.verticalRayCount = clamp(this.verticalRayCount, 2, Number.MAX_SAFE_INTEGER)

            const sizeX = (bounds.upperBound[0] - bounds.lowerBound[0])
            const sizeY = (bounds.upperBound[1] - bounds.lowerBound[1])
            this.horizontalRaySpacing = sizeY / (this.horizontalRayCount - 1)
            this.verticalRaySpacing = sizeX / (this.verticalRayCount - 1)
        }
    }
}
