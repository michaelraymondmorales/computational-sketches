import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import UniversalMushroom from './components/UniversalMushroom'

const App = () => {

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Canvas
                dpr= {[1, 1]}
                flat
                gl={{antialias: true,
                     alpha: false,
                     desynchronized: true,
                     powerPreference: "high-performance",
                     precision: "mediump",
                     toneMapping: 0, 
                     outputColorSpace: 'srgb' }}>

                {/* User Controls */}
                <OrbitControls 
                    dampingFactor={0.25} 
                    minDistance={0.1} 
                    maxDistance={15} 
                />

                <UniversalMushroom/>

            </Canvas>
        </div>
    );
};

export default App;