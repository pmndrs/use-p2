import type { ContactMaterialOptions, MaterialOptions, RayOptions as RayOptionsImpl, Shape } from 'p2-es'
import type { MutableRefObject } from 'react'
import { createContext } from 'react'
import type { Object3D } from 'three'
import type { CannonWorker } from 'worker/cannon-worker'

import type { AtomicProps, BodyProps, BodyShapeType } from './hooks'

export type Duplet = [x: number, y: number]
export type Quad = [x: number, y: number, z: number, w: number]

export type Broadphase = 'Naive' | 'SAP'
export type Solver = 'GS' | 'Split'
export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }

export type ConstraintTypes = 'Distance' | 'Gear' | 'Lock' | 'Prismatic' | 'Revolute'

export interface ConstraintOptns {
  collideConnected?: boolean
}

export interface DistanceConstraintOpts extends ConstraintOptns {
  distance?: number
  localAnchorA?: Duplet
  localAnchorB?: Duplet
  maxForce?: number
}

export interface GearConstraintOpts extends ConstraintOptns {
  angle?: number
  maxTorque?: number
  ratio?: number
}

export interface LockConstraintOpts extends ConstraintOptns {
  localAngleB?: number
  localOffsetB?: Duplet
  maxForce?: number
}

export interface PrismaticConstraintOpts extends ConstraintOptns {
  disableRotationalLock?: boolean
  localAnchorA?: Duplet
  localAnchorB?: Duplet
  localAxisA?: Duplet
  lowerLimit?: number
  maxForce?: number
  upperLimit?: number
}

export interface RevoluteConstraintOpts extends ConstraintOptns {
  localPivotA?: Duplet
  localPivotB?: Duplet
  maxForce?: number
  worldPivot?: Duplet
}

export interface SpringOptns {
  damping?: number
  localAnchorA?: Duplet
  localAnchorB?: Duplet
  restLength?: number
  stiffness?: number
  worldAnchorA?: Duplet
  worldAnchorB?: Duplet
}

export interface WheelInfoOptions {
  localPosition?: Duplet
  sideFriction?: number
}

type WorkerContact = WorkerCollideEvent['data']['contact']
export type CollideEvent = Omit<WorkerCollideEvent['data'], 'body' | 'target' | 'contact'> & {
  body: Object3D
  contact: Omit<WorkerContact, 'bi' | 'bj'> & {
    bi: Object3D
    bj: Object3D
  }
  target: Object3D
}
export type CollideBeginEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideBegin'
}
export type CollideEndEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideEnd'
}
export type RayhitEvent = Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null }

type CannonEvent = CollideBeginEvent | CollideEndEvent | CollideEvent | RayhitEvent
type CallbackByType<T extends { type: string }> = {
  [K in T['type']]?: T extends { type: K } ? (e: T) => void : never
}

type CannonEvents = { [uuid: string]: Partial<CallbackByType<CannonEvent>> }

export type Subscription = Partial<{ [K in SubscriptionName]: (value: PropValue<K>) => void }>
export type Subscriptions = Partial<{
  [id: number]: Subscription
}>

export type PropValue<T extends SubscriptionName = SubscriptionName> = T extends AtomicName
  ? AtomicProps[T]
  : T extends VectorName
  ? Duplet
  : never

export const atomicNames = [
  'allowSleep',
  'angle',
  'angularDamping',
  'collisionFilterGroup',
  'collisionFilterMask',
  'collisionResponse',
  'fixedRotation',
  'isTrigger',
  'linearDamping',
  'mass',
  'material',
  'sleepSpeedLimit',
  'sleepTimeLimit',
  'userData',
] as const
export type AtomicName = typeof atomicNames[number]

export const vectorNames = [
  'angularFactor',
  'angularVelocity',
  'linearFactor',
  'position',
  'velocity',
] as const
export type VectorName = typeof vectorNames[number]

export const subscriptionNames = [...atomicNames, ...vectorNames, 'collisions', 'raysData'] as const
export type SubscriptionName = typeof subscriptionNames[number]

export type SetOpName<T extends AtomicName | VectorName | WorldPropName> = `set${Capitalize<T>}`

type NoProps = symbol

type Operation<T extends OpName, P> = { op: T } & (P extends NoProps ? {} : { props: P })
type WithUUID<T extends OpName, P = NoProps> = Operation<T, P> & { uuid: string }
type WithUUIDs<T extends OpName, P = NoProps> = Operation<T, P> & { uuid: string[] }

type AddConstraintProps = [uuidA: string, uuidB: string, options: {}]

type AddContactMaterialProps = [
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
]

export type RayMode = 'Closest' | 'Any' | 'All'

type AddRayProps = {
  from?: Duplet
  mode: RayMode
  to?: Duplet
} & Pick<RayOptionsImpl, 'checkCollisionResponse' | 'collisionGroup' | 'collisionMask' | 'skipBackfaces'>

export type RayOptions = Omit<AddRayProps, 'mode'>

type AtomicMessage<T extends AtomicName> = WithUUID<SetOpName<AtomicName>, PropValue<T>>
type VectorMessage = WithUUID<SetOpName<VectorName>, Duplet>

type SerializableBodyProps = {
  onCollide: boolean
}

export type SubscriptionTarget = 'bodies' | 'vehicles' | 'controllers'

type SubscribeMessageProps = {
  id: number
  target: SubscriptionTarget
  type: SubscriptionName
}

export type Observation = { [K in AtomicName]: [id: number, value: PropValue<K>, type: K] }[AtomicName]

export type WorkerFrameMessage = {
  data: Buffers & {
    active: boolean
    bodies?: string[]
    observations: Observation[]
    op: 'frame'
  }
}

export type WorkerCollideEvent = {
  data: {
    body: string
    collisionFilters: {
      bodyFilterGroup: number
      bodyFilterMask: number
      targetFilterGroup: number
      targetFilterMask: number
    }
    contact: {
      bi: string
      bj: string
      /** Normal of the contact, relative to the colliding body */
      contactNormal: number[]
      /** Contact point in world space */
      contactPoint: number[]
      id: string
      impactVelocity: number
      ni: number[]
      ri: number[]
      rj: number[]
    }
    op: 'event'
    target: string
    type: 'collide'
  }
}

export type WorkerRayhitEvent = {
  data: {
    body: string | null
    distance: number
    hasHit: boolean
    hitFaceIndex: number
    hitNormalWorld: number[]
    hitPointWorld: number[]
    op: 'event'
    ray: {
      collisionFilterGroup: number
      collisionFilterMask: number
      direction: number[]
      from: number[]
      to: number[]
      uuid: string
    }
    rayFromWorld: number[]
    rayToWorld: number[]
    shape: (Omit<Shape, 'body'> & { body: string }) | null
    shouldStop: boolean
    type: 'rayhit'
  }
}
export type WorkerCollideBeginEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideBegin'
  }
}
export type WorkerCollideEndEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideEnd'
  }
}
export type WorkerEventMessage =
  | WorkerCollideBeginEvent
  | WorkerCollideEndEvent
  | WorkerCollideEvent
  | WorkerRayhitEvent

export type IncomingWorkerMessage = WorkerEventMessage | WorkerFrameMessage

export type WorldPropName = 'axisIndex' | 'broadphase' | 'gravity' | 'iterations' | 'tolerance'

export type StepProps = {
  maxSubSteps?: number
  stepSize: number
  timeSinceLastCalled?: number
}

export type WorldProps = {
  allowSleep: boolean
  axisIndex: number
  broadphase: Broadphase
  defaultContactMaterial: ContactMaterialOptions
  gravity: Duplet
  iterations: number
  normalIndex: number
  quatNormalizeFast: boolean
  quatNormalizeSkip: number
  solver: Solver
  tolerance: number
}

type WorldMessage<T extends WorldPropName> = Operation<SetOpName<T>, WorldProps[T]>

export type CannonMessageMap = {
  addBodies: WithUUIDs<'addBodies', SerializableBodyProps[]> & { type: BodyShapeType }
  addConstraint: WithUUID<'addConstraint', AddConstraintProps> & { type: 'Hinge' | ConstraintTypes }
  addContactMaterial: WithUUID<'addContactMaterial', AddContactMaterialProps>
  addKinematicCharacterController: WithUUIDs<
    'addKinematicCharacterController',
    [
      bodyUUID: string,
      collisionMask: number,
      accelerationTimeAirborne?: number,
      accelerationTimeGrounded?: number,
      moveSpeed?: number,
      wallSlideSpeedMax?: number,
      wallStickTime?: number,
      wallJumpClimb?: Duplet,
      wallJumpOff?: Duplet,
      wallLeap?: Duplet,
      timeToJumpApex?: number,
      maxJumpHeight?: number,
      minJumpHeight?: number,
      velocityXSmoothing?: number,
      velocityXMin?: number,
      maxClimbAngle?: number,
      maxDescendAngle?: number,
      skinWidth?: number,
      dstBetweenRays?: number,
    ]
  >
  addPlatformController: WithUUIDs<
    'addPlatformController',
    [
      bodyUUID: string,
      passengerMask: number,
      localWaypoints: Duplet[],
      speed?: number,
      skinWidth?: number,
      dstBetweenRays?: number,
    ]
  >
  addRay: WithUUID<'addRay', AddRayProps>
  addSpring: WithUUID<'addSpring', [uuidA: string, uuidB: string, options: SpringOptns]>
  addTopDownVehicle: WithUUIDs<'addTopDownVehicle', [chassisBodyUUID: string, wheelInfos: WheelInfoOptions[]]>
  applyForce: WithUUID<'applyForce', [force: Duplet, worldPoint: Duplet]>
  applyImpulse: WithUUID<'applyImpulse', [impulse: Duplet, worldPoint: Duplet]>
  applyLocalForce: WithUUID<'applyLocalForce', [force: Duplet, localPoint: Duplet]>
  applyLocalImpulse: WithUUID<'applyLocalImpulse', [impulse: Duplet, localPoint: Duplet]>
  applyTopDownVehicleEngineForce: WithUUID<
    'applyTopDownVehicleEngineForce',
    [value: number, wheelIndex: number]
  >
  applyTorque: WithUUID<'applyTorque', [torque: Duplet]>
  disableConstraint: WithUUID<'disableConstraint'>
  disableConstraintMotor: WithUUID<'disableConstraintMotor'>
  enableConstraint: WithUUID<'enableConstraint'>
  enableConstraintMotor: WithUUID<'enableConstraintMotor'>
  init: Operation<'init', WorldProps>
  removeBodies: WithUUIDs<'removeBodies'>
  removeConstraint: WithUUID<'removeConstraint'>
  removeContactMaterial: WithUUID<'removeContactMaterial'>
  removeKinematicCharacterController: WithUUIDs<'removeKinematicCharacterController'>
  removePlatformController: WithUUIDs<'removePlatformController'>
  removeRay: WithUUID<'removeRay'>
  removeSpring: WithUUID<'removeSpring'>
  removeTopDownVehicle: WithUUIDs<'removeTopDownVehicle'>
  setAllowSleep: AtomicMessage<'allowSleep'>
  setAngle: WithUUID<SetOpName<'angle'>, number>
  setAngularDamping: AtomicMessage<'angularDamping'>
  setAngularFactor: VectorMessage
  setAngularVelocity: VectorMessage
  setAxisIndex: WorldMessage<'axisIndex'>
  setBroadphase: WorldMessage<'broadphase'>
  setCollisionFilterGroup: AtomicMessage<'collisionFilterGroup'>
  setCollisionFilterMask: AtomicMessage<'collisionFilterMask'>
  setCollisionResponse: AtomicMessage<'collisionResponse'>
  setConstraintMotorMaxForce: WithUUID<'setConstraintMotorMaxForce', number>
  setConstraintMotorSpeed: WithUUID<'setConstraintMotorSpeed', number>
  setFixedRotation: AtomicMessage<'fixedRotation'>
  setGravity: WorldMessage<'gravity'>
  setIsTrigger: AtomicMessage<'isTrigger'>
  setIterations: WorldMessage<'iterations'>
  setKinematicCharacterControllerInput: WithUUID<
    'setKinematicCharacterControllerInput',
    [input: [x: number, y: number]]
  >
  setKinematicCharacterControllerJump: WithUUID<'setKinematicCharacterControllerJump', [isDown: boolean]>
  setLinearDamping: AtomicMessage<'linearDamping'>
  setLinearFactor: VectorMessage
  setMass: AtomicMessage<'mass'>
  setMaterial: AtomicMessage<'material'>
  setPosition: VectorMessage
  setSleepSpeedLimit: AtomicMessage<'sleepSpeedLimit'>
  setSleepTimeLimit: AtomicMessage<'sleepTimeLimit'>
  setSpringDamping: WithUUID<'setSpringDamping', number>
  setSpringRestLength: WithUUID<'setSpringRestLength', number>
  setSpringStiffness: WithUUID<'setSpringStiffness', number>
  setTolerance: WorldMessage<'tolerance'>
  setTopDownVehicleBrake: WithUUID<'setTopDownVehicleBrake', [brake: number, wheelIndex: number]>
  setTopDownVehicleSteeringValue: WithUUID<
    'setTopDownVehicleSteeringValue',
    [value: number, wheelIndex: number]
  >
  setUserData: AtomicMessage<'userData'>
  setVelocity: VectorMessage
  sleep: WithUUID<'sleep'>
  step: Operation<'step', StepProps> & {
    positions: Float32Array
    quaternions: Float32Array
  }
  subscribe: WithUUID<'subscribe', SubscribeMessageProps>
  unsubscribe: Operation<'unsubscribe', number>
  wakeUp: WithUUID<'wakeUp'>
}

type OpName = keyof CannonMessageMap

export type CannonMessageBody<T extends OpName> = Omit<CannonMessageMap[T], 'op'>

type CannonMessage = CannonMessageMap[OpName]
export interface CannonWebWorker extends Worker {
  onmessage: (e: IncomingWorkerMessage) => void
  postMessage(message: CannonMessage, transfer: Transferable[]): void
  postMessage(message: CannonMessage, options?: StructuredSerializeOptions): void
  terminate: () => void
}

export type ProviderContext = {
  bodies: MutableRefObject<{ [uuid: string]: number }>
  events: CannonEvents
  refs: Refs
  subscriptions: Subscriptions
  worker: CannonWorker
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const context = createContext<ProviderContext>({} as ProviderContext)
export const debugContext = createContext<DebugApi>(null!)
