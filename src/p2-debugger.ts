import type { Body, Capsule, Circle, Line, Shape as ShapeType, World } from 'p2-es'
import { Shape, vec2 } from 'p2-es'
import type { Scene } from 'three'
import { Mesh } from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'

type ComplexShape = ShapeType & { geometryId?: number }
export type DebugOptions = {
  autoUpdate?: boolean
  color?: number
  linewidth?: number
  normalIndex?: number
  onInit?: (body: Body, mesh: Mesh, shape: ShapeType) => void
  onUpdate?: (body: Body, mesh: Mesh, shape: ShapeType) => void
  scale?: number
}

export default function CannonDebugger(
  scene: Scene,
  world: World,
  { color = 0xffffff, linewidth = 0.002, normalIndex = 0, onInit, onUpdate, scale = 1 }: DebugOptions = {},
) {
  const _meshes: Mesh[] = []
  const _tempVec0 = vec2.create()
  const _tempVec1 = vec2.create()
  const _tempVec2 = [0, 0] as [x: number, y: number]
  const _lineMaterial = new LineMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    linewidth,
    transparent: true,
  })
  const _normal = [0, 0, 0]
  _normal.splice(normalIndex, 1, 1)

  const _boxPoints = new Array(5).fill({}).map((u, i) => {
    const arr = [
      (1 / Math.sqrt(2)) * Math.cos((i * 2 * Math.PI) / 4 + Math.PI / 4),
      (1 / Math.sqrt(2)) * Math.sin((i * 2 * Math.PI) / 4 + Math.PI / 4),
    ]
    arr.splice(normalIndex, 0, 0)
    return arr
  }) // generate box with side = 1 from circle equation
  const _boxGeometry = new LineGeometry().setPositions(_boxPoints.flat(1))

  const _circlePrecision = 24
  const _circlePoints = new Array(_circlePrecision + 1).fill({}).map((u, i) => {
    const arr = [
      Math.cos((i * 2 * Math.PI) / _circlePrecision),
      Math.sin((i * 2 * Math.PI) / _circlePrecision),
    ]
    arr.splice(normalIndex, 0, 0)
    return arr
  })
  const _circleGeometry = new LineGeometry().setPositions(_circlePoints.flat(1))

  const _capsulePoints = new Array(_circlePrecision + 1).fill({}).map((u, i) => {
    const arr = [
      Math.sin((i * 2 * Math.PI) / _circlePrecision),
      -Math.cos((i * 2 * Math.PI) / _circlePrecision),
    ]
    arr.splice(normalIndex, 0, 0)
    return arr
  })
  _capsulePoints.splice(_circlePrecision / 2, 0, _capsulePoints[_circlePrecision / 2])
  _capsulePoints.push(_capsulePoints[0])
  const _capsuleGeometry = new LineGeometry().setPositions(_capsulePoints.flat(1))

  const _particlePrecision = 6
  const _particleRadius = 0.05
  const _particlePoints = new Array(_particlePrecision + 1).fill({}).map((u, i) => {
    const arr = [
      _particleRadius * Math.cos((i * 2 * Math.PI) / _particlePrecision),
      _particleRadius * Math.sin((i * 2 * Math.PI) / _particlePrecision),
    ]
    arr.splice(normalIndex, 0, 0)
    return arr
  })
  const _particleGeometry = new LineGeometry().setPositions(_particlePoints.flat(1))

  const _linePositions = [
    [-0.5, 0],
    [0.5, 0],
  ].map((v) => {
    const temp = [...v]
    temp.splice(normalIndex, 0, 0)
    return temp
  })
  const _lineGeometry = new LineGeometry().setPositions(_linePositions.flat(1))

  function createMesh(shape: ShapeType): Mesh {
    let mesh = new Mesh()
    const { BOX, CAPSULE, CIRCLE, CONVEX, HEIGHTFIELD, LINE, PARTICLE, PLANE } = Shape

    switch (shape.type) {
      case BOX: {
        mesh = new Line2(_boxGeometry, _lineMaterial)
        break
      }
      case CAPSULE: {
        mesh = new Line2(_capsuleGeometry, _lineMaterial)
        break
      }
      case CIRCLE: {
        mesh = new Line2(_circleGeometry, _lineMaterial)
        break
      }
      case CONVEX: {
        const positions: number[][] = []
        // @ts-ignore
        shape.vertices.map((v) => {
          const w = [...v]
          w.splice(normalIndex, 0, 0)
          positions.push(w)
        })
        positions.push(positions[0])
        const _convexGeometry = new LineGeometry().setPositions(positions.flat(1))
        mesh = new Line2(_convexGeometry, _lineMaterial)
        break
      }
      case HEIGHTFIELD: {
        const positions: number[][] = []
        // @ts-ignore
        shape.heights.map((v, i) => {
          // @ts-ignore
          const w = [i * shape.elementWidth, v]
          w.splice(normalIndex, 0, 0)
          positions.push(w)
        })
        const _geometry = new LineGeometry().setPositions(positions.flat(1))
        mesh = new Line2(_geometry, _lineMaterial)
        break
      }
      case LINE:
      case PLANE: {
        mesh = new Line2(_lineGeometry, _lineMaterial)
        break
      }
      case PARTICLE: {
        mesh = new Line2(_particleGeometry, _lineMaterial)
        break
      }
    }
    scene.add(mesh)
    return mesh
  }

  function scaleMesh(mesh: Mesh, shape: ShapeType | ComplexShape): void {
    const { BOX, CAPSULE, CIRCLE, LINE, PLANE } = Shape
    switch (shape.type) {
      case BOX: {
        // @ts-ignore
        const scale = [shape.width, shape.height]
        scale.splice(normalIndex, 0, 1)
        // @ts-ignore
        mesh.scale.set(...scale)
        //mesh.scale.multiplyScalar(2 * scale)
        break
      }
      case CAPSULE: {
        const { length, radius } = shape as Capsule
        const positions = _capsulePoints.flat(1) // changing geometry positions of regular line works, not so for line2
        for (let i = 0, l = positions.length; i < l; i++) {
          positions[i] *= radius
          if (i % 3 === 0) positions[i] += (length / 2) * (i > l / 2 - 1 && i < l - 3 ? -1 : 1)
        }
        mesh.geometry = new LineGeometry().setPositions(positions)
        break
      }
      case CIRCLE: {
        const { radius } = shape as Circle
        mesh.scale.set(radius * scale, radius * scale, radius * scale)
        break
      }

      case LINE: {
        const { length } = shape as Line
        mesh.scale.set(length * scale, length * scale, length * scale)
        break
      }
      case PLANE: {
        mesh.scale.set(100 * scale, 100 * scale, 100 * scale)
        break
      }
    }
  }

  function typeMatch(mesh: Mesh): boolean {
    if (!mesh) return false
    return mesh.type === 'Line2'
  }

  function updateMesh(index: number, shape: ShapeType | ComplexShape): boolean {
    let mesh = _meshes[index]
    let didCreateNewMesh = false

    if (!typeMatch(mesh)) {
      if (mesh) scene.remove(mesh)
      _meshes[index] = mesh = createMesh(shape)
      didCreateNewMesh = true
    }

    scaleMesh(mesh, shape)
    return didCreateNewMesh
  }

  function update(): void {
    const meshes = _meshes
    const shapeOffset = _tempVec0
    const shapeWorldPosition = _tempVec1
    const shape3position = _tempVec2

    let meshIndex = 0

    for (const body of world.bodies) {
      for (let i = 0; i !== body.shapes.length; i++) {
        const shape = body.shapes[i]
        const didCreateNewMesh = updateMesh(meshIndex, shape)
        const mesh = meshes[meshIndex]

        if (mesh) {
          // Get world position
          vec2.rotate(shapeOffset, shape.position, body.angle)
          vec2.add(shapeWorldPosition, body.position, shapeOffset)

          // Copy to meshes
          vec2.copy(shape3position, shapeWorldPosition)
          shape3position.splice(normalIndex, 0, 0)
          // @ts-ignore
          mesh.position.set(...shape3position)

          // TODO: there is an issue with angle to quaternion conversion if normalIndex is 1

          const s = Math.sin(body.angle * 0.5)
          mesh.quaternion.set(s * _normal[0], s * _normal[1], s * _normal[2], Math.cos(body.angle * 0.5))

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
  }

  return { update }
}
