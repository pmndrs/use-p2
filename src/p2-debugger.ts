import {
    Mesh,
    BufferGeometry,
    Vector3,
    LineBasicMaterial,
    Line as THREELine,
} from 'three'
import type {Body, Shape as ShapeType, Circle} from 'p2-es'
import type {Scene, Color} from 'three'
import {Shape} from 'p2-es'

type ComplexShape = ShapeType & { geometryId?: number }
export type DebugOptions = {
    normalIndex?: number
    color?: string | number | Color
    scale?: number
    onInit?: (body: Body, mesh: Mesh, shape: ShapeType) => void
    onUpdate?: (body: Body, mesh: Mesh, shape: ShapeType) => void
    autoUpdate?: boolean
}

export default function cannonDebugger(
    scene: Scene,
    bodies: Body[],
    {normalIndex = 0, color = 0x00ff00, scale = 1, onInit, onUpdate, autoUpdate}: DebugOptions = {}
) {
    const _meshes: Mesh[] = []
    const _material = new LineBasicMaterial({color: color ?? 0x00ff00, depthTest: false})
    const _boxPoints = new Array(5).fill({}).map((u, i) => {
        const arr = [0.7071 * Math.cos(i * 2 * Math.PI / 4 + Math.PI / 4), 0.7071 * Math.sin(i * 2 * Math.PI / 4 + Math.PI / 4)]
        arr.splice(normalIndex, 0, 0)
        return new Vector3(...arr)
    }) // generate box with side = 1 from circle equation
    const _boxGeometry = new BufferGeometry().setFromPoints(_boxPoints)
    const _circlePrecision = 24
    const _circlePoints = new Array(_circlePrecision + 1).fill({}).map((u, i) => {
        const arr = [Math.cos(i * 2 * Math.PI / _circlePrecision), Math.sin(i * 2 * Math.PI / _circlePrecision)]
        arr.splice(normalIndex, 0, 0)
        return new Vector3(...arr)
    })
    const _circleGeometry = new BufferGeometry().setFromPoints(_circlePoints)

    function createMesh(shape: ShapeType): Mesh {
        let mesh = new Mesh()
        const {BOX, CIRCLE} = Shape

        switch (shape.type) {
            case BOX: {
                // @ts-ignore
                mesh = new THREELine(_boxGeometry, _material)
                break
            }
            case CIRCLE: {
                // @ts-ignore
                mesh = new THREELine(_circleGeometry, _material)
                break
            }
        }
        scene.add(mesh)
        return mesh
    }

    function scaleMesh(mesh: Mesh, shape: ShapeType | ComplexShape): void {
        const {CIRCLE, BOX} = Shape
        switch (shape.type) {
            case CIRCLE: {
                const {radius} = shape as Circle
                mesh.scale.set(radius * scale, radius * scale, radius * scale)
                break
            }
            case BOX: {
                // @ts-ignore
                mesh.scale.copy({x: shape.width, y: shape.height, z: shape.height} as Vector3)
                //mesh.scale.multiplyScalar(2 * scale)
                break
            }
        }
    }


    function typeMatch(mesh: Mesh, shape: ShapeType | ComplexShape): boolean {
        if (!mesh) return false
        const {geometry} = mesh
        return (
            (geometry instanceof BufferGeometry && shape.type === Shape.BOX)
        )
    }

    function updateMesh(index: number, shape: ShapeType | ComplexShape): boolean {
        let mesh = _meshes[index]
        let didCreateNewMesh = false

        if (!typeMatch(mesh, shape)) {
            if (mesh) scene.remove(mesh)
            _meshes[index] = mesh = createMesh(shape)
            didCreateNewMesh = true
        }

        scaleMesh(mesh, shape)
        return didCreateNewMesh
    }

    function update(): void {
        const meshes = _meshes
        let _p = []

        let meshIndex = 0

        for (const body of bodies) {
            for (let i = 0; i !== body.shapes.length; i++) {
                const shape = body.shapes[i]
                const didCreateNewMesh = updateMesh(meshIndex, shape)
                const mesh = meshes[meshIndex]

                if (mesh) {
                    // Get world position
                    //body.quaternion.vmult(body.shapeOffsets[i], shapeWorldPosition)
                    //vec2.add(shapeWorldPosition, body.position, shapeWorldPosition)

                    // Get world quaternion
                    //body.quaternion.mult(body.shapeOrientations[i], shapeWorldQuaternion)

                    // Copy to meshes
                    // @ts-ignore
                    _p = [...body.position]
                    _p.splice(normalIndex, 0, 0)
                    // @ts-ignore
                    mesh.position.set(..._p)
                    // @ts-ignore
                    mesh.quaternion.copy(body.quaternion)

                    if (didCreateNewMesh && onInit instanceof Function) onInit(body, mesh, shape)
                    if (!didCreateNewMesh && onUpdate instanceof Function) onUpdate(body, mesh, shape)
                }

                meshIndex++
            }
        }

        for (let i = meshIndex; i < meshes.length; i++) {
            const mesh = meshes[i]
            if (mesh) scene.remove(mesh)
        }

        meshes.length = meshIndex
        if (autoUpdate !== false) requestAnimationFrame(update)
    }

    if (autoUpdate !== false) requestAnimationFrame(update)
    return {update}
}
