#define MAX_STEPS 100
#define MAX_DIST 20.0
#define SURF_DIST 0.001
uniform float uCapWidth;
uniform float uCapHeight;
uniform float uStemRadius;
uniform float uStemHeight;
uniform float uGillCurvature;
uniform float uBoxHeight;
uniform vec3 uWorldBlockPos;
varying vec3 vWorldPos;
varying vec3 vCamPos;

// Simple Smooth Minimum for organic blending
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * (1.0 / 4.0);
}

float mushroomSDF(vec3 p, float capWidth, float capHeight, float stemRadius, float stemHeight, float gillCurvature) {
    vec3 pCentered = p - uWorldBlockPos + vec3(0.0, uBoxHeight * 0.5, 0.0);
    // 1. THE STEM
    // A simple vertical capsule/cylinder logic
    vec3 stemP = pCentered;
    float dStem = length(stemP.xz) - stemRadius; // Distance to cylinder 
    dStem = max(dStem, abs(stemP.y - stemHeight * 0.5) - stemHeight * 0.5);

    // 2. THE CAP
    // A modified ellipsoid logic for the cap
    vec3 capP = pCentered - vec3(0.0, stemHeight, 0.0); // Move cap to top of stem
    // Squashing the sphere into a cap shape
    float dCap = length(capP / vec3(capWidth, capHeight, capWidth)) - 1.0;
    dCap *= min(capWidth, capHeight); // Correction factor for non-uniform scaling

    // 3. THE GILLS (Detailing the underside)
    // Only apply gills if under the cap and near the center
    float angle = atan(capP.z, capP.x);
    float gills = sin(angle * 40.0) * 0.02 * gillCurvature;
    if (capP.y < 0.0) {
        dCap += gills;
    }

    // 4. THE UNION
    // k = 0.2 provides a nice organic "merge" between stem and cap
    return smin(dCap, dStem, 0.2);
}

float rayMarch(vec3 ro, vec3 rd, float capW, float capH, float stemR, float stemH, float gillC) {
    float dO = 0.0; // Distance from Origin
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO; // Current position of the ray tip
        float dS = mushroomSDF(p, capW, capH, stemR, stemH, gillC); // How far is the closest surface?
        dO += dS; // "Step" forward by that distance
        
        // If we hit something or go too far, break
        if(dO > MAX_DIST || abs(dS) < SURF_DIST) break;
    }
    
    return dO;
}

vec3 getNormal(vec3 p, float capW, float capH, float stemR, float stemH, float gillC) {
    // A tiny offset to check the neighborhood
    vec2 e = vec2(0.01, 0.0);
    
    // Sample the SDF in all three directions
    float d = mushroomSDF(p, capW, capH, stemR, stemH, gillC);
    vec3 n = d - vec3(
        mushroomSDF(p - e.xyy, capW, capH, stemR, stemH, gillC),
        mushroomSDF(p - e.yxy, capW, capH, stemR, stemH, gillC),
        mushroomSDF(p - e.yyx, capW, capH, stemR, stemH, gillC)
    );
    
    return normalize(n);
}

void main() {
    // Setup the Ray
    vec3 ro = vCamPos;
    vec3 rd = normalize(vWorldPos - vCamPos);

    // March the Ray
    float d = rayMarch(ro, rd, uCapWidth, uCapHeight, uStemRadius, uStemHeight, uGillCurvature);

    if(d > MAX_DIST) discard;

    // Calculate Lighting at the Hit Point
    vec3 p = ro + rd * d;
    vec3 n = getNormal(p, uCapWidth, uCapHeight, uStemRadius, uStemHeight, uGillCurvature);
    
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