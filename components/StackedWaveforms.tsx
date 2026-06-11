'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TrackParams } from '@/lib/types';
import { calculateTrackDuration, getTrackInterval } from '@/lib/audioUtils';
import { Play, Volume2, Sparkles, Music, Waves, Anchor } from 'lucide-react';

interface StackedWaveformsProps {
    tracks: TrackParams[];
    totalDuration: number;
    elapsedTime: number;
    isPlaying: boolean;
}

export function StackedWaveforms({ tracks, totalDuration, elapsedTime, isPlaying }: StackedWaveformsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    // Dynamic resizing observer to match responsive layout
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

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

    // Generate vertical time ruler markings
    const timeMarkers = useMemo(() => {
        if (totalDuration <= 0) return [];
        const markers = [];
        const parts = Math.min(10, Math.ceil(totalDuration));
        const step = totalDuration / parts;
        
        for (let i = 0; i <= parts; i++) {
            markers.push(i * step);
        }
        return markers;
    }, [totalDuration]);

    const activeTrackCount = tracks.length;

    if (activeTrackCount === 0) {
        return (
            <div className="w-full bg-[#0B0B14] rounded-2xl border border-[#1F1F2E] p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col items-center justify-center gap-2 text-xs uppercase tracking-widest text-[#52526B] font-bold">
                    <Sparkles className="w-5 h-5 text-cyan-500/50 mb-1 animate-pulse" />
                    <span>Stacked Synthwave Monitor</span>
                    <p className="normal-case font-normal text-[#8F8FA3] text-[11px] mt-1">Upload tracks below to map them onto the visual sequencer timeline.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#0B0B14] rounded-2xl border border-[#1F1F2E] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col gap-4 overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-[#1F1F2E]/80 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                        Stacked Synthwave Sequencer
                    </h3>
                </div>
                <div className="text-[10px] text-[#8F8FA3] font-mono tracking-wider flex items-center gap-3 bg-[#161622] px-3 py-1 rounded-full border border-[#2D2D3F]">
                    <span>Mix Duration: <strong className="text-white font-bold">{totalDuration.toFixed(1)}s</strong></span>
                    {isPlaying && (
                        <>
                            <div className="w-px h-3 bg-[#2D2D3F]" />
                            <span className="text-cyan-400 font-bold animate-pulse">PLAYING: {elapsedTime.toFixed(1)}s</span>
                        </>
                    )}
                </div>
            </div>

            {/* Main Sequencer Grid Container */}
            <div className="relative flex flex-col gap-2 select-none" ref={containerRef}>
                
                {/* Vertical Time Markers Ruler */}
                <div className="h-6 relative border-b border-[#1F1F2E] w-full flex items-end pb-1.5 overflow-hidden">
                    {/* Left label spacing offset */}
                    <div className="w-24 sm:w-32 flex-shrink-0" />
                    
                    {/* Tick containers */}
                    <div className="flex-1 relative h-full">
                        {timeMarkers.map((time, idx) => {
                            const pct = (time / totalDuration) * 100;
                            if (pct > 100) return null;
                            return (
                                <div 
                                    key={idx} 
                                    className="absolute bottom-0 -ml-4 flex flex-col items-center gap-0.5"
                                    style={{ left: `${pct}%` }}
                                >
                                    <span className="text-[8px] font-mono font-semibold text-[#52526B] tracking-tight">{time.toFixed(1)}s</span>
                                    <div className="w-px h-1.5 bg-[#1F1F2E]" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Grid lanes with tracks */}
                <div className="flex flex-col gap-2 relative">
                    
                    {/* Shared vertical background ticks across all lanes */}
                    <div className="absolute inset-0 pointer-events-none flex" style={{ paddingLeft: '6rem' }}>
                        <div className="w-24 sm:w-32 flex-shrink-0" />
                        <div className="flex-1 relative h-full">
                            {timeMarkers.slice(1, -1).map((time, idx) => {
                                const pct = (time / totalDuration) * 100;
                                return (
                                    <div 
                                        key={idx} 
                                        className="absolute top-0 bottom-0 w-px border-l border-dashed border-[#1F1F2E]/30"
                                        style={{ left: `${pct}%` }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {tracks.map((track) => {
                        return (
                            <TrackLane 
                                key={track.id} 
                                track={track} 
                                totalDuration={totalDuration} 
                            />
                        );
                    })}

                    {/* Glowing vertical playhead cursor */}
                    {isPlaying && (
                        <div className="absolute inset-0 pointer-events-none flex">
                            {/* Static spacing mirroring lane labels */}
                            <div className="w-24 sm:w-32 flex-shrink-0" />
                            
                            {/* Motion area */}
                            <div className="flex-1 relative h-full">
                                <div 
                                    className="absolute top-0 bottom-0 w-px bg-pink-500 shadow-[0_0_10px_#f43f5e,0_0_20px_#f43f5e] z-30 transition-all duration-75 ease-linear"
                                    style={{ left: `${(elapsedTime / totalDuration) * 100}%` }}
                                >
                                    {/* Playhead handle decoration */}
                                    <div className="absolute -top-1.5 -left-1 w-2.5 h-2.5 bg-pink-500 rotate-45 border border-white rounded-sm shadow-md" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Visual key legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#8F8FA3] border-t border-[#1F1F2E]/50 pt-2.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#52526B]">TRACK ROLES:</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-cyan-400" /> Music Base</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-purple-400" /> Atmospheric Ambience</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-400" /> Sounds & SFX Accent</span>
                <span className="flex items-center gap-1.5"><Anchor className="w-3 h-3 text-cyan-400" /> Length Anchor Checkbox</span>
            </div>
        </div>
    );
}

interface TrackLaneProps {
    track: TrackParams;
    totalDuration: number;
}

function TrackLane({ track, totalDuration }: TrackLaneProps) {
    const colorMap = {
        music: { strokeStyle: '#22d3ee', bgGlow: 'bg-[#06b6d4]/10 border-x-[#06b6d4]/50 border-t-[#22d3ee]/60', icon: Music, text: 'text-cyan-400 bg-cyan-950/20' },
        soundscape: { strokeStyle: '#c084fc', bgGlow: 'bg-[#a855f7]/10 border-x-[#a855f7]/50 border-t-[#c084fc]/60', icon: Waves, text: 'text-purple-400 bg-purple-950/20' },
        sfx: { strokeStyle: '#fbbf24', bgGlow: 'bg-[#f59e0b]/10 border-x-[#f59e0b]/50 border-t-[#fbbf24]/60', icon: Sparkles, text: 'text-amber-400 bg-amber-950/20' },
    };

    const typePreset = colorMap[track.type];
    const Icon = typePreset.icon;

    // Calculate active firing slots based on looping/duration settings
    const segments = useMemo(() => {
        const actualDuration = track.trimEnd - track.trimStart;
        if (actualDuration <= 0 || totalDuration <= 0) return [];
        
        const durationWithSpeed = actualDuration / track.speed;
        
        // Cap repetitions count to prevent heavy browser loops
        const repeats = track.isInfiniteLoop ? 80 : track.repeats;
        
        const segmentsList = [];
        let currentStart = track.delay;
        let fadeTime = 0.5;
        if (fadeTime > durationWithSpeed / 3) fadeTime = durationWithSpeed / 3;

        for (let i = 0; i < repeats; i++) {
            if (currentStart >= totalDuration) {
                break;
            }

            const currentEnd = Math.min(currentStart + durationWithSpeed, totalDuration);
            segmentsList.push({
                start: currentStart,
                end: currentEnd,
                duration: currentEnd - currentStart
            });

            // Iterate loop offset deterministically matching the audio engine's randomisation
            const interval = getTrackInterval(track, i);

            if (track.loopTransition === 'crossfade') {
                currentStart += (durationWithSpeed - fadeTime) + interval;
            } else {
                currentStart += durationWithSpeed + interval;
            }
        }
        return segmentsList;
    }, [track, totalDuration]);

    return (
        <div className="flex h-12 w-full bg-[#11111A]/40 border border-[#1F1F2E]/80 rounded-lg overflow-hidden items-center group relative hover:bg-[#161622]/40 transition-colors">
            
            {/* Lane label: details of the track */}
            <div className="w-24 sm:w-32 bg-[#161622] h-full border-r border-[#1F1F2E] flex items-center px-2.5 sm:px-3 text-left overflow-hidden flex-shrink-0 relative z-10 gap-2">
                <div className={`p-1 rounded-md ${typePreset.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-[#E0E0E6] truncate" title={track.name}>
                        {track.name}
                    </span>
                    <span className="text-[8px] text-[#8F8FA3] tracking-wider uppercase flex items-center gap-1">
                        {track.type}
                        {track.isLengthAnchor && (
                            <Anchor className="w-2.5 h-2.5 text-cyan-400 inline-block shrink-0" />
                        )}
                    </span>
                </div>
            </div>

            {/* Synthesizer Synthwave Visual Lane */}
            <div className="flex-1 h-full relative overflow-hidden bg-gradient-to-r from-transparent to-[#12121E]/10 flex items-center">
                {/* Horizontal mesh/grid bar lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(31,31,46,0.1)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-40" />
                
                {/* Active triggering blocks rendering glowing synthwaves */}
                {segments.map((segment, index) => {
                    const durationWithSpeed = (track.trimEnd - track.trimStart) / track.speed;
                    const startPct = (segment.start / totalDuration) * 100;
                    const widthPct = (segment.duration / totalDuration) * 100;
                    
                    if (startPct >= 100 || widthPct <= 0) return null;

                    return (
                        <div 
                            key={index}
                            className={`absolute h-[85%] rounded border border-solid flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity overflow-hidden shadow-lg ${typePreset.bgGlow}`}
                            style={{
                                left: `${startPct}%`,
                                width: `${widthPct}%`
                            }}
                        >
                            {/* Real interactive custom waveform render */}
                            <MiniWaveform 
                                buffer={track.buffer} 
                                trimStart={track.trimStart} 
                                trimEnd={track.trimEnd} 
                                color={typePreset.strokeStyle} 
                            />
                            
                            {/* Visual Fade In overlay */}
                            {track.fadeInDuration !== undefined && track.fadeInDuration > 0 && (
                                <div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-black/75 to-transparent pointer-events-none mix-blend-multiply border-r border-white/5"
                                    style={{ width: `${Math.min(track.fadeInDuration, durationWithSpeed) / durationWithSpeed * 100}%` }}
                                />
                            )}

                            {/* Visual Fade Out overlay */}
                            {track.fadeOutDuration !== undefined && track.fadeOutDuration > 0 && (
                                <div 
                                    className="absolute inset-y-0 right-0 bg-gradient-to-l from-black/75 to-transparent pointer-events-none mix-blend-multiply border-l border-white/5"
                                    style={{ width: `${Math.min(track.fadeOutDuration, durationWithSpeed) / durationWithSpeed * 100}%` }}
                                />
                            )}

                            {/* Inner synthwave backdrop lines */}
                            <div className="absolute inset-0 bg-[#000]/10 mix-blend-overlay pointer-events-none" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface MiniWaveformProps {
    buffer: AudioBuffer;
    trimStart: number;
    trimEnd: number;
    color: string;
}

function MiniWaveform({ buffer, trimStart, trimEnd, color }: MiniWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Compute peaks exclusively for the active trim section of the track
    const peaks = useMemo(() => {
        if (!buffer) return [];
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const startSample = Math.floor(trimStart * sampleRate);
        const endSample = Math.min(Math.floor(trimEnd * sampleRate), channelData.length);
        const trimmedLength = endSample - startSample;
        
        if (trimmedLength <= 0) return [];
        
        const numPoints = 80; // Optimized sample count for grid-lane performance
        const step = Math.ceil(trimmedLength / numPoints);
        const result = [];
        
        for (let i = 0; i < numPoints; i++) {
            let min = 1.0;
            let max = -1.0;
            const chunkStart = startSample + i * step;
            if (chunkStart >= endSample) break;
            
            for (let j = 0; j < step; j++) {
                const idx = chunkStart + j;
                if (idx >= endSample) break;
                const datum = channelData[idx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            if (min === 1.0 && max === -1.0) {
                min = 0;
                max = 0;
            }
            result.push([min, max]);
        }
        return result;
    }, [buffer, trimStart, trimEnd]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || peaks.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = color;
        
        // Draw subtle peak shadows to maximize look and feel
        ctx.shadowBlur = 3;
        ctx.shadowColor = color;
        
        const midY = height / 2;
        
        ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
            const x = (i / peaks.length) * width;
            const yMin = midY + (peaks[i][0] * (midY * 0.8));
            const yMax = midY + (peaks[i][1] * (midY * 0.8));
            
            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
        }
        ctx.stroke();
    }, [peaks, color]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full opacity-70 cursor-default pointer-events-none select-none"
        />
    );
}
