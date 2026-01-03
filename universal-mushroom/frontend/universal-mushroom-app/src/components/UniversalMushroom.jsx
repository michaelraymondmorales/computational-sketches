import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Vector3 } from 'three'
import vertexShader from '../shaders/vertex.glsl?raw'
import fragmentShader from '../shaders/fragment.glsl?raw'

const BOX_SIZE = 3.0

const UniversalMushroom = () => {
    const uniforms = useMemo(() => ({
        uCapWidth: { value: 0.7},
        uCapHeight: { value: 0.3},
        uCapTilt: { value: 0.35 },
        uCapWave: { value: 0.05 }, // Amplitude of the ripples
        uWaveFreq: { value: 7.0 }, // Number of ripples around the edge
        uStemRadius: { value: 0.15},
        uStemHeight: { value: 2.0},
        uStemBend: { value: 0.1 },
        uGillCurvature: { value: 0.1},
        uBoxHeight: { value: BOX_SIZE },
        uTime: { value: 0 },
        // Fragment shader placeholder for block position movement.
        uWorldBlockPos: { value: new Vector3(0, 0, 0) }
    }), []);

    useFrame((state) => {
        uniforms.uTime.value = state.clock.getElapsedTime();
    });

    return (
        <mesh frustumCulled={false}>
            <boxGeometry args={[BOX_SIZE,BOX_SIZE,BOX_SIZE]} />
            <shaderMaterial
                side={BackSide}
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </mesh>
    );
};

export default UniversalMushroom;