'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TrackType, TrackParams } from '@/lib/types';
import { decodeAudioFile, setupPlayback, calculateTotalDuration, exportWav } from '@/lib/audioUtils';
import { TrackItem } from '@/components/TrackItem';
import { StackedWaveforms } from '@/components/StackedWaveforms';
import { Play, Square, Download, UploadCloud, Loader2 } from 'lucide-react';

export default function MixerEditor() {
    const [tracks, setTracks] = useState<TrackParams[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDecoding, setIsDecoding] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [playStartTimeMs, setPlayStartTimeMs] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const totalDuration = calculateTotalDuration(tracks);

    // Core high-accuracy ticker for vertical playhead synchronization
    useEffect(() => {
        if (!isPlaying || playStartTimeMs === null) {
            return;
        }

        let animFrameId: number;
        const totalDur = calculateTotalDuration(tracks);
        const hasReverb = tracks.some(t => t.reverb > 0);
        const maxLimit = totalDur + (hasReverb ? 3 : 0);

        const tick = () => {
            const elapsed = (Date.now() - playStartTimeMs) / 1000;
            setElapsedTime(Math.min(elapsed, maxLimit));
            if (elapsed < maxLimit) {
                animFrameId = requestAnimationFrame(tick);
            } else {
                setElapsedTime(0);
            }
        };

        animFrameId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(animFrameId);
        };
    }, [isPlaying, playStartTimeMs, tracks]);
    
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleStop = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        sourceNodesRef.current.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        sourceNodesRef.current = [];
        setIsPlaying(false);
        setPlayStartTimeMs(null);
        setElapsedTime(0);
    };

    // Stop playback if unmounted
    useEffect(() => {
        return () => handleStop();
    }, []);

    const initAudioCtx = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: TrackType) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setIsDecoding(true);
        try {
            const ctx = initAudioCtx();
            
            // Process files
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const buffer = await decodeAudioFile(file, ctx);
                
                const newTrack: TrackParams = {
                    id: Math.random().toString(36).substring(7),
                    type,
                    file,
                    name: file.name,
                    buffer,
                    volume: type === 'sfx' ? 0.6 : 0.8,
                    speed: 1.0,
                    delay: 0,
                    repeats: 1,
                    isInfiniteLoop: false,
                    loopTransition: 'none',
                    loopInterval: 0,
                    loopIntervalMin: 0,
                    randomizeInterval: false,
                    reverb: 0.0,
                    trimStart: 0,
                    trimEnd: buffer.duration,
                    fadeInDuration: 0,
                    fadeOutDuration: 0,
                    duration: buffer.duration,
                    isLengthAnchor: false
                };

                setTracks(prev => {
                    // Replace if music or soundscape
                    if (type === 'music' || type === 'soundscape') {
                        return [...prev.filter(t => t.type !== type), newTrack];
                    }
                    return [...prev, newTrack];
                });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to decode audio file. Make sure it's a valid MP3 or WAV.");
        } finally {
            setIsDecoding(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleUpdateTrack = (id: string, updates: Partial<TrackParams>) => {
        setTracks(prev => {
            const settingAnchor = updates.isLengthAnchor === true;
            return prev.map(t => {
                if (t.id === id) {
                    return { ...t, ...updates };
                } else if (settingAnchor) {
                    return { ...t, isLengthAnchor: false };
                }
                return t;
            });
        });
    };

    const handleDeleteTrack = (id: string) => {
        setTracks(prev => prev.filter(t => t.id !== id));
        if (tracks.length === 1) {
            handleStop(); // Stop if we deleted the last track
        }
    };

    const handlePlay = async () => {
        if (tracks.length === 0) return;
        const ctx = initAudioCtx();
        
        handleStop(); // clear existing
        setIsPlaying(true);
        setPlayStartTimeMs(Date.now());
        
        try {
            const nodes = await setupPlayback(ctx, tracks, ctx.currentTime);
            sourceNodesRef.current = nodes;
            
            const rawDuration = calculateTotalDuration(tracks);
            const hasReverb = tracks.some(t => t.reverb > 0);
            const duration = rawDuration + (hasReverb ? 3 : 0);
            
            timeoutRef.current = setTimeout(() => {
                setIsPlaying(false);
                setPlayStartTimeMs(null);
                setElapsedTime(0);
            }, duration * 1000);
            
        } catch (err) {
            console.error("Playback error:", err);
            setIsPlaying(false);
            setPlayStartTimeMs(null);
            setElapsedTime(0);
        }
    };

    const handleExport = async () => {
        if (tracks.length === 0) return;
        setIsExporting(true);
        handleStop();
        
        try {
            const rawDuration = calculateTotalDuration(tracks);
            const hasReverb = tracks.some(t => t.reverb > 0);
            const duration = Math.max(rawDuration + (hasReverb ? 3 : 0), 0.1);
            
            const sampleRate = tracks[0].buffer.sampleRate || 44100;
            const offlineCtx = new window.OfflineAudioContext(2, sampleRate * duration, sampleRate);
            
            await setupPlayback(offlineCtx, tracks, 0);
            
            const renderedBuffer = await offlineCtx.startRendering();
            const blob = exportWav(renderedBuffer);
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "mixed-audio.wav";
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            
        } catch (err) {
            console.error("Export error", err);
            alert("Failed to export audio.");
        } finally {
            setIsExporting(false);
        }
    };

    const hasReverbOverall = tracks.some(t => t.reverb > 0);
    const estimatedFinalDuration = tracks.length > 0 ? (totalDuration + (hasReverbOverall ? 3 : 0)).toFixed(1) : "0.0";

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
            {/* Master Controls Header */}
            <div className="bg-[#0B0B14] p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1F1F2E] flex flex-col sm:flex-row items-center justify-between gap-6 sticky top-4 z-10 backdrop-blur-xl">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    {isPlaying ? (
                        <button onClick={handleStop} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#161622] text-[#E0E0E6] border border-[#2D2D3F] px-6 py-3 rounded-xl font-bold hover:bg-[#252538] transition-colors text-xs tracking-wider uppercase">
                            <Square fill="currentColor" className="w-4 h-4 text-rose-500" /> Stop
                        </button>
                    ) : (
                        <button onClick={handlePlay} disabled={tracks.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] px-6 py-3 rounded-xl font-bold hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none text-xs tracking-wider uppercase">
                            <Play fill="currentColor" className="w-4 h-4" /> Play Preview
                        </button>
                    )}
                    
                    <button onClick={handleExport} disabled={tracks.length === 0 || isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none text-xs tracking-wider uppercase">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isExporting ? 'Exporting...' : 'Export Mix (.WAV)'}
                    </button>
                </div>

                <div className="flex items-center gap-6 text-sm bg-[#161622] px-4 py-2.5 rounded-lg border border-[#2D2D3F] hidden sm:flex">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-[#52526B] font-bold">Layers</span>
                        <span className="font-semibold text-white">{tracks.length}</span>
                    </div>
                    <div className="w-px h-8 bg-[#2D2D3F]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-[#52526B] font-bold">Est. Length</span>
                        <span className="font-semibold text-white">{estimatedFinalDuration}s</span>
                    </div>
                </div>
            </div>

            {/* Cumulative lanes visualizing stacked synthwaves alignment */}
            <StackedWaveforms 
                tracks={tracks} 
                totalDuration={totalDuration} 
                elapsedTime={elapsedTime} 
                isPlaying={isPlaying} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload Section */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-white tracking-widest uppercase px-1">Add Layers</h2>
                    
                    <UploadZone 
                        title="Base Music" 
                        description="Upload your primary musical track (Replaces existing)"
                        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav,audio/wave"
                        id="upload-music"
                        isDecoding={isDecoding}
                        onChange={(e) => handleFileUpload(e, 'music')}
                        color="rose"
                    />
                    <UploadZone 
                        title="Soundscape" 
                        description="Background atmosphere like rain or city noise"
                        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav,audio/wave"
                        id="upload-soundscape"
                        isDecoding={isDecoding}
                        onChange={(e) => handleFileUpload(e, 'soundscape')}
                        color="blue"
                    />
                    <UploadZone 
                        title="Ambient SFX" 
                        description="Add multiple discrete sound effects"
                        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav,audio/wave"
                        id="upload-sfx"
                        multiple
                        isDecoding={isDecoding}
                        onChange={(e) => handleFileUpload(e, 'sfx')}
                        color="amber"
                    />
                </div>

                {/* List Section */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold text-white tracking-widest uppercase">Composition Timeline</h2>
                        {tracks.length > 0 && <span className="text-sm text-[#8F8FA3] sm:hidden">{estimatedFinalDuration}s total</span>}
                    </div>
                    {tracks.length === 0 ? (
                        <div className="bg-[#11111A]/50 border-2 border-dashed border-[#2D2D3F] rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3 text-[#52526B] h-full min-h-[300px]">
                            <Layers className="w-10 h-10 mb-2 opacity-50" />
                            <p className="font-bold text-[#8F8FA3] text-xs uppercase tracking-widest">No tracks added yet</p>
                            <p className="max-w-xs text-[11px] text-[#8F8FA3]">Upload a music track, soundscape, or some SFX to get started building your mix.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {tracks.map(track => (
                                <TrackItem 
                                    key={track.id} 
                                    track={track} 
                                    onUpdate={handleUpdateTrack} 
                                    onDelete={handleDeleteTrack} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UploadZone({ title, description, accept, id, multiple = false, isDecoding, onChange, color }: { title: string, description: string, accept: string, id: string, multiple?: boolean, isDecoding: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, color: 'rose' | 'blue' | 'amber' }) {
    
    const colorClasses = {
        rose: 'hover:border-cyan-500 hover:bg-cyan-900/10 text-[#8F8FA3] hover:text-cyan-400 border-[#2D2D3F]',
        blue: 'hover:border-purple-500 hover:bg-purple-900/10 text-[#8F8FA3] hover:text-purple-400 border-[#2D2D3F]',
        amber: 'hover:border-amber-500 hover:bg-amber-900/10 text-[#8F8FA3] hover:text-amber-400 border-[#2D2D3F]',
    };

    return (
        <label htmlFor={id} className={`flex flex-col gap-2 p-5 bg-[#0B0B14] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group relative ${colorClasses[color]}`}>
            {isDecoding && (
                <div className="absolute inset-0 bg-[#0B0B14]/80 rounded-xl flex items-center justify-center backdrop-blur-sm z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
            )}
            <input 
                type="file" 
                id={id} 
                className="hidden" 
                accept={accept} 
                multiple={multiple} 
                onChange={onChange} 
                disabled={isDecoding}
            />
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-[#161622] rounded-lg group-hover:bg-[#252538] border border-transparent group-hover:border-[#2D2D3F] transition-colors">
                    <UploadCloud className="w-5 h-5 currentColor" />
                </div>
                <span className="font-bold text-white tracking-tight uppercase text-xs">{title}</span>
            </div>
            <p className="text-[11px] text-[#8F8FA3] opacity-80">{description}</p>
        </label>
    );
}

// Ensure Layers icon is imported
import { Layers } from 'lucide-react';
