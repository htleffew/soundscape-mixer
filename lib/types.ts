export type TrackType = 'music' | 'soundscape' | 'sfx';
export type LoopTransition = 'none' | 'crossfade' | 'fade-out-in';

export interface TrackParams {
    id: string;
    type: TrackType;
    file: File;
    name: string;
    buffer: AudioBuffer;
    volume: number; // 0.0 - 2.0
    speed: number;  // 0.25 - 4.0
    delay: number;  // seconds (start staggering)
    repeats: number; // integer 1+
    isInfiniteLoop: boolean;
    loopTransition: LoopTransition;
    loopInterval: number; // seconds (max when randomized)
    loopIntervalMin: number; // seconds (min when randomized)
    randomizeInterval: boolean; // whether loop interval is randomized
    reverb: number; // 0.0 - 1.0 (dry/wet)
    trimStart: number; // seconds
    trimEnd: number; // seconds
    fadeInDuration: number; // seconds
    fadeOutDuration: number; // seconds
    duration: number; // total duration of the original audio file
    isLengthAnchor: boolean;
}
