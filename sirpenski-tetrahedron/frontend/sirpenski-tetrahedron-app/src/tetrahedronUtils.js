import * as THREE from 'three';

// --- Shader Code ---
// Vertex shader for the instanced tetrahedron
const tetrahedronVertexShader = `
    uniform float subdivisionsCount;
    uniform vec3 lightDirection;
    attribute float instanceSubdivisionLevel;
    attribute float instanceScale; // This is the target scale, used to normalize the position
    varying float vDiffuse;
    varying vec3 vColor;

    // --- GLSL Pseudo-Random Function ---
    // Generates a stable pseudo-random number between 0.0 and 1.0 based on input vector
    float rand(vec3 co) {
        return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }

    // --- Smooth Analogous Mapping  ---
    vec3 mapRandomToSmooth(float randomValue) {
        // Define three gold colors for the gradient
        vec3 colorA = vec3(0.95, 0.79, 0.27); // Crayola's Maize (#F2CA46)
        vec3 colorB = vec3(0.83, 0.69, 0.22); // American Gold (#D3AF37)
        vec3 colorC = vec3(0.77, 0.62, 0.16); // Satin Sheen Gold (#C49D29)

        // Use the random value to decide which two colors to mix:
        if (randomValue < 0.5) {
            // Mix between A and B
            // randomValue * 2.0 scales the 0.0-0.5 range to 0.0-1.0 for the mix factor
            return mix(colorA, colorB, randomValue * 2.0);
        } else {
            // Mix between B and C
            // (randomValue - 0.5) * 2.0 scales the 0.5-1.0 range to 0.0-1.0 for the mix factor
            return mix(colorB, colorC, (randomValue - 0.5) * 2.0);
        }
    }

    void main() {

        // Color Assignment (Randomized)
        // Use the instance's world position (stored in the 4th column of instanceMatrix)
        vec3 instancePosition = instanceMatrix[3].xyz;
        float randomVal = rand(instancePosition);
        vColor = mapRandomToSmooth(randomVal);

        // Transform normal for lighting
        vec3 localNormal = normalize(mat3(instanceMatrix) * normal);
        
        // Calculate diffuse lighting
        vDiffuse = max(dot(localNormal, lightDirection), 0.0);
        
        // The 'position' must be scaled by the TARGET instanceScale first (to match the size defined 
        // in the generate function) and then scaled by the animated factor.
        vec3 finalPosition = position * instanceScale;
        vec4 transformedPosition = vec4(finalPosition, 1.0);
        vec4 mvPosition = modelViewMatrix * instanceMatrix * transformedPosition;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader for the instanced tetrahedron
const tetrahedronFragmentShader = `
    varying vec3 vColor;
    varying float vDiffuse;
    
    void main() {
        // Apply color with diffuse + ambient light component
        gl_FragColor = vec4(vColor * (vDiffuse * 0.75 + 0.75), 1.0);
    }
`;

// Generates a Sierpinski tetrahedron using InstancedMesh
export const generateSierpinskiTetrahedra = (subdivisions, scale) => {
    // Use a unit tetrahedron geometry
    const count = Math.pow(4, subdivisions);
    const baseGeometry = new THREE.TetrahedronGeometry(1);
    const instancedMesh = new THREE.InstancedMesh(baseGeometry, null, count);

    // Pre-allocate the queue and use a head index for performance
    const queue = new Array(count);
    let head = 0;
    let tail = 0;

    queue[tail++] = {
        position: new THREE.Vector3(),
        level: 0,
        currentScale: scale
    };
    
    const finalInstances = [];
    const subVertices = [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, 1, -1)
    ];
    const newPos = new THREE.Vector3();

    while(head < tail) {
        const current = queue[head++];
        
        if (current.level === subdivisions) {
            finalInstances.push(current);
        } else {
            const nextScale = current.currentScale / 2;
            for (const v of subVertices) {
                newPos.copy(v).multiplyScalar(nextScale).add(current.position);
                queue[tail++] = {
                    position: newPos.clone(),
                    level: current.level + 1,
                    currentScale: nextScale
                };
            }
        }
    }
    
    const instanceLevels = new Float32Array(finalInstances.length);
    const instanceScales = new Float32Array(finalInstances.length);
    const dummyObject = new THREE.Object3D();

    finalInstances.forEach((instance, i) => {
        instanceLevels[i] = instance.level;
        instanceScales[i] = instance.currentScale;
        dummyObject.position.copy(instance.position);
        dummyObject.scale.setScalar(1.0);
        dummyObject.rotation.set(0, 0, 0);
        dummyObject.updateMatrix();
        instancedMesh.setMatrixAt(i, dummyObject.matrix);
    });

    // Add the subdivision level and scale as custom attributes
    instancedMesh.geometry.setAttribute('instanceSubdivisionLevel', new THREE.InstancedBufferAttribute(instanceLevels, 1));
    instancedMesh.geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(instanceScales, 1));
    
    const tetrahedronMaterial = new THREE.ShaderMaterial({
        uniforms: {
            growthProgress: { value: 0.0 },
            baseColor: { value: new THREE.Color(0xffffff) },
            lightDirection: { value: new THREE.Vector3(0.0, 1.0, 0.0).normalize() },
            subdivisionsCount: { value: subdivisions }
        },
        vertexShader: tetrahedronVertexShader,
        fragmentShader: tetrahedronFragmentShader,
        transparent: false,
        wireframe: false,
    });

    instancedMesh.material = tetrahedronMaterial;
    
    return instancedMesh;
};