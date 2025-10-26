import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {generateSierpinskiTetrahedra} from './tetrahedronUtils.js';

// --- Configuration Constants ---
const SUBDIVISIONS = 8; // Max depth of the fractal
const INITIAL_SCALE = 30; // Starting size of the largest tetrahedron

const App = () => {
    const mountRef = useRef(null);
    const isSetupRef = useRef(false);
    const tetrahedronRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount || isSetupRef.current) return;

        isSetupRef.current = true;
        
        // --- Three.js Init ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            60, 
            currentMount.clientWidth / currentMount.clientHeight, 
            0.1, 
            2000 
        );
        camera.position.set(0, INITIAL_SCALE * 1.85, INITIAL_SCALE * 1.85);
        camera.lookAt(0, 0, 0);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.target.set(0, 0, 0);

        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- Add Sierpinski Tetrahedron ---
        const tetrahedronMesh = generateSierpinskiTetrahedra(SUBDIVISIONS, INITIAL_SCALE);
        tetrahedronMesh.rotation.x = Math.PI / 4;
        tetrahedronMesh.rotation.y = Math.PI / 4;
        scene.add(tetrahedronMesh);
        tetrahedronRef.current = tetrahedronMesh;

        // --- Animation Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // --- Cleanup ---
        return () => {
            isSetupRef.current = false;
            window.removeEventListener('resize', handleResize);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
            controls.dispose();
            scene.traverse(object => {
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