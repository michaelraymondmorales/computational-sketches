#define MAX_STEPS 100
#define MAX_DIST 20.0
#define SURF_DIST 0.001
uniform float uCapWidth;
uniform float uCapHeight;
uniform float uCapTilt;
uniform float uCapWave;
uniform float uWaveFreq;
uniform float uStemRadius;
uniform float uStemHeight;
uniform float uStemBend;
uniform float uGillCurvature;
uniform float uBoxHeight;
uniform float uTime;
uniform vec3 uWorldBlockPos;
varying vec3 vWorldPos;
varying vec3 vCamPos;

// Simple Smooth Minimum for organic blending
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * (1.0 / 4.0);
}

vec3 applyBend(vec3 p, float bend) {
    float c = cos(bend * p.y);
    float s = sin(bend * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 newP = vec3(m * p.xy, p.z);
    return newP;
}

float mushroomSDF(vec3 p, 
                  float capWidth, 
                  float capHeight, 
                  float capTilt,
                  float capWave,
                  float waveFreq,
                  float stemRadius, 
                  float stemHeight, 
                  float stemBend, 
                  float gillCurvature) {
    // 1. PIN TO WORLD BLOCK
    // Anchors the mushroom to the bottom of the box
    vec3 pCentered = p - uWorldBlockPos + vec3(0.0, uBoxHeight * 0.5, 0.0);

    // 2. STEM BEND (The "Gesture")
    // Warp the local space, this affects everything above the base
    vec3 bentP = applyBend(pCentered, stemBend);

    // 3. THE STEM
    float dStem = length(bentP.xz) - stemRadius;
    dStem = max(dStem, abs(bentP.y - stemHeight * 0.5) - stemHeight * 0.5);

    // 4. THE CAP TILT
    // Isolate the cap's coordinate space
    vec3 capP = bentP - vec3(0.0, stemHeight, 0.0);
    
    // Local rotation for the cap
    float ct = cos(capTilt);
    float st = sin(capTilt);
    mat2 rot = mat2(ct, -st, st, ct);
    capP.xy *= rot;

    // 5. THE CAP WITH WAVES
    // Calculate angle for the wave
    float angle = atan(capP.z, capP.x);
    
    // Create the undulating wave effect
    // Only apply the wave as we move away from the center (length(capP.xz))
    float wave = sin(angle * waveFreq) * capWave;
    
    // Apply wave to the horizontal scaling (X and Z)
    float waveScale = 1.0 + wave;
    vec3 scale = vec3(capWidth * waveScale, capHeight, capWidth * waveScale);
    
    float dCap = length(capP / scale) - 1.0;
    dCap *= min(capWidth, capHeight);

    // 6. THE GILLS
    float gills = sin(angle * 40.0) * 0.02 * gillCurvature;
    if (capP.y < 0.0) dCap += gills;

    return smin(dCap, dStem, 0.2);
}

float rayMarch(vec3 ro, 
               vec3 rd, 
               float capW, 
               float capH, 
               float capT,
               float capF,
               float waveF,
               float stemR, 
               float stemH, 
               float stemB, 
               float gillC) {
    float dO = 0.0; // Distance from Origin
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO; // Current position of the ray tip
        float dS = mushroomSDF(p, capW, capH, capT, capF, waveF, stemR, stemH, stemB, gillC); // How far is the closest surface?
        dO += dS; // "Step" forward by that distance
        
        // If we hit something or go too far, break
        if(dO > MAX_DIST || abs(dS) < SURF_DIST) break;
    }
    
    return dO;
}

vec3 getNormal(vec3 p, 
               float capW, 
               float capH, 
               float capT,
               float capF,
               float waveF,
               float stemR, 
               float stemH, 
               float stemB, 
               float gillC) {
    // A tiny offset to check the neighborhood
    vec2 e = vec2(0.01, 0.0);
    
    // Sample the SDF in all three directions
    float d = mushroomSDF(p, capW, capH, capT, capF, waveF, stemR, stemH, stemB, gillC);
    vec3 n = d - vec3(
        mushroomSDF(p - e.xyy, capW, capH, capT, capF, waveF, stemR, stemH, stemB, gillC),
        mushroomSDF(p - e.yxy, capW, capH, capT, capF, waveF, stemR, stemH, stemB, gillC),
        mushroomSDF(p - e.yyx, capW, capH, capT, capF, waveF, stemR, stemH, stemB, gillC)
    );
    
    return normalize(n);
}

void main() {
    // Calculate the "Wind Force"
    // Using two sines creates a natural, non repetitive feeling
    float wind = sin(uTime * 1.2) * 0.5 + sin(uTime * 2.5) * 0.2;
    
    // Animate the Stem Bend (Slower, heavier sway)
    float animatedBend = uStemBend + (wind * 0.05);

    // Animate the Cap Waves (Faster "shiver")
    float animatedWave = uCapWave + (sin(uTime * 4.0) * 0.01);

    // Setup the Ray
    vec3 ro = vCamPos;
    vec3 rd = normalize(vWorldPos - vCamPos);

    // March the Ray
    float d = rayMarch(ro, rd, uCapWidth, uCapHeight, uCapTilt, animatedWave, uWaveFreq, uStemRadius, uStemHeight, animatedBend, uGillCurvature);

    if(d > MAX_DIST) discard;

    // Calculate Lighting at the Hit Point
    vec3 p = ro + rd * d;
    vec3 n = getNormal(p, uCapWidth, uCapHeight, uCapTilt, animatedWave, uWaveFreq, uStemRadius, uStemHeight, animatedBend, uGillCurvature);
    
    // Simple Lighting (Bone / Ghost Palette)
    vec3 lightPos = uWorldBlockPos + vec3(2.0, 5.0, 3.0);
    vec3 l = normalize(lightPos - p);
    
    // Diffuse lighting
    float diff = dot(n, l) * 0.5 + 0.5; // Wrapped lighting for softer look
    
    // Fresnel / Rim light for that "ghostly" edge glow
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    
    // Final Bone/Ghost color scheme
    vec3 boneColor = vec3(0.9, 0.88, 0.82);
    vec3 ghostBlue = vec3(0.7, 0.85, 0.9);
    
    vec3 col = mix(boneColor, ghostBlue, rim);
    col *= diff; // Apply soft shadows
    col += rim * 0.6; // Add edge glow intensity

    gl_FragColor = vec4(col, 1.0);
}