import { Body, Circle, Particle, Plane, Convex, Line, Box, Capsule, Heightfield, Material, vec2 } from 'p2-es'

function createShape(type, args) {
    console.log(type,args)
    switch (type) {
        case 'Box':
            return new Box({width: args[0], height: args[1]})
        case 'Circle':
            return new Circle({radius: args[0]})
        case 'Capsule':
            return new Capsule({length: args[0], radius: args[1]})
        case 'Particle':
            return new Particle() // no args
        case 'Plane':
            return new Plane(...args)
        case 'Convex':
            return new Convex() // TODO args?
        case 'Line':
            return new Line() // TODO args?
        case 'Heightfield':
            return new Heightfield(...args) // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
    }
}

/**
 *
 * @param uuid {string}
 * @param props {BodyProps}
 * @param type {BodyShapeType}
 * @return {module:objects/Body.Body}
 */
const propsToBody = (uuid, props, type) => {
    const {
        args = [],
        position = [0, 0],
        angle = 0,
        velocity = [0, 0],
        angularVelocity = 0,
        type: bodyType,
        mass,
        material,
        shapes,
        onCollide,
        collisionResponse,
        ...extra
    } = props

    const body = new Body({
        ...extra,
        mass: bodyType === 'Static' ? 0 : mass,
        type: bodyType ? Body[bodyType.toUpperCase()] : undefined,
        material: material ? new Material(material) : undefined,
    })
    body.uuid = uuid

    if (collisionResponse !== undefined) {
        body.collisionResponse = collisionResponse
    }

    if (type === 'Compound') {
        shapes.forEach(({type, args, position, angle, material, ...extra}) => {
            const shapeBody = body.addShape(
                createShape(type, args),
                position ? vec2.fromValues(...position) : undefined,
                angle,
            )
            if (material) shapeBody.material = new Material(material)
            Object.assign(shapeBody, extra)
        })
    } else {
        body.addShape(createShape(type, args))
    }

    vec2.set(body.position, position[0], position[1])
    body.angle = angle
    vec2.set(body.velocity, velocity[0], velocity[1])
    body.angularVelocity = angularVelocity
    return body
}

export default propsToBody
