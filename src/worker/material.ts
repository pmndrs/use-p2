import {Material, type MaterialOptions} from 'p2-es'

export type CreateMaterial = (materialOptions?: MaterialOptions | number) => Material

let materialId = 0

export const createMaterialFactory = (materials: Record<number, Material>): CreateMaterial =>
    (materialOptions = {}) => {
        const {
            id = materialId++,
        }: MaterialOptions = typeof materialOptions === 'number'
            ? {id: materialOptions}
            : {...materialOptions}
        return (materials[id] ||= new Material(id))
    }
