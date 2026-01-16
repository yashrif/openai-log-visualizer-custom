"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Play, Square, Volume2, Loader2, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractAudioFromDeltaGroup,
  createAudioPlayer,
  formatDuration,
  getAudioDuration,
  type AudioPlaybackController,
} from "@/lib/audio-player";
import { Button } from "@/components/ui/button";
import type { DeltaGroup } from "@/lib/group-events";

interface AudioDoneBlockProps {
  audioDeltaGroups: DeltaGroup[];
  className?: string;
}

export function AudioDoneBlock({ audioDeltaGroups, className }: AudioDoneBlockProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const playerRef = useRef<AudioPlaybackController | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Combine all events from all audio delta groups
  const allAudioEvents = useMemo(() => {
    return audioDeltaGroups.flatMap(group => group.events);
  }, [audioDeltaGroups]);

  // Calculate total chunks count
  const totalChunks = useMemo(() => {
    return audioDeltaGroups.reduce((sum, group) => sum + group.events.length, 0);
  }, [audioDeltaGroups]);

  // Pre-calculate duration on mount
  useEffect(() => {
    try {
      const audioData = extractAudioFromDeltaGroup(allAudioEvents);
      if (audioData) {
        audioDataRef.current = audioData;
        setDuration(getAudioDuration(audioData));
      } else {
        setError("No audio data available");
      }
    } catch {
      setError("Failed to decode audio");
    }
  }, [allAudioEvents]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying && playerRef.current) {
      // Stop playback
      playerRef.current.stop();
      playerRef.current = null;
      setIsPlaying(false);
      stopProgressTracking();
      setProgress(0);
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
        stopProgressTracking();
        setProgress(0);
      });

      playerRef.current = player;
      player.play();
      setIsPlaying(true);
      startTimeRef.current = Date.now();

      // Track progress
      progressIntervalRef.current = window.setInterval(() => {
        if (duration) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          setProgress(Math.min(elapsed / duration, 1));
        }
      }, 50);
    } catch (err) {
      setError("Playback failed");
      console.error("Audio playback error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, duration, stopProgressTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      stopProgressTracking();
    };
  }, [stopProgressTracking]);

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/30 border border-border/40",
        className
      )}>
        <Music className="w-4 h-4 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground/50">{error}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-gradient-to-r from-pink-500/10 to-purple-500/10",
        "border border-pink-500/30 dark:border-pink-500/20",
        "hover:border-pink-500/50 transition-all duration-300",
        className
      )}
    >
      {/* Play button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 w-10 p-0 rounded-full flex-shrink-0",
          isPlaying
            ? "bg-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-500/40"
            : "bg-pink-500/20 hover:bg-pink-500/30 text-pink-600 dark:text-pink-400"
        )}
        onClick={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isPlaying ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      {/* Progress bar and info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Volume2 className="w-4 h-4 text-pink-500/70" />
          <span className="text-sm font-medium text-foreground/80">
            Response Audio
          </span>
          {duration !== null && (
            <span className="text-xs text-muted-foreground tabular-nums ml-auto">
              {isPlaying ? formatDuration(progress * duration) + " / " : ""}
              {formatDuration(duration)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isPlaying
                ? "bg-gradient-to-r from-pink-500 to-purple-500"
                : "bg-pink-500/40"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Delta count info */}
      <div className="text-xs text-muted-foreground flex-shrink-0">
        {totalChunks} chunks
      </div>
    </div>
  );
}
