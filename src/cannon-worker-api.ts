import EventEmitter from 'events'
import Worker from 'web-worker:./worker/index.ts'

import type {
  Broadphase,
  CannonMessageBody,
  CannonWebWorker,
  Duplet,
  IncomingWorkerMessage,
  StepProps,
  WorldProps,
} from './setup'

export type CannonWorkerProps = Partial<WorldProps> & { size?: number }

export class CannonWorkerAPI extends EventEmitter {
  get axisIndex(): 0 | 1 | 2 {
    return this.config.axisIndex
  }

  set axisIndex(value: 0 | 1 | 2) {
    this.config.axisIndex = value
    this.worker.postMessage({ op: 'setAxisIndex', props: value })
  }

  get broadphase(): Broadphase {
    return this.config.broadphase
  }

  set broadphase(value: Broadphase) {
    this.config.broadphase = value
    this.worker.postMessage({ op: 'setBroadphase', props: value })
  }

  get gravity(): Duplet {
    return this.config.gravity
  }

  set gravity(value: Duplet) {
    this.config.gravity = value
    this.worker.postMessage({ op: 'setGravity', props: value })
  }

  get iterations(): number {
    return this.config.iterations
  }

  set iterations(value: number) {
    this.config.iterations = value
    this.worker.postMessage({ op: 'setIterations', props: value })
  }

  get tolerance(): number {
    return this.config.tolerance
  }

  set tolerance(value: number) {
    this.config.tolerance = value
    this.worker.postMessage({ op: 'setTolerance', props: value })
  }

  private buffers: {
    positions: Float32Array
    quaternions: Float32Array
  }

  private config: Required<CannonWorkerProps>

  private worker = new Worker() as CannonWebWorker

  constructor({
    allowSleep = false,
    axisIndex = 0,
    broadphase = 'Naive',
    defaultContactMaterial = { friction: 0.3, restitution: 0 },
    gravity = [0, -9.81],
    iterations = 5,
    normalIndex = 0,
    quatNormalizeFast = false,
    quatNormalizeSkip = 0,
    size = 1000,
    solver = 'GS',
    tolerance = 0.001,
  }: CannonWorkerProps) {
    super()

    this.config = {
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      gravity,
      iterations,
      normalIndex,
      quatNormalizeFast,
      quatNormalizeSkip,
      size,
      solver,
      tolerance,
    }

    this.buffers = {
      positions: new Float32Array(size * 3),
      quaternions: new Float32Array(size * 4),
    }

    this.worker.onmessage = (message: IncomingWorkerMessage) => {
      if (message.data.op === 'frame') {
        this.buffers.positions = message.data.positions
        this.buffers.quaternions = message.data.quaternions
        this.emit(message.data.op, message.data)
        return
      }

      this.emit(message.data.type, message.data)
    }
  }

  addBodies({ props, type, uuid }: CannonMessageBody<'addBodies'>): void {
    this.worker.postMessage({
      op: 'addBodies',
      props,
      type,
      uuid,
    })
  }

  addConstraint({ props: [refA, refB, optns], type, uuid }: CannonMessageBody<'addConstraint'>): void {
    this.worker.postMessage({
      op: 'addConstraint',
      props: [refA, refB, optns],
      type,
      uuid,
    })
  }

  addContactMaterial({ props, uuid }: CannonMessageBody<'addContactMaterial'>): void {
    this.worker.postMessage({
      op: 'addContactMaterial',
      props,
      uuid,
    })
  }

  addKinematicCharacterController({
    props: [
      accelerationTimeAirborne,
      accelerationTimeGrounded,
      body,
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
    ],
    uuid,
  }: CannonMessageBody<'addKinematicCharacterController'>): void {
    this.worker.postMessage({
      op: 'addKinematicCharacterController',
      props: [
        accelerationTimeAirborne,
        accelerationTimeGrounded,
        body,
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
      ],
      uuid,
    })
  }

  addPlatformController({
    props: [body, passengerMask, localWaypoints, speed, skinWidth, dstBetweenRays],
    uuid,
  }: CannonMessageBody<'addPlatformController'>): void {
    this.worker.postMessage({
      op: 'addPlatformController',
      props: [body, passengerMask, localWaypoints, speed, skinWidth, dstBetweenRays],
      uuid,
    })
  }

  addRay({ props, uuid }: CannonMessageBody<'addRay'>): void {
    this.worker.postMessage({ op: 'addRay', props, uuid })
  }

  addSpring({ props: [refA, refB, optns], uuid }: CannonMessageBody<'addSpring'>): void {
    this.worker.postMessage({
      op: 'addSpring',
      props: [refA, refB, optns],
      uuid,
    })
  }

  addTopDownVehicle({
    props: [chassisBodyUUID, wheelInfos],
    uuid,
  }: CannonMessageBody<'addTopDownVehicle'>): void {
    this.worker.postMessage({
      op: 'addTopDownVehicle',
      props: [chassisBodyUUID, wheelInfos],
      uuid,
    })
  }

  applyForce({ props, uuid }: CannonMessageBody<'applyForce'>): void {
    this.worker.postMessage({ op: 'applyForce', props, uuid })
  }

  applyImpulse({ props, uuid }: CannonMessageBody<'applyImpulse'>): void {
    this.worker.postMessage({ op: 'applyImpulse', props, uuid })
  }

  applyLocalForce({ props, uuid }: CannonMessageBody<'applyLocalForce'>): void {
    this.worker.postMessage({ op: 'applyLocalForce', props, uuid })
  }

  applyLocalImpulse({ props, uuid }: CannonMessageBody<'applyLocalImpulse'>): void {
    this.worker.postMessage({ op: 'applyLocalImpulse', props, uuid })
  }

  applyTopDownVehicleEngineForce({ props, uuid }: CannonMessageBody<'applyTopDownVehicleEngineForce'>): void {
    this.worker.postMessage({
      op: 'applyTopDownVehicleEngineForce',
      props,
      uuid,
    })
  }

  applyTorque({ props, uuid }: CannonMessageBody<'applyTorque'>): void {
    this.worker.postMessage({ op: 'applyTorque', props, uuid })
  }

  disableConstraintMotor({ uuid }: CannonMessageBody<'disableConstraintMotor'>): void {
    this.worker.postMessage({ op: 'disableConstraintMotor', uuid })
  }

  enableConstraintMotor({ uuid }: CannonMessageBody<'enableConstraintMotor'>): void {
    this.worker.postMessage({ op: 'enableConstraintMotor', uuid })
  }

  init(): void {
    const {
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      gravity,
      iterations,
      normalIndex,
      quatNormalizeFast,
      quatNormalizeSkip,
      solver,
      tolerance,
    } = this.config

    this.worker.postMessage({
      op: 'init',
      props: {
        allowSleep,
        axisIndex,
        broadphase,
        defaultContactMaterial,
        gravity,
        iterations,
        normalIndex,
        quatNormalizeFast,
        quatNormalizeSkip,
        solver,
        tolerance,
      },
    })
  }

  removeBodies({ uuid }: CannonMessageBody<'removeBodies'>): void {
    this.worker.postMessage({ op: 'removeBodies', uuid })
  }

  removeConstraint({ uuid }: CannonMessageBody<'removeConstraint'>): void {
    this.worker.postMessage({ op: 'removeConstraint', uuid })
  }

  removeContactMaterial({ uuid }: CannonMessageBody<'removeContactMaterial'>): void {
    this.worker.postMessage({ op: 'removeContactMaterial', uuid })
  }

  removeKinematicCharacterController({
    uuid,
  }: CannonMessageBody<'removeKinematicCharacterController'>): void {
    this.worker.postMessage({ op: 'removeKinematicCharacterController', uuid })
  }

  removePlatformController({ uuid }: CannonMessageBody<'removePlatformController'>): void {
    this.worker.postMessage({ op: 'removePlatformController', uuid })
  }

  removeRay({ uuid }: CannonMessageBody<'removeRay'>): void {
    this.worker.postMessage({ op: 'removeRay', uuid })
  }

  removeSpring({ uuid }: CannonMessageBody<'removeSpring'>): void {
    this.worker.postMessage({ op: 'removeSpring', uuid })
  }

  removeTopDownVehicle({ uuid }: CannonMessageBody<'removeTopDownVehicle'>): void {
    this.worker.postMessage({ op: 'removeTopDownVehicle', uuid })
  }

  setAllowSleep({ props, uuid }: CannonMessageBody<'setAllowSleep'>): void {
    this.worker.postMessage({ op: 'setAllowSleep', props, uuid })
  }

  setAngle({ props, uuid }: CannonMessageBody<'setAngle'>): void {
    this.worker.postMessage({ op: 'setAngle', props, uuid })
  }

  setAngularDamping({ props, uuid }: CannonMessageBody<'setAngularDamping'>): void {
    this.worker.postMessage({ op: 'setAngularDamping', props, uuid })
  }

  setAngularVelocity({ props, uuid }: CannonMessageBody<'setAngularVelocity'>): void {
    this.worker.postMessage({ op: 'setAngularVelocity', props, uuid })
  }

  setCollisionFilterGroup({ props, uuid }: CannonMessageBody<'setCollisionFilterGroup'>): void {
    this.worker.postMessage({ op: 'setCollisionFilterGroup', props, uuid })
  }

  setCollisionFilterMask({ props, uuid }: CannonMessageBody<'setCollisionFilterMask'>): void {
    this.worker.postMessage({ op: 'setCollisionFilterMask', props, uuid })
  }

  setCollisionResponse({ props, uuid }: CannonMessageBody<'setCollisionResponse'>): void {
    this.worker.postMessage({ op: 'setCollisionResponse', props, uuid })
  }

  setConstraintMotorSpeed({ props, uuid }: CannonMessageBody<'setConstraintMotorSpeed'>): void {
    this.worker.postMessage({ op: 'setConstraintMotorSpeed', props, uuid })
  }

  setDamping({ props, uuid }: CannonMessageBody<'setDamping'>): void {
    this.worker.postMessage({ op: 'setDamping', props, uuid })
  }

  setFixedRotation({ props, uuid }: CannonMessageBody<'setFixedRotation'>): void {
    this.worker.postMessage({ op: 'setFixedRotation', props, uuid })
  }

  setIsTrigger({ props, uuid }: CannonMessageBody<'setIsTrigger'>): void {
    this.worker.postMessage({ op: 'setIsTrigger', props, uuid })
  }

  setKinematicCharacterControllerInput({
    props,
    uuid,
  }: CannonMessageBody<'setKinematicCharacterControllerInput'>): void {
    this.worker.postMessage({ op: 'setKinematicCharacterControllerInput', props, uuid })
  }

  setKinematicCharacterControllerJump({
    props,
    uuid,
  }: CannonMessageBody<'setKinematicCharacterControllerJump'>): void {
    this.worker.postMessage({ op: 'setKinematicCharacterControllerJump', props, uuid })
  }

  setMass({ props, uuid }: CannonMessageBody<'setMass'>): void {
    this.worker.postMessage({ op: 'setMass', props, uuid })
  }

  setMaterial({ props, uuid }: CannonMessageBody<'setMaterial'>): void {
    this.worker.postMessage({ op: 'setMaterial', props, uuid })
  }

  setPosition({ props, uuid }: CannonMessageBody<'setPosition'>): void {
    this.worker.postMessage({ op: 'setPosition', props, uuid })
  }

  setSleepSpeedLimit({ props, uuid }: CannonMessageBody<'setSleepSpeedLimit'>): void {
    this.worker.postMessage({ op: 'setSleepSpeedLimit', props, uuid })
  }

  setSleepTimeLimit({ props, uuid }: CannonMessageBody<'setSleepTimeLimit'>): void {
    this.worker.postMessage({ op: 'setSleepTimeLimit', props, uuid })
  }

  setSpringDamping({ props, uuid }: CannonMessageBody<'setSpringDamping'>): void {
    this.worker.postMessage({ op: 'setSpringDamping', props, uuid })
  }

  setSpringRestLength({ props, uuid }: CannonMessageBody<'setSpringRestLength'>): void {
    this.worker.postMessage({ op: 'setSpringRestLength', props, uuid })
  }

  setSpringStiffness({ props, uuid }: CannonMessageBody<'setSpringStiffness'>): void {
    this.worker.postMessage({ op: 'setSpringStiffness', props, uuid })
  }

  setTopDownVehicleBrake({ props, uuid }: CannonMessageBody<'setTopDownVehicleBrake'>): void {
    this.worker.postMessage({ op: 'setTopDownVehicleBrake', props, uuid })
  }

  setTopDownVehicleSteeringValue({ props, uuid }: CannonMessageBody<'setTopDownVehicleSteeringValue'>): void {
    this.worker.postMessage({
      op: 'setTopDownVehicleSteeringValue',
      props,
      uuid,
    })
  }

  setUserData({ props, uuid }: CannonMessageBody<'setUserData'>): void {
    this.worker.postMessage({ op: 'setUserData', props, uuid })
  }

  setVelocity({ props, uuid }: CannonMessageBody<'setVelocity'>): void {
    this.worker.postMessage({ op: 'setVelocity', props, uuid })
  }

  sleep({ uuid }: CannonMessageBody<'sleep'>): void {
    this.worker.postMessage({ op: 'sleep', uuid })
  }

  step(props: StepProps): void {
    const {
      buffers: { positions, quaternions },
    } = this

    if (!positions.byteLength && !quaternions.byteLength) return

    this.worker.postMessage({ op: 'step', positions, props, quaternions }, [
      positions.buffer,
      quaternions.buffer,
    ])
  }

  subscribe({ props: { id, target, type }, uuid }: CannonMessageBody<'subscribe'>): void {
    this.worker.postMessage({ op: 'subscribe', props: { id, target, type }, uuid })
  }

  terminate(): void {
    this.worker.terminate()
  }

  unsubscribe({ props }: CannonMessageBody<'unsubscribe'>): void {
    this.worker.postMessage({ op: 'unsubscribe', props })
  }

  wakeUp({ uuid }: CannonMessageBody<'wakeUp'>): void {
    this.worker.postMessage({ op: 'wakeUp', uuid })
  }
}
