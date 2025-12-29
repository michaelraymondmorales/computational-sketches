uniform float uTime;
uniform float uAspect;
varying vec2 vUv;

// Pseudo-random hash: Scrambles input coordinates into a 0.0-1.0 float
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D Value Noise: Smoothly interpolates between hash values for organic shapes
float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Quintic interpolation for smoother C2 continuity

    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
               mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
               mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void main() {
    // Setup coordinates
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uAspect;

    // Uses noise to 'liquify' the UV grid before waves are drawn
    float distortion = noise(vec3(uv * 5.0, uTime * 0.1));
    uv.x += distortion * 1.0; 
    uv.y += distortion * 1.0;

    // The 'Interference' Math
    float wave1 = sin(uv.x * 10.0 + uTime * 0.5);
    float wave2 = sin(uv.y * 3.0 + uTime * 0.8 + wave1);     
    float wave3 = sin(length(uv) * 15.0 - uTime * 0.4);   
 
    // Color Tuning
    vec3 waveColor1 = vec3(0.83, 0.68, 0.215); // Gold
    vec3 waveColor2 = vec3(0.0, 0.9, 0.5);     // Neon Teal
    vec3 waveColor3 = vec3(0.99, 0.0, 0.6);    // Neon Pink
    
    // Power Crunch: Pushing exponents to 33.3 sharpens soft gradients into thin 'isolines'
    float m1 = pow(wave1 * 0.5 + 0.5, 33.3);
    float m2 = pow(wave2 * 0.5 + 0.5, 33.3);
    float m3 = pow(wave3 * 0.5 + 0.5, 33.3);

    // Colors brighten and 'bloom' into white where filaments overlap
    vec3 finalColor = (m1 * waveColor1) + (m2 * waveColor2) + (m3 * waveColor3);

    gl_FragColor = vec4(finalColor, 1.0);
}