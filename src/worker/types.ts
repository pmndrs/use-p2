import type { Body, ContactEquation, Shape } from 'p2-es'

import type { IncomingWorkerMessage } from '../setup'

export type WithUUID<C> = C & { uuid?: string }

export interface CannonWorkerGlobalScope extends ServiceWorkerGlobalScope {
  postMessage(message: IncomingWorkerMessage['data'], transfer: Transferable[]): void
  postMessage(message: IncomingWorkerMessage['data'], options?: StructuredSerializeOptions): void
}

export interface ImpactEvent {
  bodyA: WithUUID<Body>;
  bodyB: WithUUID<Body>;
  contactEquation: ContactEquation;
  shapeA: Shape;
  shapeB: Shape;
  type: 'impact';
}
