
    yarn add @react-three/p2

React hooks for [p2-es](https://github.com/pmndrs/p2-es). Use this in combination with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

- [x] Doesn't block the main thread, runs in a web worker
- [ ] Supports instancing out of the box

## TODOs

##### Shapes
- [x] useBox
- [x] useCapsule
- [x] useCircle
- [ ] useConvex
- [ ] useHeightfield
- [ ] useLine
- [x] useParticle
- [x] usePlane

##### Raycast
- [x] useRaycastAny
- [x] useRaycastAll
- [x] useRaycastClosest

#### Springs
- [ ] …
#### Constraints
- [ ] …
#### Other
- [x] useTopDownVehicle

## Demos

Check out all of our examples at https://p2.pmnd.rs (coming soon)

Meanwhile look at the examples living in [./examples](./examples)

## How it works

1. Get all the imports that you need.

```jsx
import { Physics, useBox, ... } from '@react-three/p2'
```

2. Create a physics world.

```jsx
<Physics>{/* Physics related objects in here please */}</Physics>
```

3. Pick a shape that suits your objects contact surface, it could be a box, plane, circle, etc. Give it a mass, too.

```jsx
const [ref, api] = useBox(() => ({ mass: 1 }))
```

4. Take your object, it could be a mesh, line, gltf, anything, and tie it to the reference you have just received. Et voilà, it will now be affected by gravity and other objects inside the physics world.

```jsx
<mesh ref={ref} geometry={...} material={...} />
```

5. You can interact with it by using [the api](#returned-api), which lets you apply positions, rotations, velocities, forces and impulses.

```jsx
useFrame(({ clock }) => api.position.set(Math.sin(clock.getElapsedTime()) * 5, 0))
```

6. You can use the body api to subscribe to properties to get updates on each frame.

```jsx
const velocity = useRef([0, 0, 0])
useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v))
    return unsubscribe
}, [])
```

## Simple example

Let's make a ball falling onto a box.

```jsx
import {Canvas} from '@react-three/fiber'
import {Physics, useBox, useCircle} from '@react-three/p2'

function Box() {
    const [ref] = useBox(() => ({mass: 0, position: [0, -2]}))
    return (
        <mesh ref={ref}>
            <boxGeometry />
        </mesh>
    )
}

function Ball() {
    const [ref] = useCircle(() => ({mass: 1, position: [0, 2]}))
    return (
        <mesh ref={ref}>
            <sphereGeometry/>
        </mesh>
    )
}

ReactDOM.render(
    <Canvas>
        <Physics normalIndex={2}>
            <Box />
            <Ball />
        </Physics>
    </Canvas>,
    document.getElementById('root'),
)
```

## Debug

You can debug your scene using the `p2-es-debugger`. This will show you how p2 "sees" your scene.

```jsx
import { Physics, Debug } from '@react-three/cannon'

ReactDOM.render(
    <Canvas>
        <Physics>
            <Debug color="black" scale={1.1}>
                {/* children */}
            </Debug>
        </Physics>
    </Canvas>,
    document.getElementById('root'),
)
```

## Api

### Exports

```typescript
function Physics({
                     allowSleep = false,
                     axisIndex = 0,
                     normalIndex = 0,
                     broadphase = 'Naive',
                     children,
                     defaultContactMaterial = { contactEquationStiffness: 1e6 },
                     gravity = [0, -9.81, 0],
                     iterations = 5,
                     quatNormalizeFast = false,
                     quatNormalizeSkip = 0,
                     shouldInvalidate = true,
                     // Maximum amount of physics objects inside your scene
                     // Lower this value to save memory, increase if 1000 isn't enough
                     size = 1000,
                     solver = 'GS',
                     step = 1 / 60,
                     tolerance = 0.001,
                 }: ProviderProps): JSX.Element

function Debug({ color = 'black', scale = 1 }: DebugProps): JSX.Element

function usePlane(
    fn: GetByIndex<PlaneProps>,
    fwdRef?: React.Ref<THREE.Object3D>,
    deps?: React.DependencyList,
): Api

function useBox(
    fn: GetByIndex<BoxProps>,
    fwdRef?: React.Ref<THREE.Object3D>,
    deps?: React.DependencyList,
): Api

function useCircle(
    fn: GetByIndex<CylinderProps>,
    fwdRef?: React.Ref<THREE.Object3D>,
    deps?: React.DependencyList,
): Api

function useTopDownVehicle(
    fn: () => RaycastVehicleProps,
    fwdRef?: React.Ref<THREE.Object3D>,
    deps: React.DependencyList[] = [],
): [React.RefObject<THREE.Object3D>, RaycastVehiclePublicApi]

function useRaycastClosest(
    options: RayOptions,
    callback: (e: RayhitEvent) => void,
    deps: React.DependencyList = [],
): void

function useRaycastAny(
    options: RayOptions,
    callback: (e: RayhitEvent) => void,
    deps: React.DependencyList = [],
): void

function useRaycastAll(
    options: RayOptions,
    callback: (e: RayhitEvent) => void,
    deps: React.DependencyList = [],
): void
```

### Returned api

```typescript
type WorkerApi = {
    [K in AtomicName]: AtomicApi<K>
} & {
    [K in VectorName]: VectorApi
} & {
    applyForce: (force: Triplet, worldPoint: Triplet) => void
    applyImpulse: (impulse: Triplet, worldPoint: Triplet) => void
    applyLocalForce: (force: Triplet, localPoint: Triplet) => void
    applyLocalImpulse: (impulse: Triplet, localPoint: Triplet) => void
    applyTorque: (torque: Triplet) => void
    quaternion: QuaternionApi
    rotation: VectorApi
    sleep: () => void
    wakeUp: () => void
}

interface PublicApi extends WorkerApi {
    at: (index: number) => WorkerApi
}

type Api = [React.RefObject<THREE.Object3D>, PublicApi]

type AtomicName =
    | 'allowSleep'
    | 'angularDamping'
    | 'collisionGroup'
    | 'collisionMask'
    | 'collisionResponse'
    | 'fixedRotation'
    | 'isTrigger'
    | 'linearDamping'
    | 'mass'
    | 'material'
    | 'sleepSpeedLimit'
    | 'sleepTimeLimit'
    | 'userData'

type AtomicApi<K extends AtomicName> = {
    set: (value: AtomicProps[K]) => void
    subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

type QuaternionApi = {
    set: (x: number, y: number, z: number, w: number) => void
    copy: ({ w, x, y, z }: Quaternion) => void
    subscribe: (callback: (value: Quad) => void) => () => void
}

type VectorName = 'angularFactor' | 'angularVelocity' | 'linearFactor' | 'position' | 'velocity'

type VectorApi = {
    set: (x: number, y: number, z: number) => void
    copy: ({ x, y, z }: Vector3 | Euler) => void
    subscribe: (callback: (value: Triplet) => void) => () => void
}

type ConstraintApi = [
    React.RefObject<THREE.Object3D>,
    React.RefObject<THREE.Object3D>,
    {
        enable: () => void
        disable: () => void
    },
]

type HingeConstraintApi = [
    React.RefObject<THREE.Object3D>,
    React.RefObject<THREE.Object3D>,
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
    React.RefObject<THREE.Object3D>,
    React.RefObject<THREE.Object3D>,
    {
        setStiffness: (value: number) => void
        setRestLength: (value: number) => void
        setDamping: (value: number) => void
    },
]

interface RaycastVehiclePublicApi {
    applyEngineForce: (value: number, wheelIndex: number) => void
    setBrake: (brake: number, wheelIndex: number) => void
    setSteeringValue: (value: number, wheelIndex: number) => void
    sliding: {
        subscribe: (callback: (sliding: boolean) => void) => void
    }
}
```

### Props

```typescript
type ProviderProps = React.PropsWithChildren<{
    shouldInvalidate?: boolean
    gravity?: Triplet
    tolerance?: number
    step?: number
    iterations?: number
    allowSleep?: boolean
    broadphase?: Broadphase
    axisIndex?: number
    defaultContactMaterial?: {
        friction?: number
        restitution?: number
        contactEquationStiffness?: number
        contactEquationRelaxation?: number
        frictionEquationStiffness?: number
        frictionEquationRelaxation?: number
    }
    size?: number
}>

type AtomicProps = {
    allowSleep: boolean
    angularDamping: number
    collisionFilterGroup: number
    collisionFilterMask: number
    collisionResponse: number
    fixedRotation: boolean
    isTrigger: boolean
    linearDamping: number
    mass: number
    material: MaterialOptions
    sleepSpeedLimit: number
    sleepTimeLimit: number
    userData: {}
}

type Broadphase = 'Naive' | 'SAP'
type Triplet = [x: number, y: number, z: number]
type Quad = [x: number, y: number, z: number, w: number]

type VectorProps = Record<VectorName, Triplet>

type BodyProps<T extends any[] = unknown[]> = Partial<AtomicProps> &
    Partial<VectorProps> & {
    args?: T
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
    quaternion?: Quad
    rotation?: Triplet
    type?: 'Dynamic' | 'Static' | 'Kinematic'
}

type Event = RayhitEvent | CollideEvent | CollideBeginEvent | CollideEndEvent
type CollideEvent = {
    op: string
    type: 'collide'
    body: THREE.Object3D
    target: THREE.Object3D
    contact: {
        // the world position of the point of contact
        contactPoint: number[]
        // the normal of the collision on the surface of
        // the colliding body
        contactNormal: number[]
        // velocity of impact along the contact normal
        impactVelocity: number
        // a unique ID for each contact event
        id: string
        // these are lower-level properties from cannon:
        // bi: one of the bodies involved in contact
        bi: THREE.Object3D
        // bj: the other body involved in contact
        bj: THREE.Object3D
        // ni: normal of contact relative to bi
        ni: number[]
        // ri: the point of contact relative to bi
        ri: number[]
        // rj: the point of contact relative to bj
        rj: number[]
    }
    collisionFilters: {
        bodyFilterGroup: number
        bodyFilterMask: number
        targetFilterGroup: number
        targetFilterMask: number
    }
}
type CollideBeginEvent = {
    op: 'event'
    type: 'collideBegin'
    target: Object3D
    body: Object3D
}
type CollideEndEvent = {
    op: 'event'
    type: 'collideEnd'
    target: Object3D
    body: Object3D
}
type RayhitEvent = {
    op: string
    type: 'rayhit'
    body: THREE.Object3D
    target: THREE.Object3D
}

type CylinderArgs = [radiusTop?: number, radiusBottom?: number, height?: number, numSegments?: number]
type SphereArgs = [radius: number]
type TrimeshArgs = [vertices: ArrayLike<number>, indices: ArrayLike<number>]
type HeightfieldArgs = [
    data: number[][],
    options: { elementSize?: number; maxValue?: number; minValue?: number },
]
type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
    vertices?: V[],
    faces?: number[][],
    normals?: V[],
    axes?: V[],
    boundingSphereRadius?: number,
]

interface PlaneProps extends BodyProps {}
interface BoxProps extends BodyProps<Triplet> {} // extents: [x, y, z]
interface CylinderProps extends BodyProps<CylinderArgs> {}
interface ParticleProps extends BodyProps {}
interface SphereProps extends BodyProps<SphereArgs> {}
interface TrimeshProps extends BodyPropsArgsRequired<TrimeshArgs> {}
interface HeightfieldProps extends BodyPropsArgsRequired<HeightfieldArgs> {}
interface ConvexPolyhedronProps extends BodyProps<ConvexPolyhedronArgs> {}
interface CompoundBodyProps extends BodyProps {
    shapes: BodyProps & { type: ShapeType }[]
}

interface ConstraintOptns {
    maxForce?: number
    collideConnected?: boolean
    wakeUpBodies?: boolean
}

interface PointToPointConstraintOpts extends ConstraintOptns {
    pivotA: Triplet
    pivotB: Triplet
}

interface ConeTwistConstraintOpts extends ConstraintOptns {
    pivotA?: Triplet
    axisA?: Triplet
    pivotB?: Triplet
    axisB?: Triplet
    angle?: number
    twistAngle?: number
}
interface DistanceConstraintOpts extends ConstraintOptns {
    distance?: number
}

interface HingeConstraintOpts extends ConstraintOptns {
    pivotA?: Triplet
    axisA?: Triplet
    pivotB?: Triplet
    axisB?: Triplet
}

interface LockConstraintOpts extends ConstraintOptns {}

interface SpringOptns {
    restLength?: number
    stiffness?: number
    damping?: number
    worldAnchorA?: Triplet
    worldAnchorB?: Triplet
    localAnchorA?: Triplet
    localAnchorB?: Triplet
}

interface WheelInfoOptions {
    radius?: number
    directionLocal?: Triplet
    suspensionStiffness?: number
    suspensionRestLength?: number
    maxSuspensionForce?: number
    maxSuspensionTravel?: number
    dampingRelaxation?: number
    dampingCompression?: number
    frictionSlip?: number
    rollInfluence?: number
    axleLocal?: Triplet
    chassisConnectionPointLocal?: Triplet
    isFrontWheel?: boolean
    useCustomSlidingRotationalSpeed?: boolean
    customSlidingRotationalSpeed?: number
}

interface RaycastVehicleProps {
    chassisBody: React.Ref<THREE.Object3D>
    wheels: React.Ref<THREE.Object3D>[]
    wheelInfos: WheelInfoOptions[]
    indexForwardAxis?: number
    indexRightAxis?: number
    indexUpAxis?: number
}
```

### FAQ

#### Broadphases

- NaiveBroadphase is as simple as it gets. It considers every body to be a potential collider with every other body. This results in the maximum number of narrowphase checks.
- SAPBroadphase sorts bodies along an axis and then moves down that list finding pairs by looking at body size and position of the next bodies. Control what axis to sort along by setting the axisIndex property.

#### Types

- A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
- A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
- A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
