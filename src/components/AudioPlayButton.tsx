"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Square, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractAudioFromDeltaGroup,
  createAudioPlayer,
  formatDuration,
  getAudioDuration,
  type AudioPlaybackController,
} from "@/lib/audio-player";
import { Button } from "@/components/ui/button";

interface AudioPlayButtonProps {
  events: Array<{ event: { delta?: string } }>;
  className?: string;
}

export function AudioPlayButton({ events, className }: AudioPlayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlaybackController | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);

  // Pre-calculate duration on mount
  useEffect(() => {
    try {
      const audioData = extractAudioFromDeltaGroup(events);
      if (audioData) {
        audioDataRef.current = audioData;
        setDuration(getAudioDuration(audioData));
      } else {
        setError("No audio data");
      }
    } catch {
      setError("Failed to decode");
    }
  }, [events]);

  const handlePlay = useCallback(() => {
    if (isPlaying && playerRef.current) {
      // Stop playback
      playerRef.current.stop();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const audioData = audioDataRef.current;
      if (!audioData) {
        setError("No audio data");
        setIsLoading(false);
        return;
      }

      const player = createAudioPlayer(audioData, 24000, () => {
        setIsPlaying(false);
        playerRef.current = null;
      });

      playerRef.current = player;
      player.play();
      setIsPlaying(true);
    } catch (err) {
      setError("Playback failed");
      console.error("Audio playback error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []);

  if (error) {
    return (
      <span className="text-xs text-muted-foreground/50 px-2">{error}</span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 rounded-full",
          isPlaying
            ? "bg-pink-500/20 text-pink-600 dark:text-pink-400 hover:bg-pink-500/30"
            : "hover:bg-pink-500/10 text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400"
        )}
        onClick={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPlaying ? (
          <Square className="h-3 w-3" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" />
        )}
      </Button>

      {duration !== null && (
        <span
          className={cn(
            "text-xs tabular-nums",
            isPlaying
              ? "text-pink-600 dark:text-pink-400"
              : "text-muted-foreground"
          )}
        >
          <Volume2 className="h-3 w-3 inline mr-1 opacity-60" />
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
