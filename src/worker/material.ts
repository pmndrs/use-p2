import { Material } from 'p2-es'

import type { MaterialOptions } from '../setup'

export type CreateMaterial = (nameOrOptions?: MaterialOptions | number) => Material

let materialId = 0

export const createMaterialFactory =
  (materials: Record<number, Material>): CreateMaterial =>
  (nameOrOptions = {}) => {
    const materialOptions = typeof nameOrOptions === 'number' ? { id: nameOrOptions } : { ...nameOrOptions }
    const { id = materialId++ } = materialOptions
    
    let material = materials[id]
    if (!material) {
      material = new Material()
      material.id = id
      materials[id] = material
    }

    return materials[id]
  }
