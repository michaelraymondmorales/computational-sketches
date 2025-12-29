import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import vertexShader from '../shaders/vertex.glsl?raw'
import fragmentShader from '../shaders/plasma-isolines-v0.glsl?raw'

const PlasmaPlane = () => {
    const meshRef = useRef();
    const viewport = useThree((state) => state.viewport); // Prevents re-renders from state changes.

    // useMemo ensures uniforms persist and don't trigger re-renders
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAspect: { value: viewport.width / viewport.height }
    }), []); // Empty dependency array: initialize once

    // This runs only when the window/viewport actually changes
    useEffect(() => {
        uniforms.uAspect.value = viewport.width / viewport.height;
    }, [viewport, uniforms]);

    useFrame((state) => {
        uniforms.uTime.value = state.clock.getElapsedTime();
    });

    return (
        <mesh scale={[viewport.width, viewport.height, 1]} ref={meshRef}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                transparent
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </mesh>
    );
};

export default PlasmaPlane;