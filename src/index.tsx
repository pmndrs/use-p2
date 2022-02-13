import type { FC } from 'react'
import { Suspense } from 'react'
import { Provider } from './Provider'

import type { ProviderProps } from './Provider'

export * from './Debug'
export * from './hooks'
export * from './setup'

export const Physics: FC<ProviderProps> = (props) => (
  <Suspense fallback={null}>
    <Provider {...props} />
  </Suspense>
)
