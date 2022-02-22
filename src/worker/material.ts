import { type MaterialOptions, Material } from 'p2-es'

export type CreateMaterial = (nameOrOptions?: MaterialOptions | number) => Material

let materialId = 0

export const createMaterialFactory =
  (materials: Record<number, Material>): CreateMaterial =>
  (nameOrOptions = {}) => {
      const materialOptions =
          typeof nameOrOptions === 'number'
              ? { id: nameOrOptions }
              : { ...nameOrOptions } //name: Symbol.for(`Material${materialId++}`),
      const { id = materialId++ } = materialOptions
      materials[id] = materials[id] || new Material(id)
      return materials[id]
  }
