import propsToBody from './propsToBody'

import {
    World,
    NaiveBroadphase,
    SAPBroadphase,
    vec2,
    DistanceConstraint,
    LockConstraint,
    Constraint,
    Spring,
    Ray,
    RaycastResult,
    TopDownVehicle,
} from 'p2-es'

const state = {
    bodies: {},
    vehicles: {},
    springs: {},
    springInstances: {},
    rays: {},
    world: new World(),
    config: {step: 1 / 60},
    subscriptions: {},
    bodiesNeedSyncing: false,
    lastCallTime: undefined,
}

//state.world.on('impact', e => console.log('impact event', e))

function syncBodies() {
    state.bodiesNeedSyncing = true
    state.bodies = state.world.bodies.reduce((acc, body) => ({...acc, [body.uuid]: body}), {})
}

function emitBeginContact({bodyA, bodyB}) {
    if (!bodyA || !bodyB) return
    /* eslint-disable-next-line no-restricted-globals */
    self.postMessage({op: 'event', type: 'collideBegin', bodyA: bodyA.uuid, bodyB: bodyB.uuid})
}

function emitEndContact({bodyA, bodyB}) {
    if (!bodyA || !bodyB) return
    /* eslint-disable-next-line no-restricted-globals */
    self.postMessage({op: 'event', type: 'collideEnd', bodyA: bodyA.uuid, bodyB: bodyB.uuid})
}

function normalizeAngle(angle) {
    angle = angle % (2 * Math.PI);
    if (angle < 0) {
        angle += (2 * Math.PI);
    }
    return angle;
}

const _normal = [0,0,0]

/* eslint-disable-next-line no-restricted-globals */
self.onmessage = (e) => {
    const {op, uuid, type, positions, quaternions, props} = e.data
    const broadphases = {NaiveBroadphase, SAPBroadphase}
    switch (op) {
        case 'init': {
            const {
                gravity,
                tolerance,
                step,
                iterations,
                allowSleep,
                broadphase,
                axisIndex,
                normalIndex,
                defaultContactMaterial,
                quatNormalizeFast,
                quatNormalizeSkip,
                solver,
            } = props
            state.world.allowSleep = allowSleep
            state.world.gravity = [gravity[0], gravity[1]]
            state.world.quatNormalizeFast = quatNormalizeFast
            state.world.quatNormalizeSkip = quatNormalizeSkip
            state.world.normalIndex = normalIndex
            _normal.splice(normalIndex,1,1)

            state.world.on('impact', (event) => {
                //console.log(event.contactEquation.firstImpact, event);
                const {bodyA, bodyB, contactEquation} = event
                const {normalA, contactPointA, contactPointB, index} = contactEquation
                const contactPoint = []
                vec2.add(contactPoint, bodyA.position, contactPointA)
                const contactNormal = normalA //bodyA === body ? normalA : vec2.scale(normalA, normalA, -1)
                /* eslint-disable-next-line no-restricted-globals */
                self.postMessage({
                    op: 'event',
                    type: event.type,
                    body: bodyA.uuid,
                    target: bodyB.uuid,
                    contact: {
                        ni: normalA,
                        ri: contactPointA,
                        rj: contactPointB,
                        bi: bodyA.uuid,
                        bj: bodyB.uuid,
                        impactVelocity: contactEquation.getVelocityAlongNormal(),
                        // World position of the contact
                        contactPoint: contactPoint,
                        // Normal of the contact, relative to the colliding body
                        contactNormal: contactNormal,
                        index,
                    },
                    collisionFilters: {
                        bodyFilterGroup: bodyA.collisionGroup,
                        bodyFilterMask: bodyA.collisionMask,
                        targetFilterGroup: bodyB.collisionGroup,
                        targetFilterMask: bodyB.collisionMask,
                    },
                })

            })

            /*if (solver === 'Split') {
              state.world.solver = new SplitSolver(new GSSolver())
            }*/

            state.world.solver.tolerance = tolerance
            state.world.solver.iterations = iterations
            state.world.broadphase = new (broadphases[broadphase + 'Broadphase'] || NaiveBroadphase)(state.world)
            state.world.broadphase.axisIndex = axisIndex === undefined || axisIndex === null ? 0 : axisIndex
            state.world.on('beginContact', emitBeginContact)
            state.world.on('endContact', emitEndContact)
            Object.assign(state.world.defaultContactMaterial, defaultContactMaterial)
            state.config.step = step
            break
        }
        case 'step': {
            const now = performance.now() / 1000
            if (!state.lastCallTime) {
                state.world.step(state.config.step)
            } else {
                const timeSinceLastCall = now - state.lastCallTime
                state.world.step(state.config.step, timeSinceLastCall)
            }
            state.lastCallTime = now

            const numberOfBodies = state.world.bodies.length
            for (let i = 0; i < numberOfBodies; i++) {
                let b = state.world.bodies[i]
                let p = [...b.position]
                p.splice(state.world.normalIndex, 0, 0)
                // TODO smarter placement of vars and there is a trick for this quaternion thing for sure
                const why = state.world.normalIndex === 1 ? -1 : 1
                var s = Math.sin(b.angle*0.5*why)

                positions[3 * i + 0] = p[0]
                positions[3 * i + 1] = p[1]
                positions[3 * i + 2] = p[2]
                quaternions[4 * i + 0] = _normal[0] * s
                quaternions[4 * i + 1] = _normal[1] * s
                quaternions[4 * i + 2] = _normal[2] * s
                quaternions[4 * i + 3] = Math.cos(b.angle*0.5*why)
            }
            const observations = []
            for (const id of Object.keys(state.subscriptions)) {
                let [uuid, type, target = 'bodies'] = state.subscriptions[id]
                let object = state[target]
                if (!object || !object[uuid]) continue
                let value = object[uuid][type]
                //if (value instanceof vec2) value = value.toArray()
                observations.push([id, value, type])
            }
            const message = {
                op: 'frame',
                positions,
                quaternions,
                observations,
                active: true, // TODO hacked true in cause there is no state.world.hasActiveBodies in p2 (see cannon-es)
            }
            if (state.bodiesNeedSyncing) {
                message.bodies = state.world.bodies.map((body) => body.uuid)
                state.bodiesNeedSyncing = false
            }
            /* eslint-disable-next-line no-restricted-globals */
            self.postMessage(message, [positions.buffer, quaternions.buffer])
            break
        }
        case 'addBodies': {
            for (let i = 0; i < uuid.length; i++) {
                const body = propsToBody(uuid[i], props[i], type)
                state.world.addBody(body)
            }
            syncBodies()
            break
        }
        case 'removeBodies': {
            for (let i = 0; i < uuid.length; i++) state.world.removeBody(state.bodies[uuid[i]])
            syncBodies()
            break
        }
        case 'subscribe': {
            const {id, type, target} = props
            state.subscriptions[id] = [uuid, type, target]
            break
        }
        case 'unsubscribe': {
            delete state.subscriptions[props]
            break
        }
        case 'setPosition':
            state.bodies[uuid].position.set(props[0], props[1], props[2])
            break
        case 'setQuaternion':
            state.bodies[uuid].quaternion.set(props[0], props[1], props[2], props[3])
            break
        case 'setRotation':
            state.bodies[uuid].quaternion.setFromEuler(props[0], props[1], props[2])
            break
        case 'setVelocity':
            state.bodies[uuid].velocity = [props[0], props[1]]
            break
        case 'setAngularVelocity':
            state.bodies[uuid].angularVelocity.set(props[0], props[1], props[2])
            break
        case 'setLinearFactor':
            state.bodies[uuid].linearFactor.set(props[0], props[1], props[2])
            break
        case 'setAngularFactor':
            state.bodies[uuid].angularFactor.set(props[0], props[1], props[2])
            break
        case 'setMass':
            // assume that an update from zero-mass implies a need for dynamics on static obj.
            if (props !== 0 && state.bodies[uuid].type === 0) state.bodies[uuid].type = 1
            state.bodies[uuid].mass = props
            state.bodies[uuid].updateMassProperties()
            break
        case 'setLinearDamping':
            state.bodies[uuid].linearDamping = props
            break
        case 'setAngularDamping':
            state.bodies[uuid].angularDamping = props
            break
        case 'setAllowSleep':
            state.bodies[uuid].allowSleep = props
            break
        case 'setSleepSpeedLimit':
            state.bodies[uuid].sleepSpeedLimit = props
            break
        case 'setSleepTimeLimit':
            state.bodies[uuid].sleepTimeLimit = props
            break
        case 'setCollisionFilterGroup':
            state.bodies[uuid].collisionFilterGroup = props
            break
        case 'setCollisionFilterMask':
            state.bodies[uuid].collisionFilterMask = props
            break
        case 'setCollisionResponse':
            state.bodies[uuid].collisionResponse = props
            break
        case 'setFixedRotation':
            state.bodies[uuid].fixedRotation = props
            break
        case 'setIsTrigger':
            state.bodies[uuid].isTrigger = props
            break
        case 'setGravity':
            vec2.set(state.world.gravity, props[0], props[1])
            break
        case 'setTolerance':
            state.world.solver.tolerance = props
            break
        case 'setStep':
            state.config.step = props
            break
        case 'setIterations':
            state.world.solver.iterations = props
            break
        case 'setBroadphase':
            state.world.broadphase = new (broadphases[props + 'Broadphase'] || NaiveBroadphase)(state.world)
            break
        case 'setAxisIndex':
            state.world.broadphase.axisIndex = props === undefined || props === null ? 0 : props
            break
        case 'applyForce':
            state.bodies[uuid].applyForce(vec2.fromValues(...props[0]), props[1] && vec2.fromValues(...props[1]))
            break
        case 'applyImpulse':
            state.bodies[uuid].applyImpulse(vec2.fromValues(...props[0]), props[1] && vec2.fromValues(...props[1]))
            break
        case 'applyLocalForce':
            state.bodies[uuid].applyForceLocal(vec2.fromValues(...props[0]), props[1] && vec2.fromValues(...props[1]))
            break
        case 'applyLocalImpulse':
            state.bodies[uuid].applyImpulseLocal(vec2.fromValues(...props[0]), props[1] && vec2.fromValues(...props[1]))
            break
        case 'applyTorque':
            state.bodies[uuid].applyTorque(vec2.fromValues(...props[0]))
            break
        case 'addConstraint': {
            const [bodyA, bodyB, optns] = props
            let {pivotA, pivotB, axisA, axisB, ...options} = optns

            // is there a better way to enforce defaults?
            pivotA = Array.isArray(pivotA) ? vec2.fromValues(...pivotA) : undefined
            pivotB = Array.isArray(pivotB) ? vec2.fromValues(...pivotB) : undefined
            axisA = Array.isArray(axisA) ? vec2.fromValues(...axisA) : undefined
            axisB = Array.isArray(axisB) ? vec2.fromValues(...axisB) : undefined

            let constraint

            switch (type) {
                case 'Distance':
                    constraint = new DistanceConstraint(
                        state.bodies[bodyA],
                        state.bodies[bodyB],
                        optns,
                    )
                    break
                case 'Lock':
                    constraint = new LockConstraint(state.bodies[bodyA], state.bodies[bodyB], optns)
                    break
                default:
                    constraint = new Constraint(state.bodies[bodyA], state.bodies[bodyB], optns)
                    break
            }
            constraint.uuid = uuid
            state.world.addConstraint(constraint)
            break
        }
        case 'removeConstraint':
            state.world.constraints
                .filter(({uuid: thisId}) => thisId === uuid)
                .map((c) => state.world.removeConstraint(c))
            break

        case 'enableConstraint':
            state.world.constraints.filter(({uuid: thisId}) => thisId === uuid).map((c) => c.enable())
            break

        case 'disableConstraint':
            state.world.constraints.filter(({uuid: thisId}) => thisId === uuid).map((c) => c.disable())
            break

        case 'enableConstraintMotor':
            state.world.constraints.filter(({uuid: thisId}) => thisId === uuid).map((c) => c.enableMotor())
            break

        case 'disableConstraintMotor':
            state.world.constraints.filter(({uuid: thisId}) => thisId === uuid).map((c) => c.disableMotor())
            break

        case 'setConstraintMotorSpeed':
            state.world.constraints.filter(({uuid: thisId}) => thisId === uuid).map((c) => c.setMotorSpeed(props))
            break

        case 'setConstraintMotorMaxForce':
            state.world.constraints
                .filter(({uuid: thisId}) => thisId === uuid)
                .map((c) => c.setMotorMaxForce(props))
            break

        case 'addSpring': {
            const [bodyA, bodyB, optns] = props
            let {worldAnchorA, worldAnchorB, localAnchorA, localAnchorB, restLength, stiffness, damping} = optns

            worldAnchorA = Array.isArray(worldAnchorA) ? vec2.fromValues(...worldAnchorA) : undefined
            worldAnchorB = Array.isArray(worldAnchorB) ? vec2.fromValues(...worldAnchorB) : undefined
            localAnchorA = Array.isArray(localAnchorA) ? vec2.fromValues(...localAnchorA) : undefined
            localAnchorB = Array.isArray(localAnchorB) ? vec2.fromValues(...localAnchorB) : undefined

            let spring = new Spring(state.bodies[bodyA], state.bodies[bodyB], {
                worldAnchorA,
                worldAnchorB,
                localAnchorA,
                localAnchorB,
                restLength,
                stiffness,
                damping,
            })

            spring.uuid = uuid

            let postStepSpring = () => spring.applyForce()

            state.springs[uuid] = postStepSpring
            state.springInstances[uuid] = spring

            // Compute the force after each step
            state.world.addEventListener('postStep', state.springs[uuid])
            break
        }
        case 'setSpringStiffness': {
            state.springInstances[uuid].stiffness = props
            break
        }
        case 'setSpringRestLength': {
            state.springInstances[uuid].restLength = props
            break
        }
        case 'setSpringDamping': {
            state.springInstances[uuid].damping = props
            break
        }
        case 'removeSpring': {
            state.world.removeEventListener('postStep', state.springs[uuid])
            break
        }
        case 'addRay': {
            const {from, to, mode, ...options} = props
            const ray = new Ray({from, to, mode: Ray[mode.toUpperCase()], ...options})
            //options.mode = Ray[options.mode.toUpperCase()]
            options.result = new RaycastResult()
            const hitPointWorld = vec2.create()
            state.rays[uuid] = () => {
                const hasHit = state.world.raycast(options.result, ray)
                hasHit && options.result.getHitPoint(hitPointWorld, ray)
                const {body, shape, fraction, normal, faceIndex, isStopped} = options.result
                /* eslint-disable-next-line no-restricted-globals */
                self.postMessage({
                    op: 'event',
                    type: 'rayhit',
                    ray: {
                        from: ray.from,
                        to: ray.to,
                        direction: ray.direction,
                        collisionGroup: ray.collisionGroup,
                        collisionMask: ray.collisionMask,
                        uuid,
                    },
                    body: body ? body.uuid : null,
                    shape: shape ? {...shape, body: body.uuid} : null,
                    hitPointWorld,
                    hitDistance: options.result.getHitDistance(ray),
                    hasHit: hasHit,
                })
            }
            state.world.on('preSolve', state.rays[uuid])
            break
        }
        case 'removeRay': {
            state.world.off('preSolve', state.rays[uuid])
            delete state.rays[uuid]
            break
        }
        case 'addTopDownVehicle': {
            const [chassisBody, wheels] = props
            const vehicle = new TopDownVehicle(state.bodies[chassisBody])
            for (let i = 0; i < wheels.length; i++) {
                const wheel = wheels[i]
                vehicle.addWheel(wheel)
            }
            vehicle.addToWorld(state.world);
            (state.vehicles[uuid] = vehicle)
            break
        }
        case 'removeTopDownVehicle': {
            state.vehicles[uuid].removeFromWorld()
            delete state.vehicles[uuid]
            break
        }
        case 'setTopDownVehicleSteeringValue': {
            const [value, wheelIndex] = props
            state.vehicles[uuid].wheels[wheelIndex].steerValue = value
            break
        }
        case 'applyTopDownVehicleEngineForce': {
            const [value, wheelIndex] = props
            state.vehicles[uuid].wheels[wheelIndex].engineForce = value
            break
        }
        case 'setTopDownVehicleBrake': {
            const [brake, wheelIndex] = props
            state.vehicles[uuid].wheels[wheelIndex].setBrakeForce(brake)
            break
        }

        case 'wakeUp': {
            state.bodies[uuid].wakeUp()
            break
        }
        case 'sleep': {
            state.bodies[uuid].sleep()
            break
        }
    }
}
