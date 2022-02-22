import { Canvas } from '@react-three/fiber'
import { Debug, Physics } from '@react-three/p2'
import React, { useRef } from 'react'

import { useToggledControl } from '../../use-toggled-control'
import Pylon from './Pylon'
import Vehicle from './Vehicle'

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min
}

const VehicleScene = () => {
  const ToggledDebug = useToggledControl(Debug, '?')

  const pylonPositions = useRef(
    new Array(30).fill({}).map(() => [getRandomArbitrary(-15, 15), getRandomArbitrary(-15, 15)]),
  )

  return (
    <>
      <Canvas shadows camera={{ position: [10, 20, 10], fov: 50 }}>
        <color attach="background" args={['#171720']} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color={0x70798b} />
        </mesh>
        <Physics gravity={[0, 0]} normalIndex={1}>
          <ToggledDebug normalIndex={1}>
            {pylonPositions.current.map((p, i) => (
              <Pylon position={p} angle={(i * Math.PI) / 13} key={i} />
            ))}
            <Vehicle />
          </ToggledDebug>
        </Physics>
      </Canvas>
      <div style={{ position: 'absolute', bottom: '50px', left: '50vw', transform: 'translate(-50%, 0)' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src={'./kenney_gameicons/arrowUp.png'} alt="" />
        </div>
        <div style={{ display: 'flex' }}>
          <img src={'./kenney_gameicons/arrowLeft.png'} alt="" />
          <img src={'./kenney_gameicons/arrowDown.png'} alt="" />
          <img src={'./kenney_gameicons/arrowRight.png'} alt="" />
        </div>
      </div>
    </>
  )
}

export default VehicleScene
