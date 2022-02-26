import type { Body, ContactEquation } from 'p2-es'

import type { IncomingWorkerMessage } from '../setup'

export type WithUUID<C> = C & { uuid?: string }

export interface CannonWorkerGlobalScope extends ServiceWorkerGlobalScope {
  postMessage(message: IncomingWorkerMessage['data'], transfer: Transferable[]): void
  postMessage(message: IncomingWorkerMessage['data'], options?: StructuredSerializeOptions): void
}

export interface CannonCollideEvent {
  bodyA: WithUUID<Body>
  bodyB: WithUUID<Body>
  contactEquation: any

  body: WithUUID<Body>
  contact: ContactEquation
  target: WithUUID<Body>
  type: 'collide'
}
