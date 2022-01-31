import {
    Body,
    Circle,
    Particle,
    Plane,
    Convex,
    Line,
    Box,
    Capsule,
    Heightfield,
    Material,
    vec2,
} from 'p2-es'

/**
 * @typedef { import('p2-es').MaterialOptions } MaterialOptions
 */

function createShape(type, args) {
    switch (type) {
        case 'Box':
            return new Box({width: args[0], height: args[1]})
        case 'Capsule':
            return new Capsule({length: args[0], radius: args[1]})
        case 'Circle':
            return new Circle({radius: args[0]})
        case 'Convex':
            return new Convex({vertices: args[0], axes: args[1]})
        case 'Particle':
            return new Particle()
        case 'Plane':
            return new Plane()
        case 'Line':
            return new Line({length: args[0]})
        case 'Heightfield':
            return new Heightfield({heights: args[0], elementWidth: args[1].elementWidth})
    }
}

/**
 * @function
 * @param {Object} options
 * @param {string} options.uuid
 * @param {BodyProps} options.props
 * @param {BodyShapeType} options.type
 * @param {(materialOptions: MaterialOptions) => Material =} options.createMaterial
 * @returns {Body}
 */
const propsToBody = (options) => {
    const { uuid, props, type, createMaterial = (materialOptions) => new Material(materialOptions) } = options
    const {
        args = [],
        position = [0, 0],
        angle = 0,
        velocity = [0, 0],
        angularVelocity = 0,
        type: bodyType,
        isTrigger,
        mass,
        material,
        shapes,
        onCollide,
        collisionResponse,
        collisionGroup = -1,
        ...extra
    } = props

    const body = new Body({
        ...extra,
        mass: bodyType === 'Static' ? 0 : mass,
        type: bodyType ? Body[bodyType.toUpperCase()] : undefined,
        material: material ? createMaterial(material) : undefined,
    })

    body.uuid = uuid

    if (collisionResponse !== undefined) {
        body.collisionResponse = collisionResponse
    }

    if (type === 'Compound') {
        shapes.forEach(({type, args, position, angle, material, ...extra}, i) => {
            body.addShape(
                createShape(type, args),
                position ? vec2.fromValues(...position) : undefined,
                angle,
            )
            if (material) body.shapes[i].material = createMaterial(material)
            if (isTrigger) body.shapes[i].sensor = isTrigger
            Object.assign(body, extra)
        })
    } else {
        const shape = createShape(type, args)
        shape.collisionGroup = collisionGroup
        if (material) shape.material = createMaterial(material)
        if (isTrigger) shape.sensor = isTrigger
        body.addShape(shape)
    }

    vec2.set(body.position, position[0], position[1])
    body.angle = angle
    vec2.set(body.velocity, velocity[0], velocity[1])
    body.angularVelocity = angularVelocity
    return body
}

export default propsToBody
