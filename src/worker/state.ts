import { World } from 'p2-es'

const world = new World()

export const state = {
    bodies: {},
    controllers: {},
    vehicles: {},
    springs: {},
    springInstances: {},
    constraints: {},
    rays: {},
    materials: {},
    world,
    config: { step: 1 / 60 },
    subscriptions: {},
    bodiesNeedSyncing: false,
    lastCallTime: undefined,
}
