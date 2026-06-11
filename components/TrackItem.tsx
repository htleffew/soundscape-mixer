'use client';

import React from 'react';
import { TrackParams, LoopTransition } from '@/lib/types';
import { Trash2, Music, Waves, Sparkles } from 'lucide-react';
import { WaveformEditor } from './WaveformEditor';

interface TrackItemProps {
    track: TrackParams;
    onUpdate: (id: string, updates: Partial<TrackParams>) => void;
    onDelete: (id: string) => void;
}

export function TrackItem({ track, onUpdate, onDelete }: TrackItemProps) {
    const handleSlider = (field: keyof TrackParams, value: number | boolean | string) => {
        onUpdate(track.id, { [field]: value });
    };

    const handleTrimChange = (start: number, end: number) => {
        onUpdate(track.id, { trimStart: start, trimEnd: end });
    };

    const typeConfig = {
        music: { icon: Music, color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-l-cyan-500', accent: 'accent-cyan-500' },
        soundscape: { icon: Waves, color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-l-purple-500', accent: 'accent-purple-500' },
        sfx: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-l-amber-500', accent: 'accent-amber-500' },
    };

    const Icon = typeConfig[track.type].icon;
    const accentClass = typeConfig[track.type].accent;

    return (
        <div className={`flex flex-col gap-4 p-5 bg-[#161622] border-y border-r border-[#1F1F2E] border-l-2 ${typeConfig[track.type].border} rounded-r-lg rounded-l-sm relative group overflow-hidden`}>
            {/* Background subtle gradient hint */}
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full ${track.type === 'music' ? 'bg-cyan-500' : track.type === 'soundscape' ? 'bg-purple-500' : 'bg-amber-500'}`} />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig[track.type].bg}`}>
                        <Icon className={`w-5 h-5 ${typeConfig[track.type].color}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#E0E0E6] truncate max-w-[150px] sm:max-w-xs">{track.name}</h3>
                        <p className="text-[9px] text-[#8F8FA3] uppercase tracking-widest">{track.type} • {track.duration.toFixed(1)}s</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    {/* Anchor mix total length to this specific layer */}
                    <label className={`flex items-center gap-2 bg-[#0B0B14] px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-[10px] sm:text-xs font-bold leading-none ${
                        track.isLengthAnchor 
                            ? 'border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)] bg-cyan-950/20' 
                            : 'border-[#2D2D3F] text-[#8F8FA3] hover:border-cyan-500/40 hover:text-cyan-400'
                    }`}>
                        <input 
                            type="checkbox" 
                            checked={!!track.isLengthAnchor}
                            onChange={(e) => handleSlider('isLengthAnchor', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[#2D2D3F] text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#161622] cursor-pointer"
                        />
                        <span>{track.isLengthAnchor ? "Length Anchor ⚓" : "Set Anchor"}</span>
                    </label>

                    <button 
                        onClick={() => onDelete(track.id)}
                        className="p-2 text-[#52526B] hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-900/50"
                        title="Remove layer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <WaveformEditor 
                buffer={track.buffer} 
                colorClass={typeConfig[track.type].color}
                trimStart={track.trimStart}
                trimEnd={track.trimEnd}
                duration={track.duration}
                onTrimChange={handleTrimChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 pt-2 relative z-10">
                <ControlGroup label={`Volume (${Math.round(track.volume * 100)}%)`}>
                    <input type="range" min="0" max="2" step="0.05" value={track.volume} 
                        onChange={e => handleSlider('volume', parseFloat(e.target.value))}
                        className={`w-full ${accentClass}`} />
                </ControlGroup>
                
                <ControlGroup label={`Speed (${track.speed.toFixed(2)}x)`}>
                    <input type="range" min="0.25" max="4" step="0.05" value={track.speed} 
                        onChange={e => handleSlider('speed', parseFloat(e.target.value))}
                        className={`w-full ${accentClass}`} />
                </ControlGroup>

                <ControlGroup label={`Reverb Amount (${Math.round(track.reverb * 100)}%)`}>
                    <input type="range" min="0" max="1" step="0.05" value={track.reverb} 
                        onChange={e => handleSlider('reverb', parseFloat(e.target.value))}
                        className={`w-full ${accentClass}`} />
                </ControlGroup>

                {(() => {
                    const durationWithSpeed = Math.max(0.1, (track.trimEnd - track.trimStart) / track.speed);
                    const maxFadeTime = Math.min(15, parseFloat(durationWithSpeed.toFixed(1)));
                    return (
                        <>
                            <ControlGroup label={`Fade In (${(track.fadeInDuration ?? 0).toFixed(1)}s)`}>
                                <input type="range" min="0" max={maxFadeTime} step="0.1" value={track.fadeInDuration ?? 0} 
                                    onChange={e => handleSlider('fadeInDuration', parseFloat(e.target.value))}
                                    className={`w-full ${accentClass}`} />
                            </ControlGroup>

                            <ControlGroup label={`Fade Out (${(track.fadeOutDuration ?? 0).toFixed(1)}s)`}>
                                <input type="range" min="0" max={maxFadeTime} step="0.1" value={track.fadeOutDuration ?? 0} 
                                    onChange={e => handleSlider('fadeOutDuration', parseFloat(e.target.value))}
                                    className={`w-full ${accentClass}`} />
                            </ControlGroup>
                        </>
                    );
                })()}

                {/* Dynamically ascertain if repeating loops are active */}
                {(() => {
                    const hasLoops = track.isInfiniteLoop || track.repeats > 1;
                    return (
                        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3 pt-4 border-t border-[#1F1F2E]">
                            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${track.randomizeInterval ? 'xl:grid-cols-7' : 'xl:grid-cols-6'} gap-6`}>
                                <ControlGroup label={`Initial Delay (${track.delay.toFixed(1)}s)`}>
                                    <input type="range" min="0" max="60" step="0.5" value={track.delay} 
                                        onChange={e => handleSlider('delay', parseFloat(e.target.value))}
                                        className={`w-full ${accentClass}`} />
                                </ControlGroup>

                                <ControlGroup label="Loop Mode">
                                    <select 
                                        value={track.isInfiniteLoop ? 'infinite' : 'discrete'}
                                        onChange={e => handleSlider('isInfiniteLoop', e.target.value === 'infinite')}
                                        className="bg-transparent text-xs text-white border-none outline-none w-full appearance-none cursor-pointer"
                                    >
                                        <option value="discrete">Discrete Plays</option>
                                        <option value="infinite">Infinite Loop</option>
                                    </select>
                                </ControlGroup>

                                <ControlGroup label={`Repeats (${track.repeats} times)`} disabled={track.isInfiniteLoop}>
                                    <input type="range" min="1" max="50" step="1" value={track.repeats} 
                                        onChange={e => handleSlider('repeats', parseInt(e.target.value))}
                                        disabled={track.isInfiniteLoop}
                                        className={`w-full ${accentClass} disabled:opacity-30`} />
                                </ControlGroup>

                                <ControlGroup label="Transition" disabled={!hasLoops}>
                                    <select 
                                        value={track.loopTransition}
                                        onChange={e => handleSlider('loopTransition', e.target.value as LoopTransition)}
                                        disabled={!hasLoops}
                                        className="bg-transparent text-xs text-white border-none outline-none w-full appearance-none cursor-pointer disabled:text-gray-600"
                                    >
                                        <option value="none">No Transition</option>
                                        <option value="crossfade">Crossfade (Overlap)</option>
                                        <option value="fade-out-in">Fade Out & In</option>
                                    </select>
                                </ControlGroup>

                                <ControlGroup label="Interval Mode" disabled={!hasLoops}>
                                    <select 
                                        value={track.randomizeInterval ? 'random' : 'fixed'}
                                        onChange={e => handleSlider('randomizeInterval', e.target.value === 'random')}
                                        disabled={!hasLoops}
                                        className="bg-transparent text-xs text-white border-none outline-none w-full appearance-none cursor-pointer disabled:text-gray-600"
                                    >
                                        <option value="fixed">Fixed Interval</option>
                                        <option value="random">Random Range</option>
                                    </select>
                                </ControlGroup>
                                
                                {track.randomizeInterval ? (
                                    <>
                                        <ControlGroup 
                                            label={`Min Silence (${(track.loopIntervalMin ?? 0).toFixed(1)}s)`} 
                                            disabled={!hasLoops}
                                        >
                                            <input type="range" min="0" max="60" step="0.5" value={track.loopIntervalMin ?? 0} 
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value);
                                                    const currentMax = track.loopInterval;
                                                    if (val > currentMax) {
                                                        onUpdate(track.id, { loopIntervalMin: val, loopInterval: val });
                                                    } else {
                                                        onUpdate(track.id, { loopIntervalMin: val });
                                                    }
                                                }}
                                                disabled={!hasLoops}
                                                className={`w-full ${accentClass} disabled:opacity-35`} />
                                        </ControlGroup>
                                        <ControlGroup 
                                            label={`Max Silence (${track.loopInterval.toFixed(1)}s)`} 
                                            disabled={!hasLoops}
                                        >
                                            <input type="range" min="0" max="60" step="0.5" value={track.loopInterval} 
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value);
                                                    const currentMin = track.loopIntervalMin ?? 0;
                                                    if (val < currentMin) {
                                                        onUpdate(track.id, { loopInterval: val, loopIntervalMin: val });
                                                    } else {
                                                        onUpdate(track.id, { loopInterval: val });
                                                    }
                                                }}
                                                disabled={!hasLoops}
                                                className={`w-full ${accentClass} disabled:opacity-35`} />
                                        </ControlGroup>
                                    </>
                                ) : (
                                    <ControlGroup 
                                        label={
                                            !hasLoops 
                                                ? `Silence Interval (0.0s)`
                                                : `Fixed Silence Gap (${track.loopInterval.toFixed(1)}s)`
                                        } 
                                        disabled={!hasLoops}
                                    >
                                        <input type="range" min="0" max="60" step="0.5" value={track.loopInterval} 
                                            onChange={e => handleSlider('loopInterval', parseFloat(e.target.value))}
                                            disabled={!hasLoops}
                                            className={`w-full ${accentClass} disabled:opacity-35`} />
                                    </ControlGroup>
                                )}
                            </div>

                            {/* Informative tutorial tip explaining the random silence range to eradicate confusion */}
                            {hasLoops && track.randomizeInterval && (
                                <div className="text-[10px] text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 px-3.5 py-2 rounded-lg leading-relaxed mt-1 relative z-10 font-sans shadow-inner">
                                    💡 <strong className="font-bold uppercase tracking-wider text-[9px] text-cyan-300">Random Mode Settings:</strong> The silent intervals between your loops are randomly generated to be anything from <strong className="text-white font-semibold">{(track.loopIntervalMin ?? 0).toFixed(1)}s up to {track.loopInterval.toFixed(1)}s</strong>. Adjust the sliders above to alter this range!
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

function ControlGroup({ label, children, disabled }: { label: string, children: React.ReactNode, disabled?: boolean }) {
    return (
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <label className="text-[10px] font-bold text-[#8F8FA3] tracking-widest uppercase truncate">{label}</label>
            <div className="h-6 flex items-center bg-[#0B0B14] px-3 py-1 rounded-full border border-[#2D2D3F]">
                {children}
            </div>
        </div>
    );
}
