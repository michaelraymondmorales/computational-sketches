import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SHADER_VERSIONS } from '../configs/shaderManifest'
import vertexShader from '../shaders/vertex.glsl?raw'

const PlasmaPlane = ({ version = 'v0' }) => {
    const current = SHADER_VERSIONS[version];
    const viewport = useThree((state) => state.viewport);
    
    // We create the uniforms based on the manifest requirements
    const uniforms = useMemo(() => ({
        ...current.initialUniforms,
        uAspect: { value: viewport.width / viewport.height }
    }), [version, viewport]);

    useFrame((state) => {
        uniforms.uTime.value = state.clock.getElapsedTime();
        
        // Conditional logic: Only update mouse if the version supports it
        if (current.config.useMouse && uniforms.uMouse) {
            uniforms.uMouse.value.x = state.pointer.x;
            uniforms.uMouse.value.y = state.pointer.y;
        }
    });

    return (
        <mesh scale={[viewport.width, viewport.height, 1]}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                key={version}
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={current.fragmentShader}
                transparent
            />
        </mesh>
    );
};

export default PlasmaPlane;