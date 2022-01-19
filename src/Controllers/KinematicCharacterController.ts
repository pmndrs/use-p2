/**
 * Attaches a Controllers class on the global "p2" object.
 * Original code from: https://github.com/SebLague/2DPlatformer-Tutorial
 */

import {vec2} from 'p2-es'
import type {Duplet} from './'
import Controller from './Controller'

import type {
    World,
    Body,
} from 'p2-es'

function lerp(factor: number, start: number, end: number){
    return start + (end - start) * factor
}

export type KinematicCharacterControllerOptns = {
    world: World
    body: Body
    collisionMask: number
    accelerationTimeAirborne?: number
    accelerationTimeGrounded?: number
    moveSpeed?: number
    wallSlideSpeedMax?: number
    wallStickTime?: number
    wallJumpClimb?: Duplet
    wallJumpOff?: Duplet
    wallLeap?: Duplet
    timeToJumpApex?: number
    maxJumpHeight?: number
    minJumpHeight?: number
    velocityXSmoothing?: number
    velocityXMin?: number
    maxClimbAngle?: number
    maxDescendAngle?: number
    skinWidth?: number
    dstBetweenRays?: number
}

export default class KinematicCharacterController extends Controller {

    input: Duplet

    accelerationTimeAirborne: number
    accelerationTimeGrounded: number
    moveSpeed: number
    wallSlideSpeedMax: number
    wallStickTime: number

    wallJumpClimb: Duplet
    wallJumpOff: Duplet
    wallLeap: Duplet

    gravity: number
    maxJumpVelocity: number
    minJumpVelocity: number

    velocity: Duplet
    velocityXSmoothing: number
    velocityXMin: number

    timeToWallUnstick: number
    _requestJump: boolean
    _requestUnJump: boolean

    constructor(options: KinematicCharacterControllerOptns) {
        super(options)

        this.input = vec2.create()

        this.accelerationTimeAirborne = options.accelerationTimeAirborne || 0.2
        this.accelerationTimeGrounded = options.accelerationTimeGrounded || 0.1
        this.moveSpeed = options.moveSpeed || 6
        this.wallSlideSpeedMax = options.wallSlideSpeedMax || 3
        this.wallStickTime = options.wallStickTime || 0.25

        this.wallJumpClimb = vec2.clone(options.wallJumpClimb || [10, 10])
        this.wallJumpOff = vec2.clone(options.wallJumpOff || [10, 10])
        this.wallLeap = vec2.clone(options.wallLeap || [10, 15])

        const timeToJumpApex = options.timeToJumpApex || 0.4
        const maxJumpHeight = options.maxJumpHeight || 4
        const minJumpHeight = options.minJumpHeight || 1
        this.gravity = -(2 * maxJumpHeight) / timeToJumpApex ** 2
        this.maxJumpVelocity = Math.abs(this.gravity) * timeToJumpApex
        this.minJumpVelocity = Math.sqrt(2 * Math.abs(this.gravity) * minJumpHeight)

        this.velocity = vec2.create()
        this.velocityXSmoothing = options.velocityXSmoothing || 0.2
        this.velocityXMin = options.velocityXMin || 0.0001

        this.timeToWallUnstick = 0
        this._requestJump = false
        this._requestUnJump = false

        const update = this.update()
        this.world.on('postStep', () => update(1/60))
    }

    /**
     * Set the jump button state. If it is down, pass true, else false.
     * @method setJumpKeyState
     * @param {boolean} isDown
     */
    setJumpKeyState(isDown: boolean) {
        if(isDown){
            this._requestJump = true
        } else {
            this._requestUnJump = true
        }
    }

    /**
     * Should be executed after each physics tick, using the physics deltaTime.
     * @param {number} deltaTime
     */
    update() {
        const scaledVelocity = vec2.create()
        return (deltaTime: number) => {
            const input = this.input
            const velocity = this.velocity
            const { collisions } = this

            const wallDirX = (collisions.left) ? -1 : 1
            const targetVelocityX = input[0] * this.moveSpeed
            let smoothing = this.velocityXSmoothing
            smoothing *= collisions.below ? this.accelerationTimeGrounded : this.accelerationTimeAirborne
            const factor = 1 - smoothing ** deltaTime
            velocity[0]	= lerp(factor, velocity[0], targetVelocityX)
            if(Math.abs(velocity[0]) < this.velocityXMin){
                velocity[0] = 0
            }

            let wallSliding = false
            if ((collisions.left || collisions.right) && !collisions.below && velocity[1] < 0) {
                wallSliding = true

                if (velocity[1] < -this.wallSlideSpeedMax) {
                    velocity[1] = -this.wallSlideSpeedMax
                }

                if (this.timeToWallUnstick > 0) {
                    velocity[0] = 0

                    if (input[0] !== wallDirX && input[0] !== 0) {
                        this.timeToWallUnstick -= deltaTime
                    } else {
                        this.timeToWallUnstick = this.wallStickTime
                    }
                } else {
                    this.timeToWallUnstick = this.wallStickTime
                }
            }

            if (this._requestJump) {
                this._requestJump = false

                if (wallSliding) {
                    if (wallDirX === input[0]) {
                        velocity[0] = -wallDirX * this.wallJumpClimb[0]
                        velocity[1] = this.wallJumpClimb[1]
                    } else if (input[0] === 0) {
                        velocity[0] = -wallDirX * this.wallJumpOff[0]
                        velocity[1] = this.wallJumpOff[1]
                    } else {
                        velocity[0] = -wallDirX * this.wallLeap[0]
                        velocity[1] = this.wallLeap[1]
                    }
                }
                if (collisions.below) {
                    velocity[1] = this.maxJumpVelocity
                }
            }

            if (this._requestUnJump) {
                this._requestUnJump = false
                if (velocity[1] > this.minJumpVelocity) {
                    velocity[1] = this.minJumpVelocity
                }
            }
            velocity[1] += this.gravity * deltaTime
            vec2.scale(scaledVelocity, velocity, deltaTime)
            this.move(scaledVelocity, input)

            if (collisions.above || collisions.below) {
                velocity[1] = 0
            }
        }

    }
}

