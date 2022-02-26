import { TopDownVehicle } from 'p2-es'

import type { CannonMessageMap } from '../../setup'
import type { State } from '../state'

export const addTopDownVehicle = (state: State, data: CannonMessageMap['addTopDownVehicle']) => {
  const [chassisBody, wheelInfos] = data.props

  const vehicle = new TopDownVehicle(state.bodies[chassisBody])

  for (let i = 0; i < wheelInfos.length; i++) {
    const wheel = wheelInfos[i]
    vehicle.addWheel(wheel)
  }

  vehicle.addToWorld(state.world)

  state.vehicles[data.uuid] = { vehicle }
}
