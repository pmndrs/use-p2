import { lazy } from 'react'

const TopDownVehicle = { Component: lazy(() => import('./TopDownVehicle')) }
const SideScroller = { Component: lazy(() => import('./SideScroller')) }
const MarbleRun = { Component: lazy(() => import('./MarbleRun')) }
const Simple = { Component: lazy(() => import('./Simple')) }

export {
  TopDownVehicle,
  SideScroller,
  MarbleRun,
  Simple,
}
