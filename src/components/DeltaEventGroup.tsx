"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Layers, Hash, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEventCategory, CATEGORY_COLORS } from "@/lib/types";
import type { DeltaGroup } from "@/lib/group-events";
import { getDeltaGroupStats } from "@/lib/group-events";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "./EventCard";
import { AudioPlayButton } from "./AudioPlayButton";

interface DeltaEventGroupProps {
  group: DeltaGroup;
  className?: string;
}

export function DeltaEventGroup({ group, className }: DeltaEventGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stats = getDeltaGroupStats(group);
  const category = getEventCategory(group.eventType);
  const colorClasses = CATEGORY_COLORS[category];

  // Extract short type name
  const shortType = group.eventType.split(".").slice(-2).join(".");

  return (
    <div
      className={cn(
        "border border-border/60 rounded-[1.25rem] bg-card/30",
        "hover:bg-card/50 transition-all duration-300",
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="text-muted-foreground hover:text-primary transition-all duration-300">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <Layers className="w-4 h-4 text-muted-foreground" />

        <Badge
          variant="outline"
          className={cn("font-mono text-xs border px-2 py-0.5", colorClasses)}
        >
          {shortType}
        </Badge>

        <Badge variant="secondary" className="text-xs px-2 py-0.5">
          ×{stats.count}
        </Badge>

        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="w-3 h-3" />
          {group.firstLineNumber}–{group.lastLineNumber}
        </span>

        {/* Audio Play Button for audio.delta groups */}
        {group.eventType === "response.audio.delta" && (
          <div onClick={(e) => e.stopPropagation()}>
            <AudioPlayButton events={group.events} />
          </div>
        )}

        {/* Aggregated transcript preview */}
        {stats.aggregatedText && (
          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            <span className="text-xs truncate">
              &quot;{stats.aggregatedText.slice(0, 80)}
              {stats.aggregatedText.length > 80 ? "..." : ""}&quot;
            </span>
          </div>
        )}
      </div>

      {/* Expanded events */}
      {isExpanded && (
        <div className="border-t border-border/40 p-3 space-y-2">
          {group.events.map((event, index) => (
            <EventCard
              key={`${event.lineNumber}-${index}`}
              event={event}
              className="bg-card/20"
            />
          ))}
        </div>
      )}
    </div>
  );
}
