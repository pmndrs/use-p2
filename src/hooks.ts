import {useLayoutEffect, useContext, useRef, useMemo, useEffect, useState} from 'react'
import {DynamicDrawUsage, InstancedMesh, MathUtils, Object3D} from 'three'
import type {Vector3, Quaternion} from 'three'
import {context, debugContext} from './setup'

import type {ContactMaterialOptions} from 'p2-es'
import type {DependencyList, MutableRefObject, Ref, RefObject} from 'react'
import type {
    AddRayMessage,
    AtomicName,
    CannonWorker,
    CollideBeginEvent,
    CollideEndEvent,
    CollideEvent,
    PropValue,
    ProviderContext,
    RayhitEvent,
    RayMode,
    SetOpName,
    SubscriptionName,
    SubscriptionTarget,
    VectorName,
} from './setup'

export type AtomicProps = {
    allowSleep: boolean
    angle: number
    angularDamping: number
    collisionFilterGroup: number
    collisionFilterMask: number
    collisionResponse: number
    fixedRotation: boolean
    isTrigger: boolean
    linearDamping: number
    mass: number
    material: ContactMaterialOptions
    sleepSpeedLimit: number
    sleepTimeLimit: number
    userData: {}
}

export type Triplet = [x: number, y: number, z: number]
export type Duplet = [x: number, y: number]

export type VectorProps = Record<VectorName, Duplet>
type VectorTypes = Vector3 | Triplet

export type Quad = [x: number, y: number, z: number, w: number]

export type BodyProps<T extends any[] = unknown[]> = Partial<AtomicProps> &
    Partial<VectorProps> & {
    args?: T
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
    quaternion?: Quad
    rotation?: Triplet
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

export type CapsuleArgs = [length?: number, radius?: number]
export type PlaneArgs = [width?: number, height?: number, widthSegments?: number, heightSegments?: number]
export type CircleArgs = [radius: number]
export type TrimeshArgs = [vertices: ArrayLike<number>, indices: ArrayLike<number>]
export type HeightfieldArgs = [
    data: number[][],
    options: { elementSize?: number; maxValue?: number; minValue?: number },
]
export type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
    vertices?: V[],
    faces?: number[][],
    normals?: V[],
    axes?: V[],
    boundingSphereRadius?: number,
]

export type PlaneProps = BodyProps
export type BoxProps = BodyProps<Duplet>
export type CapsuleProps = BodyProps<CapsuleArgs>
export type ParticleProps = BodyProps
export type CircleProps = BodyProps<CircleArgs>
export type TrimeshProps = BodyPropsArgsRequired<TrimeshArgs>
export type HeightfieldProps = BodyPropsArgsRequired<HeightfieldArgs>
export type ConvexPolyhedronProps = BodyProps<ConvexPolyhedronArgs>

export interface CompoundBodyProps extends BodyProps {
    shapes: BodyProps & { type: ShapeType }[]
}

export type AtomicApi<K extends AtomicName> = {
    set: (value: AtomicProps[K]) => void
    subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

export type QuaternionApi = {
    set: (x: number, y: number, z: number, w: number) => void
    copy: ({w, x, y, z}: Quaternion) => void
    subscribe: (callback: (value: Quad) => void) => () => void
}

export type AngleApi = {
    set: (angle: number) => void
    copy: (angle: number) => void
    subscribe: (callback: (value: number) => void) => () => void
}

export type VectorApi = {
    set: (x: number, y: number) => void
    copy: (array: Duplet) => void
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
    quaternion: QuaternionApi
    angle: AngleApi
    sleep: () => void
    wakeUp: () => void
}

export interface PublicApi extends WorkerApi {
    at: (index: number) => WorkerApi
}

export type Api = [RefObject<Object3D>, PublicApi]

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Lock'

export interface ConstraintOptns {
    maxForce?: number
    collideConnected?: boolean
    wakeUpBodies?: boolean
}

export interface PointToPointConstraintOpts extends ConstraintOptns {
    pivotA: Triplet
    pivotB: Triplet
}

export interface ConeTwistConstraintOpts extends ConstraintOptns {
    pivotA?: Triplet
    axisA?: Triplet
    pivotB?: Triplet
    axisB?: Triplet
    angle?: number
    twistAngle?: number
}

export interface DistanceConstraintOpts extends ConstraintOptns {
    distance?: number
}

export interface HingeConstraintOpts extends ConstraintOptns {
    pivotA?: Triplet
    axisA?: Triplet
    pivotB?: Triplet
    axisB?: Triplet
}

export type LockConstraintOpts = ConstraintOptns

export interface SpringOptns {
    restLength?: number
    stiffness?: number
    damping?: number
    worldAnchorA?: Triplet
    worldAnchorB?: Triplet
    localAnchorA?: Triplet
    localAnchorB?: Triplet
}

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
    worker: CannonWorker,
    subscriptions: ProviderContext['subscriptions'],
    type: T,
    index?: number,
    target: SubscriptionTarget = 'bodies',
) {
    return (callback: (value: PropValue<T>) => void) => {
        const id = incrementingId++
        subscriptions[id] = {[type]: callback}
        const uuid = getUUID(ref, index)
        uuid && worker.postMessage({op: 'subscribe', uuid, props: {id, type, target}})
        return () => {
            delete subscriptions[id]
            worker.postMessage({op: 'unsubscribe', props: id})
        }
    }
}

function prepare(object: Object3D, props: BodyProps) {
    object.userData = props.userData || {}
    //object.position.set(...(props.position ? [props.position[0], 0, props.position[1]] : [0,0,0])) //TODO match normal
    //object.rotation.set(...(props.angle ? [0, props.angle, 0] : [0, 0, 0])) //TODO match normal
    object.updateMatrix()
}

function setupCollision(
    events: ProviderContext['events'],
    {onCollide, onCollideBegin, onCollideEnd}: Partial<BodyProps>,
    uuid: string,
) {
    events[uuid] = {
        impact: onCollide,
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
    const {worker, refs, events, subscriptions} = useContext(context)
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
                    return {...props, args: argsFn(props.args)}
                })
                : uuid.map((id, i) => {
                    const props = fn(i)
                    prepare(object, props)
                    refs[id] = object
                    if (debugApi) debugApi.add(id, props, type)
                    setupCollision(events, props, id)
                    return {...props, args: argsFn(props.args)}
                })

        // Register on mount, unregister on unmount
        currentWorker.postMessage({
            op: 'addBodies',
            type,
            uuid,
            props: props.map(({onCollide, onCollideBegin, onCollideEnd, ...serializableProps}) => {
                return {onCollide: Boolean(onCollide), ...serializableProps}
            }),
        })
        return () => {
            uuid.forEach((id) => {
                delete refs[id]
                if (debugApi) debugApi.remove(id)
                delete events[id]
            })
            currentWorker.postMessage({op: 'removeBodies', uuid})
        }
    }, deps)

    const api = useMemo(() => {
        const makeAtomic = <T extends AtomicName>(type: T, index?: number) => {
            const op: SetOpName<T> = `set${capitalize(type)}`
            return {
                set: (value: PropValue<T>) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: value, uuid})
                },
                subscribe: subscribe(ref, worker, subscriptions, type, index),
            }
        }

        const makeQuaternion = (index?: number) => {
            const op = 'setQuaternion'
            const type = 'quaternion'
            return {
                set: (x: number, y: number, z: number, w: number) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: [x, y, z, w], uuid})
                },
                copy: ({w, x, y, z}: Quaternion) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: [x, y, z, w], uuid})
                },
                subscribe: subscribe(ref, worker, subscriptions, type, index),
            }
        }

        const makeAngle = (index?: number) => {
            const op = 'setAngle'
            return {
                set: (angle: number) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: angle, uuid})
                },
                copy: (angle: number) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: angle, uuid})
                },
                subscribe: (callback: (value: number) => void) => {
                    const id = incrementingId++
                    const target = 'bodies'
                    const type = 'angle'
                    const uuid = getUUID(ref, index)

                    subscriptions[id] = {[type]: callback} // {[type]: quaternionToRotation(callback)}
                    uuid && worker.postMessage({op: 'subscribe', uuid, props: {id, type, target}})
                    return () => {
                        delete subscriptions[id]
                        worker.postMessage({op: 'unsubscribe', props: id})
                    }
                },
            }
        }

        const makeVec = (type: VectorName, index?: number) => {
            const op: SetOpName<VectorName> = `set${capitalize(type)}`
            return {
                set: (x: number, y: number) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: [x, y], uuid})
                },
                copy: (vec:number[]) => {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op, props: [vec[0], vec[1]], uuid})
                },
                subscribe: subscribe(ref, worker, subscriptions, type, index),
            }
        }

        function makeApi(index?: number): WorkerApi {
            return {
                angle: makeAngle(index),
                angularFactor: makeVec('angularFactor', index),
                angularVelocity: makeVec('angularVelocity', index),
                linearFactor: makeVec('linearFactor', index),
                position: makeVec('position', index),
                quaternion: makeQuaternion(index),
                velocity: makeVec('velocity', index),
                allowSleep: makeAtomic('allowSleep', index),
                angularDamping: makeAtomic('angularDamping', index),
                collisionFilterGroup: makeAtomic('collisionFilterGroup', index),
                collisionFilterMask: makeAtomic('collisionFilterMask', index),
                collisionResponse: makeAtomic('collisionResponse', index),
                isTrigger: makeAtomic('isTrigger', index),
                fixedRotation: makeAtomic('fixedRotation', index),
                linearDamping: makeAtomic('linearDamping', index),
                mass: makeAtomic('mass', index),
                material: makeAtomic('material', index),
                sleepSpeedLimit: makeAtomic('sleepSpeedLimit', index),
                sleepTimeLimit: makeAtomic('sleepTimeLimit', index),
                userData: makeAtomic('userData', index),
                // Apply functions
                applyForce(force: Duplet, worldPoint: Duplet) {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'applyForce', props: [force, worldPoint], uuid})
                },
                applyImpulse(impulse: Duplet, worldPoint: Duplet) {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'applyImpulse', props: [impulse, worldPoint], uuid})
                },
                applyLocalForce(force: Duplet, localPoint: Duplet) {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'applyLocalForce', props: [force, localPoint], uuid})
                },
                applyLocalImpulse(impulse: Duplet, localPoint: Duplet) {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'applyLocalImpulse', props: [impulse, localPoint], uuid})
                },
                applyTorque(torque: Duplet) {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'applyTorque', props: [torque], uuid})
                },
                // force particular sleep state
                sleep() {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'sleep', uuid})
                },
                wakeUp() {
                    const uuid = getUUID(ref, index)
                    uuid && worker.postMessage({op: 'wakeUp', uuid})
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

export function usePlane(fn: GetByIndex<PlaneProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
    return useBody('Plane', fn, () => [], fwdRef, deps)
}

export function useBox(fn: GetByIndex<BoxProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
    const defaultBoxArgs: Duplet = [1, 1]
    return useBody('Box', fn, (args = defaultBoxArgs): Duplet => args, fwdRef, deps)
}

export function useCapsule(
  fn: GetByIndex<CapsuleProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
    return useBody('Capsule', fn, (args = [] as []) => args, fwdRef, deps)
}

export function useHeightfield(
    fn: GetByIndex<HeightfieldProps>,
    fwdRef: Ref<Object3D> = null,
    deps?: DependencyList,
) {
    return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}

export function useParticle(
    fn: GetByIndex<ParticleProps>,
    fwdRef: Ref<Object3D> = null,
    deps?: DependencyList,
) {
    return useBody('Particle', fn, () => [], fwdRef, deps)
}

export function useCircle(fn: GetByIndex<CircleProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
    return useBody('Circle', fn, (args: CircleArgs = [1]): CircleArgs => {
            if (!Array.isArray(args)) throw new Error('useCircle args must be an array')
            return [args[0]]
        },
        fwdRef,
        deps,
    )
}

/*export function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<TrimeshProps>('Trimesh', fn, (args) => args, fwdRef, deps)
}*/

/*export function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<ConvexPolyhedronProps>(
    'ConvexPolyhedron',
    fn,
    ([vertices, faces, normals, axes, boundingSphereRadius] = []): ConvexPolyhedronArgs<Triplet> => [
      vertices && vertices.map(makeTriplet),
      faces,
      normals && normals.map(makeTriplet),
      axes && axes.map(makeTriplet),
      boundingSphereRadius,
    ],
    fwdRef,
    deps,
  )
}*/
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
        enable: () => void
        disable: () => void
    },
]

type HingeConstraintApi = [
    RefObject<Object3D>,
    RefObject<Object3D>,
    {
        enable: () => void
        disable: () => void
        enableMotor: () => void
        disableMotor: () => void
        setMotorSpeed: (value: number) => void
        setMotorMaxForce: (value: number) => void
    },
]

type SpringApi = [
    RefObject<Object3D>,
    RefObject<Object3D>,
    {
        setStiffness: (value: number) => void
        setRestLength: (value: number) => void
        setDamping: (value: number) => void
    },
]

type ConstraintORHingeApi<T extends 'Hinge' | ConstraintTypes> = T extends ConstraintTypes
    ? ConstraintApi
    : HingeConstraintApi

function useConstraint<T extends 'Hinge' | ConstraintTypes>(
    type: T,
    bodyA: Ref<Object3D>,
    bodyB: Ref<Object3D>,
    optns: any = {},
    deps: DependencyList = [],
): ConstraintORHingeApi<T> {
    const {worker} = useContext(context)
    const uuid = MathUtils.generateUUID()

    const refA = useForwardedRef(bodyA)
    const refB = useForwardedRef(bodyB)

    useEffect(() => {
        if (refA.current && refB.current) {
            worker.postMessage({
                op: 'addConstraint',
                props: [refA.current.uuid, refB.current.uuid, optns],
                type,
                uuid,
            })
            return () => worker.postMessage({op: 'removeConstraint', uuid})
        }
    }, deps)

    const api = useMemo(() => {
        const enableDisable = {
            enable: () => worker.postMessage({op: 'enableConstraint', uuid}),
            disable: () => worker.postMessage({op: 'disableConstraint', uuid}),
        }

        if (type === 'Hinge') {
            return {
                ...enableDisable,
                enableMotor: () => worker.postMessage({op: 'enableConstraintMotor', uuid}),
                disableMotor: () => worker.postMessage({op: 'disableConstraintMotor', uuid}),
                setMotorSpeed: (value: number) =>
                    worker.postMessage({op: 'setConstraintMotorSpeed', uuid, props: value}),
                setMotorMaxForce: (value: number) =>
                    worker.postMessage({op: 'setConstraintMotorMaxForce', uuid, props: value}),
            }
        }

        return enableDisable
    }, deps)

    return [refA, refB, api] as ConstraintORHingeApi<T>
}

export function usePointToPointConstraint(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: PointToPointConstraintOpts,
    deps: DependencyList = [],
) {
    return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}

export function useConeTwistConstraint(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: ConeTwistConstraintOpts,
    deps: DependencyList = [],
) {
    return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}

export function useDistanceConstraint(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: DistanceConstraintOpts,
    deps: DependencyList = [],
) {
    return useConstraint('Distance', bodyA, bodyB, optns, deps)
}

export function useHingeConstraint(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: HingeConstraintOpts,
    deps: DependencyList = [],
) {
    return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}

export function useLockConstraint(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: LockConstraintOpts,
    deps: DependencyList = [],
) {
    return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
    bodyA: Ref<Object3D> = null,
    bodyB: Ref<Object3D> = null,
    optns: SpringOptns,
    deps: DependencyList = [],
): SpringApi {
    const {worker} = useContext(context)
    const [uuid] = useState(() => MathUtils.generateUUID())

    const refA = useForwardedRef(bodyA)
    const refB = useForwardedRef(bodyB)

    useEffect(() => {
        if (refA.current && refB.current) {
            worker.postMessage({
                op: 'addSpring',
                uuid,
                props: [refA.current.uuid, refB.current.uuid, optns],
            })
            return () => {
                worker.postMessage({op: 'removeSpring', uuid})
            }
        }
    }, deps)

    const api = useMemo(
        () => ({
            setStiffness: (value: number) => worker.postMessage({op: 'setSpringStiffness', props: value, uuid}),
            setRestLength: (value: number) => worker.postMessage({op: 'setSpringRestLength', props: value, uuid}),
            setDamping: (value: number) => worker.postMessage({op: 'setSpringDamping', props: value, uuid}),
        }),
        deps,
    )

    return [refA, refB, api]
}

type RayOptions = Omit<AddRayMessage['props'], 'mode'>

function useRay(
    mode: RayMode,
    options: RayOptions,
    callback: (e: RayhitEvent) => void,
    deps: DependencyList = [],
) {
    const {worker, events} = useContext(context)
    const [uuid] = useState(() => MathUtils.generateUUID())
    useEffect(() => {
        events[uuid] = {rayhit: callback}
        worker.postMessage({op: 'addRay', uuid, props: {mode, ...options}})
        return () => {
            worker.postMessage({op: 'removeRay', uuid})
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
    sliding: {
        subscribe: (callback: (sliding: boolean) => void) => void
    }
}

export interface WheelInfoOptions {
    localPosition?: Duplet,
    sideFriction?: number,
}

export interface TopDownVehicleProps {
    chassisBody: Ref<Object3D>
    wheelInfos: WheelInfoOptions[]
    indexForwardAxis?: number
    indexRightAxis?: number
    indexUpAxis?: number
}

export function useTopDownVehicle(
    fn: () => TopDownVehicleProps,
    fwdRef: Ref<Object3D> = null,
    deps: DependencyList = [],
): [RefObject<Object3D>, TopDownVehiclePublicApi] {
    const ref = useForwardedRef(fwdRef)
    const {worker, subscriptions} = useContext(context)

    useLayoutEffect(() => {
        if (!ref.current) {
            // When the reference isn't used we create a stub
            // The body doesn't have a visual representation but can still be constrained
            ref.current = new Object3D()
        }

        const currentWorker = worker
        const uuid: string[] = [ref.current.uuid]
        const topDownVehicleProps = fn()

        const chassisBodyUUID = getUUID(topDownVehicleProps.chassisBody)
        if (!chassisBodyUUID) return

        currentWorker.postMessage({
            type: undefined,
            op: 'addTopDownVehicle',
            uuid,
            props: [
                chassisBodyUUID,
                topDownVehicleProps.wheelInfos,
                topDownVehicleProps?.indexForwardAxis || 2,
                topDownVehicleProps?.indexRightAxis || 0,
                topDownVehicleProps?.indexUpAxis || 1,
            ]
        })
        return () => {
            currentWorker.postMessage({op: 'removeTopDownVehicle', uuid})
        }
    }, deps)

    const api = useMemo<TopDownVehiclePublicApi>(() => {
        return {
            sliding: {
                subscribe: subscribe(ref, worker, subscriptions, 'sliding', undefined, 'vehicles'),
            },
            setSteeringValue(value: number, wheelIndex: number) {
                const uuid = getUUID(ref)
                uuid && worker.postMessage({op: 'setTopDownVehicleSteeringValue', props: [value, wheelIndex], uuid})
            },
            applyEngineForce(value: number, wheelIndex: number) {
                const uuid = getUUID(ref)
                uuid && worker.postMessage({op: 'applyTopDownVehicleEngineForce', props: [value, wheelIndex], uuid})
            },
            setBrake(brake: number, wheelIndex: number) {
                const uuid = getUUID(ref)
                uuid && worker.postMessage({op: 'setTopDownVehicleBrake', props: [brake, wheelIndex], uuid})
            },
        }
    }, deps)
    return [ref, api]
}
