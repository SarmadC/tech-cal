'use client';

import React, { useRef } from 'react';
import { useThreeScene } from './useChaosThree';

interface ChaosCanvasProps {
    scrollProgressRef: React.MutableRefObject<number>;
    className?: string;
}

const ChaosCanvas: React.FC<ChaosCanvasProps> = ({ scrollProgressRef, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useThreeScene(canvasRef, scrollProgressRef);

    return <canvas ref={canvasRef} className={className} />;
};

export default ChaosCanvas;
