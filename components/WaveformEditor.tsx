'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';

interface WaveformProps {
    buffer: AudioBuffer;
    colorClass: string;
    trimStart: number;
    trimEnd: number;
    duration: number;
    onTrimChange: (start: number, end: number) => void;
}

export function WaveformEditor({ buffer, colorClass, trimStart, trimEnd, duration, onTrimChange }: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom] = useState(1);
    const [width, setWidth] = useState(0);
    
    // Interaction state
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

    // Track size updates using a ResizeObserver to avoid accessing ref during render
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Set initial width
        setWidth(container.getBoundingClientRect().width);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });

        observer.observe(container);
        return () => {
            observer.disconnect();
        };
    }, []);

    // Compute waveform peaks to save rendering time
    const peaks = useMemo(() => {
        const channelData = buffer.getChannelData(0);
        const step = Math.ceil(channelData.length / 1000);
        const result = [];
        for (let i = 0; i < 1000; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = channelData[i * step + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            result.push([min, max]);
        }
        return result;
    }, [buffer]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || width === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const height = container.clientHeight || 96;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, width, height);
        
        const waveformWidth = width * zoom;

        ctx.lineWidth = 1;
        
        // Extract color from colorClass visually, here we'll map standard Tailwind colors via a lookup or use a generic cyan
        let strokeStyle = '#22d3ee'; // cyan-400
        if (colorClass.includes('purple')) strokeStyle = '#c084fc';
        if (colorClass.includes('amber')) strokeStyle = '#fbbf24';

        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = strokeStyle;

        ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
            const x = (i / peaks.length) * waveformWidth;
            const yMin = (1 - peaks[i][0]) * height / 2;
            const yMax = (1 - peaks[i][1]) * height / 2;
            
            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
        }
        ctx.stroke();

    }, [peaks, zoom, width, colorClass]);

    const handlePointerDown = (e: React.PointerEvent, type: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(type);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const time = (x / rect.width) * duration;

        if (isDragging === 'start') {
            onTrimChange(Math.min(time, trimEnd - 0.1), trimEnd);
        } else {
            onTrimChange(trimStart, Math.max(time, trimStart + 0.1));
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const startPercent = (trimStart / duration) * 100;
    const endPercent = (trimEnd / duration) * 100;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8F8FA3] tracking-widest uppercase">Waveform Trimming</span>
            </div>
            
            <div 
                className="relative h-24 bg-[#11111A]/50 rounded border border-[#2D2D3F] overflow-hidden group touch-none"
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                />
                
                {/* Unselected areas dark overlays */}
                <div 
                    className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                    style={{ width: `${startPercent}%` }}
                />
                <div 
                    className="absolute top-0 bottom-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                    style={{ width: `${100 - endPercent}%` }}
                />

                {/* Handles */}
                <div 
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize hover:bg-white/20 active:bg-white/30 flex items-center justify-center pointer-events-auto group/handle transition-colors z-10"
                    style={{ left: `${startPercent}%` }}
                    onPointerDown={(e) => handlePointerDown(e, 'start')}
                >
                    <div className="w-0.5 h-full bg-white group-hover/handle:w-1 transition-all" />
                    <div className="absolute top-1 bg-[#161622] text-[9px] text-[#E0E0E6] px-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                        {trimStart.toFixed(2)}s
                    </div>
                </div>

                <div 
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize hover:bg-white/20 active:bg-white/30 flex items-center justify-center pointer-events-auto group/handle transition-colors z-10"
                    style={{ left: `${endPercent}%` }}
                    onPointerDown={(e) => handlePointerDown(e, 'end')}
                >
                    <div className="w-0.5 h-full bg-white group-hover/handle:w-1 transition-all" />
                    <div className="absolute top-1 bg-[#161622] text-[9px] text-[#E0E0E6] px-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                        {trimEnd.toFixed(2)}s
                    </div>
                </div>
            </div>
        </div>
    );
}
