/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  Broadphase,
  GSSolver,
  NaiveBroadphase,
  PrismaticConstraint,
  RevoluteConstraint,
  SAPBroadphase,
  vec2,
} from 'p2-es'

import { KinematicCharacterController, PlatformController } from '../Controllers'
import type { CannonMessage } from '../setup'
import { addContactMaterial, removeContactMaterial } from './contact-material'
import { createMaterialFactory } from './material'
import {
  addBodies,
  addConstraint,
  addKinematicCharacterController,
  addRay,
  addSpring,
  addTopDownVehicle,
  init,
  step,
} from './operations'
import { state } from './state'
import type { CannonWorkerGlobalScope } from './types'

declare const self: CannonWorkerGlobalScope

const isPrismaticConstraint = (c: unknown): c is PrismaticConstraint => c instanceof PrismaticConstraint
const isRevoluteConstraint = (c: unknown): c is RevoluteConstraint => c instanceof RevoluteConstraint

function syncBodies() {
  state.bodiesNeedSyncing = true
  state.bodies = state.world.bodies.reduce((bodies, body) => ({ ...bodies, [body.uuid!]: body }), {})
}

//const broadphases = { NaiveBroadphase, SAPBroadphase }
const createMaterial = createMaterialFactory(state.materials)

self.onmessage = ({ data }: { data: CannonMessage }) => {
  switch (data.op) {
    case 'init': {
      init(state, data.props)
      break
    }
    case 'step': {
      step(state, data)
      break
    }
    case 'addBodies': {
      addBodies(state, createMaterial, data)
      syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < data.uuid.length; i++) state.world.removeBody(state.bodies[data.uuid[i]])
      syncBodies()
      break
    }
    case 'subscribe': {
      const { id, target, type } = data.props
      state.subscriptions[id] = [data.uuid, type, target]
      break
    }
    case 'unsubscribe': {
      delete state.subscriptions[data.props]
      break
    }
    case 'setPosition':
      vec2.set(state.bodies[data.uuid].position, data.props[0], data.props[1])
      break
    case 'setAngle':
      state.bodies[data.uuid].angle = data.props
      break
    case 'setVelocity':
      state.bodies[data.uuid].velocity = [data.props[0], data.props[1]]
      break
    case 'setAngularVelocity':
      state.bodies[data.uuid].angularVelocity = data.props
      break
    case 'setMass':
      state.bodies[data.uuid].mass = data.props
      state.bodies[data.uuid].updateMassProperties()
      break
    case 'setMaterial':
      // todo material is per shape not per body
      //state.bodies[data.uuid].material = data.props ? createMaterial(data.props) : null
      break
    case 'setLinearDamping':
      state.bodies[data.uuid].damping = data.props
      break
    case 'setAngularDamping':
      state.bodies[data.uuid].angularDamping = data.props
      break
    case 'setAllowSleep':
      state.bodies[data.uuid].allowSleep = data.props
      break
    case 'setSleepSpeedLimit':
      state.bodies[data.uuid].sleepSpeedLimit = data.props
      break
    case 'setSleepTimeLimit':
      state.bodies[data.uuid].sleepTimeLimit = data.props
      break
    case 'setCollisionFilterGroup':
      // shapes have this prop
      //state.bodies[data.uuid].collisionGroup = data.props
      break
    case 'setCollisionFilterMask':
      // shapes have this prop
      //state.bodies[data.uuid].collisionMask = data.props
      break
    case 'setCollisionResponse':
      state.bodies[data.uuid].collisionResponse = data.props
      break
    case 'setFixedRotation':
      state.bodies[data.uuid].fixedRotation = data.props
      break
    case 'setIsTrigger':
      // shapes have sensor prop
      //state.bodies[data.uuid].isTrigger = data.props
      break
    case 'setGravity':
      vec2.set(state.world.gravity, data.props[0], data.props[1])
      break
    case 'setTolerance':
      if (state.world.solver instanceof GSSolver) {
        state.world.solver.tolerance = data.props
      }
      break
    case 'setIterations':
      if (state.world.solver instanceof GSSolver) {
        state.world.solver.iterations = data.props
      }
      break
    case 'setBroadphase':
      state.world.broadphase =
        data.props === 'SAP' ? new SAPBroadphase(Broadphase.SAP) : new NaiveBroadphase(Broadphase.NAIVE)
      //state.world.broadphase = new (broadphases[`${data.props}Broadphase`] || NaiveBroadphase)(state.world)
      break
    case 'setAxisIndex':
      if (state.world.broadphase instanceof SAPBroadphase) {
        state.world.broadphase.axisIndex = data.props === undefined || data.props === null ? 0 : data.props
      }
      break
    case 'applyForce':
      state.bodies[data.uuid].applyForce(
        vec2.fromValues(...data.props[0]),
        data.props[1] && vec2.fromValues(...data.props[1]),
      )
      break
    case 'applyImpulse':
      state.bodies[data.uuid].applyImpulse(
        vec2.fromValues(...data.props[0]),
        data.props[1] && vec2.fromValues(...data.props[1]),
      )
      break
    case 'applyLocalForce':
      state.bodies[data.uuid].applyForceLocal(
        vec2.fromValues(...data.props[0]),
        data.props[1] && vec2.fromValues(...data.props[1]),
      )
      break
    case 'applyLocalImpulse':
      state.bodies[data.uuid].applyImpulseLocal(
        vec2.fromValues(...data.props[0]),
        data.props[1] && vec2.fromValues(...data.props[1]),
      )
      break
    case 'applyTorque':
      //state.bodies[data.uuid].applyTorque(vec2.fromValues(...data.props[0]))
      break
    case 'addConstraint': {
      addConstraint(state, data)
      break
    }
    case 'removeConstraint':
      state.world.constraints
        .filter(({ uuid }) => uuid === data.uuid)
        .map((c) => state.world.removeConstraint(c))
      break
    case 'enableConstraintMotor':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isPrismaticConstraint || isRevoluteConstraint)
        .map((c) => c.enableMotor())
      break
    case 'disableConstraintMotor':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isPrismaticConstraint || isRevoluteConstraint)
        .map((c) => c.disableMotor())
      break
    case 'setConstraintMotorSpeed':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isRevoluteConstraint)
        .map((c) => c.setMotorSpeed(data.props))
      break
    case 'addSpring': {
      addSpring(state, data)
      break
    }
    case 'setSpringStiffness': {
      state.springInstances[data.uuid].stiffness = data.props
      break
    }
    case 'setSpringRestLength': {
      // only LinearSpring
      //state.springInstances[data.uuid].restLength = data.props
      break
    }
    case 'setSpringDamping': {
      state.springInstances[data.uuid].damping = data.props
      break
    }
    case 'removeSpring': {
      // not needed in p2?
      //state.world.off('postStep', state.springs[data.uuid])
      break
    }
    case 'addRay': {
      addRay(state, data)
      break
    }
    case 'removeRay': {
      state.world.off('preSolve', state.rays[data.uuid])
      delete state.rays[data.uuid]
      break
    }
    case 'addContactMaterial': {
      addContactMaterial(state.world, createMaterial, data.props, data.uuid)
      break
    }
    case 'removeContactMaterial': {
      removeContactMaterial(state.world, data.uuid)
      break
    }
    case 'addTopDownVehicle': {
      addTopDownVehicle(state, data)
      break
    }
    case 'removeTopDownVehicle': {
      state.vehicles[data.uuid].vehicle.removeFromWorld()
      delete state.vehicles[data.uuid]
      break
    }
    case 'setTopDownVehicleSteeringValue': {
      const [value, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.wheels[wheelIndex].steerValue = value
      break
    }
    case 'applyTopDownVehicleEngineForce': {
      const [value, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.wheels[wheelIndex].engineForce = value
      break
    }
    case 'setTopDownVehicleBrake': {
      const [brake, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.wheels[wheelIndex].setBrakeForce(brake)
      break
    }
    case 'addKinematicCharacterController': {
      addKinematicCharacterController(state, data)
      break
    }
    case 'removeKinematicCharacterController': {
      delete state.controllers[data.uuid]
      break
    }
    case 'setKinematicCharacterControllerInput': {
      if (state.controllers[data.uuid].controller instanceof KinematicCharacterController) {
        const controller = <KinematicCharacterController>state.controllers[data.uuid].controller
        controller.input = data.props
      }
      break
    }
    case 'setKinematicCharacterControllerJump': {
      if (state.controllers[data.uuid].controller instanceof KinematicCharacterController) {
        const controller = <KinematicCharacterController>state.controllers[data.uuid].controller
        controller.setJumpKeyState(data.props)
      }
      break
    }
    case 'addPlatformController': {
      const [body, passengerMask, localWaypoints, speed, skinWidth, dstBetweenRays] = data.props
      const controller = new PlatformController({
        body: state.bodies[body],
        //controllers: Object.fromEntries(Object.entries(state.controllers).filter(([, val]) => val.controller instanceof KinematicCharacterController)) as { [uuid: string]: { controller: KinematicCharacterController } },
        controllers: state.controllers as { [uuid: string]: { controller: KinematicCharacterController } },
        dstBetweenRays,
        localWaypoints,
        passengerMask,
        skinWidth,
        speed,
        world: state.world,
      })
      state.controllers[data.uuid] = { controller }
      break
    }
    case 'removePlatformController': {
      delete state.controllers[data.uuid]
      break
    }
    case 'wakeUp': {
      state.bodies[data.uuid].wakeUp()
      break
    }
    case 'sleep': {
      state.bodies[data.uuid].sleep()
      break
    }
  }
}
