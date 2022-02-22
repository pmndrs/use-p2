import { lazy } from 'react'

const TopDownVehicle = { Component: lazy(() => import('./TopDownVehicle')) }
const PhysicalCharacterController = { Component: lazy(() => import('./PhysicalCharacterController')) }
const MarbleRun = { Component: lazy(() => import('./MarbleRun')) }
const Simple = { Component: lazy(() => import('./Simple')) }
const Shapes = { Component: lazy(() => import('./Shapes')) }
const Constraints = { Component: lazy(() => import('./Constraints')) }
const PingPong = { Component: lazy(() => import('./PingPong')) }
const KinematicCharacterController = { Component: lazy(() => import('./KinematicCharacterController')) }
const Friction = { Component: lazy(() => import('./Friction')) }
const Trigger = { Component: lazy(() => import('./Trigger')) }

export {
  Constraints,
  Friction,
  KinematicCharacterController,
  MarbleRun,
  PhysicalCharacterController,
  PingPong,
  Shapes,
  Simple,
  TopDownVehicle,
  Trigger,
}
