import v0Frag from '../shaders/plasma-isolines-v0.glsl?raw';
import v1Frag from '../shaders/plasma-isolines-v1.glsl?raw';

export const SHADER_VERSIONS = {
  v0: {
    name: "Classic Plasma",
    fragmentShader: v0Frag,
    config: { useMouse: false },
    initialUniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1.0 },
    }
  },
  v1: {
    name: "Digital Iris",
    fragmentShader: v1Frag,
    config: { useMouse: true },
    initialUniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1.0 },
      uMouse: { value: { x: 0, y: 0 } },
    }
  }
};