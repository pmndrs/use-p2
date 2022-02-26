import type { Body, Constraint, ContactMaterial, Material, Spring, TopDownVehicle } from 'p2-es'
import { World } from 'p2-es'

import type { KinematicCharacterController, PlatformController } from '../Controllers'
import type { SubscriptionName, SubscriptionTarget } from '../setup'
import type { WithUUID } from './types'

interface DecoratedWorld extends World {
  bodies: WithUUID<Body>[]
  constraints: WithUUID<Constraint>[]
  contactMaterials: WithUUID<ContactMaterial>[]
}

export interface State {
  bodies: { [uuid: string]: Body }
  bodiesNeedSyncing: boolean
  constraints: { [uuid: string]: () => void }
  controllers: { [uuid: string]: { controller: KinematicCharacterController | PlatformController } }
  materials: { [uuid: string]: Material }
  normal: [number, number, number]
  normalIndex: number
  rays: { [uuid: string]: () => void }
  springInstances: { [uuid: string]: Spring }
  springs: { [uuid: string]: () => void }
  subscriptions: { [id: string]: [uuid: string, type: SubscriptionName, target: SubscriptionTarget] }
  vehicles: { [uuid: string]: { vehicle: TopDownVehicle } }
  world: DecoratedWorld
}
export const state: State = {
  bodies: {},
  bodiesNeedSyncing: false,
  constraints: {},
  controllers: {},
  materials: {},
  normal: [0, 0, 0],
  normalIndex: 0,
  rays: {},
  springInstances: {},
  springs: {},
  subscriptions: {},
  vehicles: {},
  world: new World(),
}
