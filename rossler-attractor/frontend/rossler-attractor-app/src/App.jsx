import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Configuration Constants ---
const DT = 0.01;                      // Time step for Runge-Kutta integration
const RENDER_WINDOW = 1234;            // Number of points visible in the trail
const MAX_POINTS = RENDER_WINDOW * 5; // Number of points before buffer recycle
const ATTRACTOR_COUNT = 7;            // Easily change the number of attractors here
const SCALE_FACTOR = 10;              // Visualization scale
const PRE_SEED_STEPS = 5000;          // Warm up simulation before rendering

// Rössler base parameters (midpoints)
const ROSSLER_PARAMS = {
    midpointA: 0.2,
    midpointB: 0.2,
    midpointC: 5.7,
};

// --- Sine Wave Properties  ---
const ACTIVE_WAVE_PROPS = {
    a: { freq: 0.002, amp: 0.05, phase: 0 },
    b: { freq: 0.005, amp: 0.05, phase: 1.5 },
    c: { freq: 0.007, amp: 3.0, phase: 3 }
};

// --- Attractor Configuration Array ---
/**
 * Initial configuration array for the Rössler Attractors.
 *
 * Each object within the array defines the initial state, visual modifiers, 
 * and placeholder fields for the THREE.js objects that will be generated
 * during the component lifecycle.
 *
 * @type {Array<{
 * x: number, 
 * y: number, 
 * z: number, 
 * colorOffset: number,
 * vizScaleModifier: number,
 * geometry: THREE.BufferGeometry | null,
 * positions: Float32Array | null,
 * colors: Float32Array | null,
 * line: THREE.Line | null
 * }>}
 */
const initialAttractors = Array.from({ length: ATTRACTOR_COUNT }, (_, i) => ({
    // Initial State (x1, y1, z1 -> x, y, z)
    x: 0.1 * (i + 1), // Separating initial conditions
    y: 0.0,
    z: 0.0,
    // Unique Color Cycle (Different hue offsets for each line)
    colorOffset: i / ATTRACTOR_COUNT,
    // Scaling Factor (Visual separation)
    vizScaleModifier: (i + 1) / ATTRACTOR_COUNT,
    // THREE.js objects will be added later
    geometry: null,
    positions: null,
    colors: null,
    line: null,
}));

// --- Rössler System (dx/dt, dy/dt, dz/dt) using RK4 ---
/**
 * Computes the next state of the Rössler attractor using 4th-order Runge-Kutta integration.
 * @param {number} dt - Time step delta.
 * @param {number} currentX - Current X coordinate.
 * @param {number} currentY - Current Y coordinate.
 * @param {number} currentZ - Current Z coordinate.
 * @param {number} pA - Rössler parameter 'a'.
 * @param {number} pB - Rössler parameter 'b'.
 * @param {number} pC - Rössler parameter 'c'.
 * @returns {number[]} The next [x, y, z] state array.
 */
const rk4 = (dt, currentX, currentY, currentZ, pA, pB, pC) => {
    // Defines the Rössler Attractor system of differential equations
    const f = (x, y, z) => [
        -y - z,            // dx/dt
        x + pA * y,        // dy/dt
        pB + z * (x - pC)  // dz/dt
    ];

    const [x, y, z] = [currentX, currentY, currentZ];

    // --- 1. Calculate the four Runge-Kutta intermediate slopes (k1, k2, k3, k4) ---

    // k1: Slope at the start point
    const k1 = f(x, y, z); 
    
    // k2: Slope at the midpoint, using k1 for the estimate
    const k2 = f(x + k1[0] * dt * 0.5, y + k1[1] * dt * 0.5, z + k1[2] * dt * 0.5);
    
    // k3: Slope at the midpoint, using k2 for the improved estimate
    const k3 = f(x + k2[0] * dt * 0.5, y + k2[1] * dt * 0.5, z + k2[2] * dt * 0.5);
    
    // k4: Slope at the end point, using k3 for the estimate
    const k4 = f(x + k3[0] * dt, y + k3[1] * dt, z + k3[2] * dt);

    // --- 2. Calculate the next point using the weighted average of the four slopes (1:2:2:1 ratio) ---
    
    const nextX = x + (dt / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    const nextY = y + (dt / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    const nextZ = z + (dt / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    
    return [nextX, nextY, nextZ];
};

// --- Pre-Seed Simulation Function  ---
/**
 * Runs the simulation for a fixed number of steps using static parameters 
 * to ensure the attractor starts in the chaotic basin.
 * @param {Array<Object>} attractors - Array of attractor state objects to update.
 * @param {number} steps - Number of RK4 iterations to perform.
 */
const preSeedSimulation = (attractors, steps) => {
    // Use static midpoint parameters for the pre-seed phase
    const { midpointA, midpointB, midpointC } = ROSSLER_PARAMS;

    for (let i = 0; i < steps; i++) {
        attractors.forEach(attractor => {
            const [nextX, nextY, nextZ] = rk4(
                DT, 
                attractor.x, 
                attractor.y, 
                attractor.z, 
                midpointA, 
                midpointB, 
                midpointC
            );
            // Update the state of the attractor object
            attractor.x = nextX; 
            attractor.y = nextY; 
            attractor.z = nextZ;
        });
    }
};

const App = () => {
    const mountRef = useRef(null);
    const isSetupRef = useRef(false);
    const sceneRef = useRef(new THREE.Scene());
    const startTimeRef = useRef(performance.now());
    const lineHeadRef = useRef(0);
    const lineTailRef = useRef(0);
    const attractorsRef = useRef(initialAttractors);

    useEffect(() => {
    // --- Scene Setup Guard ---
    const currentMount = mountRef.current;
    if (!currentMount || isSetupRef.current) {
        return;
    }

    isSetupRef.current = true; // Set flag on first run for vite strict mode.
    
    // --- Pre-seed the Simulation ---
    preSeedSimulation(attractorsRef.current, PRE_SEED_STEPS);

    // --- Three.js Init ---
    const scene = sceneRef.current;
    scene.rotation.x = -Math.PI / 2; // Rotate -90 degrees around the X-axis

    const camera = new THREE.PerspectiveCamera(
        75, 
        currentMount.clientWidth / currentMount.clientHeight, // Aspect ratio
        0.1, 
        4444 
    );
    camera.position.set(-130, 120, 130);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;
    controls.target.set(10, 30, -20)

    const handleResize = () => {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Line Geometry Setup  ---
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
    });
    
    // Iterate over the ref's current value to set up geometries
    attractorsRef.current.forEach((attractor) => {
        attractor.positions = new Float32Array(MAX_POINTS * 3);
        attractor.colors = new Float32Array(MAX_POINTS * 3);
        attractor.geometry = new THREE.BufferGeometry();
        attractor.geometry.setAttribute('position', new THREE.BufferAttribute(attractor.positions, 3));
        attractor.geometry.setAttribute('color', new THREE.BufferAttribute(attractor.colors, 3));
        attractor.geometry.setDrawRange(0, 0);
        attractor.line = new THREE.Line(attractor.geometry, material);
        scene.add(attractor.line);
    });

        // --- Simulation and Rendering Loop ---
    const animate = () => {
        requestAnimationFrame(animate);

        const startTime = startTimeRef.current;
        const time = (performance.now() - startTime) / 1000;
        let lineHead = lineHeadRef.current; 
        let lineTail = lineTailRef.current;
        const writeIndex = lineHead * 3; 

        // 1. Dynamic Parameter Update (Destructuring and clear calculations)
        const { midpointA, midpointB, midpointC } = ROSSLER_PARAMS;
        const A = midpointA + ACTIVE_WAVE_PROPS.a.amp * Math.sin(time * ACTIVE_WAVE_PROPS.a.freq + ACTIVE_WAVE_PROPS.a.phase);
        const B = midpointB + ACTIVE_WAVE_PROPS.b.amp * Math.sin(time * ACTIVE_WAVE_PROPS.b.freq + ACTIVE_WAVE_PROPS.b.phase);
        const C = midpointC + ACTIVE_WAVE_PROPS.c.amp * Math.sin(time * ACTIVE_WAVE_PROPS.c.freq + ACTIVE_WAVE_PROPS.c.phase);
        
        // 2. Iterate and Update ALL Attractors
        attractorsRef.current.forEach((attractor, i) => {
            // Calculate next point (Simulation Step)
            const [nextX, nextY, nextZ] = rk4(DT, attractor.x, attractor.y, attractor.z, A, B, C);
            attractor.x = nextX; 
            attractor.y = nextY; 
            attractor.z = nextZ;

            // Scale and center the coordinates (using the unique modifier)
            const vizX = attractor.x * SCALE_FACTOR * attractor.vizScaleModifier;
            const vizY = attractor.y * SCALE_FACTOR * attractor.vizScaleModifier;
            const vizZ = attractor.z * SCALE_FACTOR * attractor.vizScaleModifier;
            
            // Update Buffer Geometry: Position
            attractor.positions[writeIndex] = vizX;
            attractor.positions[writeIndex + 1] = vizY;
            attractor.positions[writeIndex + 2] = vizZ;
            attractor.geometry.attributes.position.needsUpdate = true;

            // Update Buffer Geometry: Color
            // Variance: Add (i * 0.01) to the base speed for each attractor.
            const speedVariance = 0.1 + (i * 0.01);
            const timeWave = 0.5 + 0.5 * Math.sin(time * speedVariance);
            const colorHue = (timeWave + attractor.colorOffset) % 1;
            const color = new THREE.Color().setHSL(colorHue, 1.0, 0.5);
            attractor.colors[writeIndex] = color.r;
            attractor.colors[writeIndex + 1] = color.g;
            attractor.colors[writeIndex + 2] = color.b;
            attractor.geometry.attributes.color.needsUpdate = true;
        });

        // 3. Update Draw Range and Line Head/Tail Pointers
        if (lineHead < RENDER_WINDOW) {
            lineHead++;
        } else if (lineHead < MAX_POINTS) {
            lineHead++;
            lineTail++;
        } else if (lineTail < MAX_POINTS) {
            lineTail++;
        } else {
            lineHead = 0;
            lineTail = 0;
        }

        // Apply draw range update to all geometries
        if (lineHead !== lineTail) {
            attractorsRef.current.forEach(attractor => {
                attractor.geometry.setDrawRange(lineTail, lineHead - lineTail);
            });
        }
        
        controls.update(); // Keep controls smooth
        renderer.render(scene, camera);

        lineHeadRef.current = lineHead;
        lineTailRef.current = lineTail;
    }
    animate();

    // --- Cleanup Function ---
    return () => {
        isSetupRef.current = false;
        if (currentMount && renderer.domElement) {
            currentMount.removeChild(renderer.domElement);
        }
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        controls.dispose();

        // Scene cleanup using the attractors array
        attractorsRef.current.forEach(attractor => {
            if (attractor.geometry) attractor.geometry.dispose();
            if (attractor.line) scene.remove(attractor.line);
        });
        
        // Final fallback cleanup for any other scene objects
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
    };
    }, []);

    return (
        <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        </div>
    );    
};

export default App;