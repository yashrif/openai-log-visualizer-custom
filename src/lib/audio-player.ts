/**
 * Audio Player Utility for OpenAI Realtime Audio
 *
 * Handles decoding and playback of PCM16 audio data from response.audio.delta events
 */

// OpenAI Realtime uses 24kHz audio
const DEFAULT_SAMPLE_RATE = 24000;

// Global audio context (lazy initialized)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: DEFAULT_SAMPLE_RATE });
  }
  return audioContext;
}

/**
 * Decode base64 PCM16 audio to Float32Array
 * OpenAI sends audio as base64-encoded PCM16 (16-bit signed integers, little-endian)
 */
export function decodeAudioDelta(base64: string): Float32Array {
  // Decode base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert bytes to Int16Array (PCM16 format)
  const int16Array = new Int16Array(bytes.buffer);

  // Convert to Float32 (-1.0 to 1.0 range) for Web Audio API
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  return float32Array;
}

/**
 * Combine multiple audio chunks into a single Float32Array
 */
export function combineAudioChunks(chunks: Float32Array[]): Float32Array {
  if (chunks.length === 0) {
    return new Float32Array(0);
  }

  if (chunks.length === 1) {
    return chunks[0];
  }

  // Calculate total length
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

  // Merge all chunks
  const combined = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

/**
 * Calculate audio duration in seconds
 */
export function getAudioDuration(
  audioData: Float32Array,
  sampleRate: number = DEFAULT_SAMPLE_RATE
): number {
  return audioData.length / sampleRate;
}

/**
 * Format duration as mm:ss or ss.d for short durations
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Audio playback controller
 */
export interface AudioPlaybackController {
  play: () => void;
  stop: () => void;
  isPlaying: boolean;
  duration: number;
}

/**
 * Create an audio playback controller for the given audio data
 */
export function createAudioPlayer(
  audioData: Float32Array,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
  onEnded?: () => void
): AudioPlaybackController {
  const ctx = getAudioContext();
  let source: AudioBufferSourceNode | null = null;
  let isPlaying = false;

  const duration = getAudioDuration(audioData, sampleRate);

  const play = () => {
    if (isPlaying) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Create audio buffer
    const buffer = ctx.createBuffer(1, audioData.length, sampleRate);
    buffer.getChannelData(0).set(audioData);

    // Create and configure source
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    source.onended = () => {
      isPlaying = false;
      source = null;
      onEnded?.();
    };

    source.start();
    isPlaying = true;
  };

  const stop = () => {
    if (source) {
      source.stop();
      source.disconnect();
      source = null;
    }
    isPlaying = false;
  };

  return {
    play,
    stop,
    get isPlaying() {
      return isPlaying;
    },
    duration,
  };
}

/**
 * Extract and combine audio data from delta events
 * Returns null if no audio data found
 */
export function extractAudioFromDeltaGroup(
  events: Array<{ event: { delta?: string } }>
): Float32Array | null {
  const chunks: Float32Array[] = [];

  for (const evt of events) {
    const delta = evt.event.delta;
    if (typeof delta === "string" && delta.length > 0) {
      try {
        const decoded = decodeAudioDelta(delta);
        if (decoded.length > 0) {
          chunks.push(decoded);
        }
      } catch {
        // Skip invalid base64 data
        console.warn("Failed to decode audio delta");
      }
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  return combineAudioChunks(chunks);
}
