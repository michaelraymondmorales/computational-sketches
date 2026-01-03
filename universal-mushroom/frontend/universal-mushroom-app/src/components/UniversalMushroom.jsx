import { useMemo } from 'react'
import { BackSide, Vector3 } from 'three'
import vertexShader from '../shaders/vertex.glsl?raw'
import fragmentShader from '../shaders/fragment.glsl?raw'

const BOX_SIZE = 3.0

const UniversalMushroom = () => {
    const uniforms = useMemo(() => ({
        uCapWidth: { value: .7},
        uCapHeight: { value: .3},
        uStemRadius: { value: .1},
        uStemHeight: { value: 2},
        uGillCurvature: { value: .1},
        // Fragment shader placeholder for block position movement.
        uWorldBlockPos: { value: new Vector3(0, 0, 0) },
        uBoxHeight: { value: BOX_SIZE }
    }), []);

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