import { World } from 'p2-es'

const world = new World()

export const state = {
  bodies: {},
  bodiesNeedSyncing: false,
  config: { step: 1 / 60 },
  constraints: {},
  controllers: {},
  lastCallTime: undefined,
  materials: {},
  rays: {},
  springInstances: {},
  springs: {},
  subscriptions: {},
  vehicles: {},
  world,
}
