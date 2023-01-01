import type { ContactMaterialOptions } from 'p2-es'
import type { DependencyList, MutableRefObject, Ref, RefObject } from 'react'
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DynamicDrawUsage, InstancedMesh, MathUtils, Object3D } from 'three'

import type {
  AtomicName,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  ConstraintOptns,
  ConstraintTypes,
  DistanceConstraintOpts,
  Duplet,
  GearConstraintOpts,
  LockConstraintOpts,
  MaterialOptions,
  PrismaticConstraintOpts,
  PropValue,
  ProviderContext,
  RayhitEvent,
  RayMode,
  RayOptions,
  RevoluteConstraintOpts,
  SetOpName,
  SpringOptns,
  SubscriptionName,
  SubscriptionTarget,
  VectorName,
  WheelInfoOptions,
} from './setup'
import { context, debugContext } from './setup'
import type { CannonWorkerAPI } from './cannon-worker-api'

export type AtomicProps = {
  allowSleep: boolean
  angle: number
  angularDamping: number
  angularVelocity: number
  collisionFilterGroup: number
  collisionFilterMask: number
  collisionResponse: boolean
  damping: number
  fixedRotation: boolean
  isTrigger: boolean
  mass: number
  material: MaterialOptions
  sleepSpeedLimit: number
  sleepTimeLimit: number
  userData: Record<PropertyKey, any>
}

export type VectorProps = Record<VectorName, Duplet>

export type BodyProps<T extends any[] = unknown[]> = Partial<AtomicProps> &
  Partial<VectorProps> & {
    args?: T
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
    type?: 'Dynamic' | 'Static' | 'Kinematic'
  }

export type BodyPropsArgsRequired<T extends any[] = unknown[]> = BodyProps<T> & {
  args: T
}

export type ShapeType =
  | 'Box'
  | 'Circle'
  | 'Capsule'
  | 'Particle'
  | 'Plane'
  | 'Convex'
  | 'Line'
  | 'Heightfield'
export type BodyShapeType = ShapeType | 'Compound'

export type BoxArgs = [width?: number, height?: number]
export type CapsuleArgs = [length?: number, radius?: number]
export type CircleArgs = [radius?: number]
export type ConvexArgs = [vertices: number[][], axes?: number[][]]
export type LineArgs = [length?: number]
export type HeightfieldArgs = [
  heights: number[],
  options?: { elementWidth?: number; maxValue?: number; minValue?: number },
]

export type BoxProps = BodyProps<BoxArgs>
export type CapsuleProps = BodyProps<CapsuleArgs>
export type CircleProps = BodyProps<CircleArgs>
export type ConvexProps = BodyProps<ConvexArgs>
export type LineProps = BodyProps<LineArgs>
export type HeightfieldProps = BodyPropsArgsRequired<HeightfieldArgs>

export interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

export type AtomicApi<K extends AtomicName> = {
  set: (value: AtomicProps[K]) => void
  subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

export type VectorApi = {
  copy: (array: Duplet) => void
  set: (x: number, y: number) => void
  subscribe: (callback: (value: Duplet) => void) => () => void
}

export type WorkerApi = {
  [K in AtomicName]: AtomicApi<K>
} & {
  [K in VectorName]: VectorApi
} & {
  applyForce: (force: Duplet, worldPoint: Duplet) => void
  applyImpulse: (impulse: Duplet, worldPoint: Duplet) => void
  applyLocalForce: (force: Duplet, localPoint: Duplet) => void
  applyLocalImpulse: (impulse: Duplet, localPoint: Duplet) => void
  applyTorque: (torque: Duplet) => void
  sleep: () => void
  wakeUp: () => void
}

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api = [RefObject<Object3D>, PublicApi]

const temp = new Object3D()

function useForwardedRef<T>(ref: Ref<T>): MutableRefObject<T | null> {
  const nullRef = useRef<T>(null)
  return ref && typeof ref !== 'function' ? ref : nullRef
}

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

function getUUID(ref: Ref<Object3D>, index?: number): string | null {
  const suffix = index === undefined ? '' : `/${index}`
  if (typeof ref === 'function') return null
  return ref && ref.current && `${ref.current.uuid}${suffix}`
}

let incrementingId = 0

function subscribe<T extends SubscriptionName>(
  ref: RefObject<Object3D>,
  worker: CannonWorkerAPI,
  subscriptions: ProviderContext['subscriptions'],
  type: T,
  index?: number,
  target: SubscriptionTarget = 'bodies',
) {
  return (callback: (value: PropValue<T>) => void) => {
    const id = incrementingId++
    subscriptions[id] = { [type]: callback }
    const uuid = getUUID(ref, index)
    uuid && worker.subscribe({ props: { id, target, type }, uuid })
    return () => {
      delete subscriptions[id]
      worker.unsubscribe({ props: id })
    }
  }
}

function prepare(object: Object3D, props: BodyProps) {
  object.userData = props.userData || {}
  // @todo match normal
  // object.position.set(...(props.position || [0, 0, 0]))
  // object.rotation.set(...(props.rotation || [0, 0, 0]))
  object.updateMatrix()
}

function setupCollision(
  events: ProviderContext['events'],
  { onCollide, onCollideBegin, onCollideEnd }: Partial<BodyProps>,
  uuid: string,
) {
  events[uuid] = {
    collide: onCollide,
    collideBegin: onCollideBegin,
    collideEnd: onCollideEnd,
  }
}

type GetByIndex<T extends BodyProps> = (index: number) => T
type ArgFn<T> = (args: T) => unknown[]

function useBody<B extends BodyProps<unknown[]>>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef: Ref<Object3D>,
  deps: DependencyList = [],
): Api {
  const ref = useForwardedRef(fwdRef)
  const { worker, refs, events, subscriptions } = useContext(context)
  const debugApi = useContext(debugContext)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const object = ref.current
    const currentWorker = worker

    const objectCount =
      object instanceof InstancedMesh ? (object.instanceMatrix.setUsage(DynamicDrawUsage), object.count) : 1

    const uuid =
      object instanceof InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${object.uuid}/${i}`)
        : [object.uuid]

    const props: (B & { args: unknown })[] =
      object instanceof InstancedMesh
        ? uuid.map((id, i) => {
            const props = fn(i)
            prepare(temp, props)
            object.setMatrixAt(i, temp.matrix)
            object.instanceMatrix.needsUpdate = true
            refs[id] = object
            if (debugApi) debugApi.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })
        : uuid.map((id, i) => {
            const props = fn(i)
            prepare(object, props)
            refs[id] = object
            if (debugApi) debugApi.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })

    // Register on mount, unregister on unmount
    currentWorker.addBodies({
      props: props.map(({ onCollide, onCollideBegin, onCollideEnd, ...serializableProps }) => {
        return { onCollide: Boolean(onCollide), ...serializableProps }
      }),
      type,
      uuid,
    })
    return () => {
      uuid.forEach((id) => {
        delete refs[id]
        if (debugApi) debugApi.remove(id)
        delete events[id]
      })
      currentWorker.removeBodies({ uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const makeAtomic = <T extends AtomicName>(type: T, index?: number) => {
      const op: SetOpName<T> = `set${capitalize(type)}`

      return {
        set: (value: PropValue<T>) => {
          const uuid = getUUID(ref, index)
          uuid &&
            worker[op]({
              props: value,
              uuid,
            } as never)
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    const makeVec = (type: VectorName, index?: number) => {
      const op: SetOpName<VectorName> = `set${capitalize(type)}`
      return {
        copy: (vec: number[]) => {
          const uuid = getUUID(ref, index)
          uuid && worker[op]({ props: [vec[0], vec[1]], uuid })
        },
        set: (x: number, y: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker[op]({ props: [x, y], uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    function makeApi(index?: number): WorkerApi {
      return {
        allowSleep: makeAtomic('allowSleep', index),
        angle: makeAtomic('angle', index),
        angularDamping: makeAtomic('angularDamping', index),
        angularVelocity: makeAtomic('angularVelocity', index),
        applyForce(force: Duplet, worldPoint: Duplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyForce({ props: [force, worldPoint], uuid })
        },
        applyImpulse(impulse: Duplet, worldPoint: Duplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyImpulse({ props: [impulse, worldPoint], uuid })
        },
        applyLocalForce(force: Duplet, localPoint: Duplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyLocalForce({ props: [force, localPoint], uuid })
        },
        applyLocalImpulse(impulse: Duplet, localPoint: Duplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyLocalImpulse({ props: [impulse, localPoint], uuid })
        },
        applyTorque(torque: Duplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyTorque({ props: [torque], uuid })
        },
        collisionFilterGroup: makeAtomic('collisionFilterGroup', index),
        collisionFilterMask: makeAtomic('collisionFilterMask', index),
        collisionResponse: makeAtomic('collisionResponse', index),
        damping: makeAtomic('damping', index),
        fixedRotation: makeAtomic('fixedRotation', index),
        isTrigger: makeAtomic('isTrigger', index),
        mass: makeAtomic('mass', index),
        material: makeAtomic('material', index),
        position: makeVec('position', index),
        sleep() {
          const uuid = getUUID(ref, index)
          uuid && worker.sleep({ uuid })
        },
        sleepSpeedLimit: makeAtomic('sleepSpeedLimit', index),
        sleepTimeLimit: makeAtomic('sleepTimeLimit', index),
        userData: makeAtomic('userData', index),
        velocity: makeVec('velocity', index),
        wakeUp() {
          const uuid = getUUID(ref, index)
          uuid && worker.wakeUp({ uuid })
        },
      }
    }

    const cache: { [index: number]: WorkerApi } = {}
    return {
      ...makeApi(undefined),
      at: (index: number) => cache[index] || (cache[index] = makeApi(index)),
    }
  }, [])
  return [ref, api]
}

export function usePlane(fn: GetByIndex<BodyProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}

export function useBox(fn: GetByIndex<BoxProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Box', fn, (args = [] as BoxArgs) => args, fwdRef, deps)
}

export function useCapsule(
  fn: GetByIndex<CapsuleProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Capsule', fn, (args = [] as CapsuleArgs) => args, fwdRef, deps)
}

export function useCircle(fn: GetByIndex<CircleProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Circle', fn, (args = [] as CircleArgs) => args, fwdRef, deps)
}

export function useConvex(fn: GetByIndex<ConvexProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Convex', fn, (args = [[], []] as ConvexArgs) => args, fwdRef, deps)
}

export function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Heightfield', fn, (args = [[], {}] as HeightfieldArgs) => args, fwdRef, deps)
}

export function useLine(fn: GetByIndex<LineProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Line', fn, (args = [] as LineArgs) => args, fwdRef, deps)
}

export function useParticle(fn: GetByIndex<BodyProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}

export function useCompoundBody(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    disable: () => void
    enable: () => void
  },
]

type MotorConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    disable: () => void
    disableMotor: () => void
    enable: () => void
    enableMotor: () => void
    setMotorMaxForce: (value: number) => void
    setMotorSpeed: (value: number) => void
  },
]

type SpringApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    setDamping: (value: number) => void
    setRestLength: (value: number) => void
    setStiffness: (value: number) => void
  },
]

type ConstraintORHingeApi<T extends 'Prismatic' | 'Revolute' | ConstraintTypes> = T extends ConstraintTypes
  ? ConstraintApi
  : MotorConstraintApi

function useConstraint<T extends 'Prismatic' | 'Revolute' | ConstraintTypes>(
  type: T,
  bodyA: Ref<Object3D>,
  bodyB: Ref<Object3D>,
  optns: ConstraintOptns | PrismaticConstraintOpts | RevoluteConstraintOpts = {},
  deps: DependencyList = [],
): ConstraintORHingeApi<T> {
  const { worker } = useContext(context)
  const uuid = MathUtils.generateUUID()

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addConstraint({
        props: [refA.current.uuid, refB.current.uuid, optns],
        type,
        uuid,
      })
      return () => worker.removeConstraint({ uuid })
    }
  }, deps)

  const api = useMemo(() => {
    if (type === 'Prismatic' || type === 'Revolute') {
      return {
        disableMotor: () => worker.disableConstraintMotor({ uuid }),
        enableMotor: () => worker.enableConstraintMotor({ uuid }),
        setMotorSpeed: (value: number) => worker.setConstraintMotorSpeed({ props: value, uuid }),
      }
    }

    return {}
  }, deps)

  return [refA, refB, api] as ConstraintORHingeApi<T>
}

export function useDistanceConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: DistanceConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}

export function useGearConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: GearConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Gear', bodyA, bodyB, optns, deps)
}

export function useLockConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: LockConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function usePrismaticConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: PrismaticConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Prismatic', bodyA, bodyB, optns, deps)
}

export function useRevoluteConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: RevoluteConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Revolute', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: SpringOptns,
  deps: DependencyList = [],
): SpringApi {
  const { worker } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addSpring({
        props: [refA.current.uuid, refB.current.uuid, optns],
        uuid,
      })
      return () => {
        worker.removeSpring({ uuid })
      }
    }
  }, deps)

  const api = useMemo(
    () => ({
      setDamping: (value: number) => worker.setSpringDamping({ props: value, uuid }),
      setRestLength: (value: number) => worker.setSpringRestLength({ props: value, uuid }),
      setStiffness: (value: number) => worker.setSpringStiffness({ props: value, uuid }),
    }),
    deps,
  )

  return [refA, refB, api]
}

function useRay(
  mode: RayMode,
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = { rayhit: callback }
    worker.addRay({ props: { ...options, mode }, uuid })
    return () => {
      worker.removeRay({ uuid })
      delete events[uuid]
    }
  }, deps)
}

export function useRaycastClosest(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Closest', options, callback, deps)
}

export function useRaycastAny(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Any', options, callback, deps)
}

export function useRaycastAll(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('All', options, callback, deps)
}

export interface TopDownVehiclePublicApi {
  applyEngineForce: (value: number, wheelIndex: number) => void
  setBrake: (brake: number, wheelIndex: number) => void
  setSteeringValue: (value: number, wheelIndex: number) => void
}

export interface TopDownVehicleProps {
  chassisBody: Ref<Object3D>
  wheels: WheelInfoOptions[]
}

export function useTopDownVehicle(
  fn: () => TopDownVehicleProps,
  fwdRef: Ref<Object3D> = null,
  deps: DependencyList = [],
): [RefObject<Object3D>, TopDownVehiclePublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string = ref.current.uuid
    const { chassisBody, wheels } = fn()

    const chassisBodyUUID = getUUID(chassisBody)
    if (!chassisBodyUUID) return

    currentWorker.addTopDownVehicle({
      props: [chassisBodyUUID, wheels],
      uuid,
    })
    return () => {
      currentWorker.removeTopDownVehicle({ uuid })
    }
  }, deps)

  const api = useMemo<TopDownVehiclePublicApi>(() => {
    return {
      applyEngineForce(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.applyTopDownVehicleEngineForce({ props: [value, wheelIndex], uuid })
      },
      setBrake(brake: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.setTopDownVehicleBrake({ props: [brake, wheelIndex], uuid })
      },
      setSteeringValue(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.setTopDownVehicleSteeringValue({ props: [value, wheelIndex], uuid })
      },
    }
  }, deps)
  return [ref, api]
}

export function useContactMaterial(
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
  deps: DependencyList = [],
): void {
  const { worker } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())

  useEffect(() => {
    worker.addContactMaterial({
      props: [materialA, materialB, options],
      uuid,
    })
    return () => {
      worker.removeContactMaterial({ uuid })
    }
  }, deps)
}

type KinematicCharacterControllerCollisions = {
  above: boolean
  below: boolean
  climbingSlope: boolean
  descendingSlope: boolean
  faceDir: number
  fallingThroughPlatform: boolean
  left: boolean
  right: boolean
  slopeAngle: number
  slopeAngleOld: number
  velocityOld: Duplet
}
export interface KinematicCharacterControllerPublicApi {
  collisions: {
    subscribe: (callback: (collisions: KinematicCharacterControllerCollisions) => void) => void
  }
  raysData: {
    subscribe: (callback: (raysData: []) => void) => void
  }
  setInput: (input: [x: number, y: number]) => void
  setJump: (isDown: boolean) => void
}

export interface KinematicCharacterControllerProps {
  accelerationTimeAirborne?: number
  accelerationTimeGrounded?: number
  body: Ref<Object3D>
  collisionMask: number
  dstBetweenRays?: number
  maxClimbAngle?: number
  maxDescendAngle?: number
  maxJumpHeight?: number
  minJumpHeight?: number
  moveSpeed?: number
  skinWidth?: number
  timeToJumpApex?: number
  velocityXMin?: number
  velocityXSmoothing?: number
  wallJumpClimb?: Duplet
  wallJumpOff?: Duplet
  wallLeap?: Duplet
  wallSlideSpeedMax?: number
  wallStickTime?: number
}

export function useKinematicCharacterController(
  fn: () => KinematicCharacterControllerProps,
  fwdRef: Ref<Object3D> = null,
  deps: DependencyList = [],
): [RefObject<Object3D>, KinematicCharacterControllerPublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string = ref.current.uuid
    const kinematicCharacterControllerProps = fn()

    const bodyUUID = getUUID(kinematicCharacterControllerProps.body)
    if (!bodyUUID) return

    currentWorker.addKinematicCharacterController({
      props: [
        bodyUUID,
        kinematicCharacterControllerProps.collisionMask,
        kinematicCharacterControllerProps.accelerationTimeAirborne,
        kinematicCharacterControllerProps.accelerationTimeGrounded,
        kinematicCharacterControllerProps.moveSpeed,
        kinematicCharacterControllerProps.wallSlideSpeedMax,
        kinematicCharacterControllerProps.wallStickTime,
        kinematicCharacterControllerProps.wallJumpClimb,
        kinematicCharacterControllerProps.wallJumpOff,
        kinematicCharacterControllerProps.wallLeap,
        kinematicCharacterControllerProps.timeToJumpApex,
        kinematicCharacterControllerProps.maxJumpHeight,
        kinematicCharacterControllerProps.minJumpHeight,
        kinematicCharacterControllerProps.velocityXSmoothing,
        kinematicCharacterControllerProps.velocityXMin,
        kinematicCharacterControllerProps.maxClimbAngle,
        kinematicCharacterControllerProps.maxDescendAngle,
        kinematicCharacterControllerProps.skinWidth,
        kinematicCharacterControllerProps.dstBetweenRays,
      ],
      uuid,
    })
    return () => {
      currentWorker.removeKinematicCharacterController({ uuid })
    }
  }, deps)

  const api = useMemo<KinematicCharacterControllerPublicApi>(() => {
    return {
      collisions: {
        subscribe: subscribe(ref, worker, subscriptions, 'collisions', undefined, 'controllers'),
      },
      raysData: {
        subscribe: subscribe(ref, worker, subscriptions, 'raysData', undefined, 'controllers'),
      },
      setInput(input: [x: number, y: number]) {
        const uuid = getUUID(ref)
        uuid && worker.setKinematicCharacterControllerInput({ props: input, uuid })
      },
      setJump(isDown: boolean) {
        const uuid = getUUID(ref)
        uuid && worker.setKinematicCharacterControllerJump({ props: isDown, uuid })
      },
    }
  }, deps)
  return [ref, api]
}

export interface PlatformControllerPublicApi {
  collisions: {
    subscribe: (callback: (collisions: {}) => void) => void
  }
  raysData: {
    subscribe: (callback: (raysData: []) => void) => void
  }
}

export interface PlatformControllerProps {
  body: Ref<Object3D>
  dstBetweenRays?: number
  localWaypoints: Duplet[]
  passengerMask: number
  skinWidth?: number
  speed?: number
}

export function usePlatformController(
  fn: () => PlatformControllerProps,
  fwdRef: Ref<Object3D> = null,
  deps: DependencyList = [],
): [RefObject<Object3D>, PlatformControllerPublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string = ref.current.uuid
    const platformControllerProps = fn()

    const bodyUUID = getUUID(platformControllerProps.body)
    if (!bodyUUID) return

    currentWorker.addPlatformController({
      props: [
        bodyUUID,
        platformControllerProps.passengerMask,
        platformControllerProps.localWaypoints,
        platformControllerProps.speed,
        platformControllerProps.skinWidth,
        platformControllerProps.dstBetweenRays,
      ],
      uuid,
    })
    return () => {
      currentWorker.removePlatformController({ uuid })
    }
  }, deps)

  const api = useMemo<PlatformControllerPublicApi>(() => {
    return {
      collisions: {
        subscribe: subscribe(ref, worker, subscriptions, 'collisions', undefined, 'controllers'),
      },
      raysData: {
        subscribe: subscribe(ref, worker, subscriptions, 'raysData', undefined, 'controllers'),
      },
    }
  }, deps)
  return [ref, api]
}
