"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Coins, Hash } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";
import type { ResponseCycle, DeltaGroup } from "@/lib/group-events";
import type { ParsedLogLine } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "./EventCard";
import { DeltaEventGroup } from "./DeltaEventGroup";
import { AudioDoneBlock } from "./AudioDoneBlock";

interface ResponseCycleCardProps {
  cycle: ResponseCycle;
  className?: string;
}

function isDeltaGroup(item: ParsedLogLine | DeltaGroup): item is DeltaGroup {
  return (item as DeltaGroup).kind === "delta_group";
}

export function ResponseCycleCard({ cycle, className }: ResponseCycleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate total events including those in delta groups
  const totalEvents = cycle.items.reduce((sum, item) => {
    if (isDeltaGroup(item)) {
      return sum + item.events.length;
    }
    return sum + 1;
  }, 0);

  // Count delta groups for summary
  const deltaGroupCount = cycle.items.filter(isDeltaGroup).length;

  return (
    <div
      className={cn(
        "border border-emerald-500/30 rounded-[1.5rem] bg-gradient-to-br from-emerald-500/5 to-transparent",
        "hover:border-emerald-500/50 transition-all duration-300",
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-all duration-300">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-medium px-2.5 py-1"
            >
              Response Cycle
            </Badge>

            {cycle.responseId && (
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]" title={cycle.responseId}>
                {cycle.responseId.slice(0, 12)}...
              </span>
            )}

            {cycle.startEvent.timestamp && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(cycle.startEvent.timestamp)}
              </span>
            )}

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {totalEvents} events
            </span>

            {deltaGroupCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {deltaGroupCount} grouped
              </Badge>
            )}
          </div>

          {/* Token usage */}
          {cycle.tokenUsage && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Coins className="w-3 h-3" />
              <span>
                {cycle.tokenUsage.total.toLocaleString()} tokens
                <span className="opacity-60 ml-1">
                  (in: {cycle.tokenUsage.input.toLocaleString()}, out: {cycle.tokenUsage.output.toLocaleString()})
                </span>
              </span>
            </div>
          )}

          {/* Collapsed summary */}
          {!isExpanded && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cycle.items.slice(0, 4).map((item, index) => {
                if (isDeltaGroup(item)) {
                  return (
                    <Badge
                      key={`group-${index}`}
                      variant="outline"
                      className="text-xs font-mono px-2 py-0.5 opacity-70"
                    >
                      {item.eventType.split(".").pop()} ×{item.events.length}
                    </Badge>
                  );
                }
                return (
                  <Badge
                    key={`event-${index}`}
                    variant="outline"
                    className="text-xs font-mono px-2 py-0.5 opacity-70"
                  >
                    {(item.event.type as string).split(".").pop()}
                  </Badge>
                );
              })}
              {cycle.items.length > 4 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 opacity-50">
                  +{cycle.items.length - 4} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-emerald-500/20 p-4 pt-3 space-y-2">
          {cycle.items.map((item, index) => {
            if (isDeltaGroup(item)) {
              return (
                <DeltaEventGroup
                  key={`delta-${item.firstLineNumber}-${index}`}
                  group={item}
                />
              );
            }

            // Check if this is a response.audio.done event
            const isAudioDone = item.event.type === "response.audio.done";

            // Collect ALL audio delta groups from the entire cycle for audio done events
            let audioDeltaGroups: DeltaGroup[] = [];
            if (isAudioDone) {
              // Collect all audio delta groups from the entire response cycle
              audioDeltaGroups = cycle.items.filter(
                (cycleItem): cycleItem is DeltaGroup =>
                  isDeltaGroup(cycleItem) && cycleItem.eventType === "response.audio.delta"
              );
            }

            return (
              <div key={`event-${item.lineNumber}-${index}`}>
                <EventCard event={item} />
                {/* Render AudioDoneBlock after response.audio.done */}
                {isAudioDone && audioDeltaGroups.length > 0 && (
                  <AudioDoneBlock
                    audioDeltaGroups={audioDeltaGroups}
                    className="mt-2"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
