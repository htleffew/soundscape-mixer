import { TrackParams } from "./types";

// Simple hash function to turn a string (like track ID) into a numeric seed
export function getSeedFromId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0; // Convert to s32
    }
    return Math.abs(hash) || 12345;
}

// Pseudo-random generator using Mulberry32 for extremely high performance and robust distribution
export function createPRNG(seed: number) {
    let t = seed + 0x6D2B79F5;
    return function() {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Generates exactly the same random interval for a given repetition index of a track
export function getTrackInterval(track: TrackParams, index: number): number {
    const defaultInterval = track.loopInterval;
    if (!track.randomizeInterval) {
        return defaultInterval;
    }
    
    const minInterval = track.loopIntervalMin !== undefined ? track.loopIntervalMin : 0;
    const maxInterval = track.loopInterval;
    const actualMin = Math.min(minInterval, maxInterval);
    const range = maxInterval - actualMin;
    
    // Create a stable PRNG using track ID as the seed
    const seed = getSeedFromId(track.id);
    const rand = createPRNG(seed);
    
    // Force step generator index times
    let val = 0.5;
    for (let k = 0; k <= index; k++) {
        val = rand();
    }
    
    return actualMin + val * range;
}

export async function decodeAudioFile(file: File, context: BaseAudioContext): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
}

export function synthesizeImpulseResponse(context: BaseAudioContext, durationSeconds: number, decayRate: number): AudioBuffer {
    const sampleRate = context.sampleRate;
    const length = sampleRate * durationSeconds;
    const impulse = context.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
        const channelData = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate);
        }
    }
    return impulse;
}

export function exportWav(audioBuffer: AudioBuffer): Blob {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"
    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    for(i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    while(pos < length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([buffer], { type: "audio/wav" });
}

export function calculateTrackDuration(track: TrackParams): number {
    const actualDuration = track.trimEnd - track.trimStart;
    if (actualDuration <= 0) return 0;
    const durationWithSpeed = actualDuration / track.speed;
    
    // If it's an infinite loop, treat it as a single iteration for duration estimation in the mix context
    const repeats = track.isInfiniteLoop ? 1 : track.repeats;
    
    let total = track.delay;
    for (let i = 0; i < repeats; i++) {
        if (i > 0) {
            const interval = getTrackInterval(track, i);
            
            if (track.loopTransition === 'crossfade') {
                let fadeTime = 0.5;
                if (fadeTime > durationWithSpeed / 3) fadeTime = durationWithSpeed / 3;
                total += (durationWithSpeed - fadeTime) + interval;
            } else {
                total += durationWithSpeed + interval;
            }
        } else {
            total += durationWithSpeed;
        }
    }
    return total;
}

export function calculateTotalDuration(tracks: TrackParams[]): number {
    if (tracks.length === 0) return 0;
    
    // 1. If there's an explicit length anchor designated by the user, use it!
    const anchor = tracks.find(t => t.isLengthAnchor);
    if (anchor) {
        return Math.max(0.1, calculateTrackDuration(anchor));
    }
    
    // 2. Otherwise fall back to the maximum calculated active duration among music or soundscapes
    const musicOrSoundscape = tracks.filter(t => t.type === 'music' || t.type === 'soundscape');
    if (musicOrSoundscape.length > 0) {
        return Math.max(...musicOrSoundscape.map(t => calculateTrackDuration(t)));
    }
    
    // 3. Last resort: maximum calculated active duration of any track
    return Math.max(...tracks.map(t => calculateTrackDuration(t)));
}

export async function setupPlayback(ctx: BaseAudioContext, tracks: TrackParams[], startTime: number = 0) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -3;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = synthesizeImpulseResponse(ctx, 3, 2);
    convolver.connect(compressor);

    const sourceNodes: AudioBufferSourceNode[] = [];

    const maxDuration = calculateTotalDuration(tracks);

    tracks.forEach((track) => {
        if (!track.buffer) return;
        const actualDuration = track.trimEnd - track.trimStart;
        if (actualDuration <= 0) return;
        
        const repeats = track.isInfiniteLoop ? 9999 : track.repeats;
        let fadeTime = 0.5; // 0.5s for transitions
        if (fadeTime > actualDuration / track.speed / 3) fadeTime = actualDuration / track.speed / 3;

        let currentScheduledTime = startTime + track.delay;

        for (let i = 0; i < repeats; i++) {
            const durationWithSpeed = actualDuration / track.speed;
            
            if (i > 0) {
                const interval = getTrackInterval(track, i);

                if (track.loopTransition === 'crossfade') {
                    currentScheduledTime += (durationWithSpeed - fadeTime) + interval;
                } else {
                    currentScheduledTime += durationWithSpeed + interval;
                }
            }

            const scheduledTime = currentScheduledTime;

            // Stop scheduling if we go beyond the max mix duration
            if (scheduledTime - startTime >= maxDuration) {
                break;
            }

            const source = ctx.createBufferSource();
            source.buffer = track.buffer;
            source.playbackRate.value = track.speed;
            
            const trackGain = ctx.createGain();
            const currentVolume = Math.max(0, Math.min(1, track.volume));
            trackGain.gain.value = currentVolume;

            const actualFadeIn = Math.min(track.fadeInDuration !== undefined ? track.fadeInDuration : 0, durationWithSpeed);
            const actualFadeOut = Math.min(track.fadeOutDuration !== undefined ? track.fadeOutDuration : 0, durationWithSpeed - actualFadeIn);

            if (actualFadeIn > 0) {
                trackGain.gain.setValueAtTime(0, scheduledTime);
                trackGain.gain.linearRampToValueAtTime(currentVolume, scheduledTime + actualFadeIn);
            } else if (track.loopTransition === 'crossfade' || track.loopTransition === 'fade-out-in') {
                if (i > 0 || track.loopTransition === 'fade-out-in') {
                    trackGain.gain.setValueAtTime(0, scheduledTime);
                    trackGain.gain.linearRampToValueAtTime(currentVolume, scheduledTime + fadeTime);
                } else {
                    trackGain.gain.setValueAtTime(currentVolume, scheduledTime);
                }
            } else {
                trackGain.gain.setValueAtTime(currentVolume, scheduledTime);
            }

            if (actualFadeOut > 0) {
                trackGain.gain.setValueAtTime(currentVolume, scheduledTime + durationWithSpeed - actualFadeOut);
                trackGain.gain.linearRampToValueAtTime(0, scheduledTime + durationWithSpeed);
            } else if (track.loopTransition === 'crossfade' || track.loopTransition === 'fade-out-in') {
                trackGain.gain.setValueAtTime(currentVolume, scheduledTime + durationWithSpeed - fadeTime);
                trackGain.gain.linearRampToValueAtTime(0, scheduledTime + durationWithSpeed);
            }
            
            source.connect(trackGain);
            
            if (track.reverb > 0) {
                const wetGain = ctx.createGain();
                wetGain.gain.value = track.reverb;
                trackGain.connect(wetGain);
                wetGain.connect(convolver);
                
                const dryGain = ctx.createGain();
                dryGain.gain.value = 1 - track.reverb;
                trackGain.connect(dryGain);
                dryGain.connect(compressor);
            } else {
                trackGain.connect(compressor);
            }
            
            const offset = track.trimStart;
            source.start(scheduledTime, offset, actualDuration);
            sourceNodes.push(source);
        }
    });

    return sourceNodes;
}
