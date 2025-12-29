import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import PlasmaPlane from './components/PlasmaPlane'

const App = () => {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Canvas
                dpr= {[1, 1]}
                flat
                gl={{antialias: false,
                     alpha: false,
                     desynchronized: true,
                     powerPreference: "high-performance",
                     precision: "mediump",
                     toneMapping: 0, 
                     outputColorSpace: 'srgb' }}>
                
                <OrthographicCamera 
                makeDefault 
                position={[0, 0, 1]}
                zoom={1}             
                near={0.1} 
                far={10} 
                />

                {/* Geometry and Shader */}
                <PlasmaPlane/>

            </Canvas>
        </div>
    );
};

export default App;