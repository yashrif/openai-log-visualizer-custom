"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Clock, MessageSquare, List, Layers } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";
import { Session, getEventCategory, CATEGORY_COLORS } from "@/lib/types";
import { getSessionStats } from "@/lib/parse-log";
import { groupEvents, EventGroup, ResponseCycle, DeltaGroup } from "@/lib/group-events";
import type { ParsedLogLine } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { PhaseMarker } from "./PhaseMarker";
import { ResponseCycleCard } from "./ResponseCycleCard";
import { DeltaEventGroup } from "./DeltaEventGroup";

interface SessionCardProps {
  session: Session;
  className?: string;
  defaultExpanded?: boolean;
}

type ViewMode = "flat" | "grouped";

function isDeltaGroup(item: ParsedLogLine | DeltaGroup): item is DeltaGroup {
  return (item as DeltaGroup).kind === "delta_group";
}

export function SessionCard({
  session,
  className,
  defaultExpanded = true,
}: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const stats = useMemo(() => getSessionStats(session), [session]);
  const initialChunk = 200;
  const chunkSize = 200;
  const [visibleCount, setVisibleCount] = useState(
    defaultExpanded ? Math.min(initialChunk, session.events.length) : 0
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Group events when in grouped mode
  const groupedEvents = useMemo(() => {
    if (viewMode === "grouped") {
      return groupEvents(session.events);
    }
    return null;
  }, [session.events, viewMode]);

  useEffect(() => {
    // Reset visible items when session changes or collapse/expand toggles.
    if (isExpanded) {
      setVisibleCount((count) => (count === 0 ? Math.min(initialChunk, session.events.length) : count));
    } else {
      setVisibleCount(0);
    }
  }, [isExpanded, session.events.length]);

  useEffect(() => {
    if (!isExpanded) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + chunkSize, session.events.length));
        }
      },
      {
        root: null,
        rootMargin: "600px 0px",
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [chunkSize, isExpanded, session.events.length, viewMode]);

  // Get unique event categories for badges
  const categories = useMemo(() => {
    const cats = new Set<string>();
    session.events.forEach((e) => cats.add(getEventCategory(e.event.type)));
    return Array.from(cats);
  }, [session.events]);

  // Render grouped view item
  const renderGroupedItem = (group: EventGroup, index: number) => {
    switch (group.kind) {
      case "phase":
        return <PhaseMarker key={`phase-${group.lineNumber}-${index}`} type={group.type} />;
      case "response_cycle":
        return (
          <ResponseCycleCard
            key={`cycle-${(group as ResponseCycle).startEvent.lineNumber}-${index}`}
            cycle={group as ResponseCycle}
          />
        );
      case "standalone":
        return (
          <EventCard
            key={`event-${group.event.lineNumber}-${index}`}
            event={group.event}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-card to-card/60 border-border/60 hover:border-primary/30 transition-all duration-300",
        className
      )}
    >
      <CardHeader
        className="cursor-pointer select-none hover:bg-accent/5 transition-colors duration-300 rounded-t-[2rem]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left side - session info */}
          <div className="flex items-start gap-3">
            <button className="mt-1.5 text-muted-foreground hover:text-primary transition-all duration-300">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-lg">{session.id}</h3>
                {session.model && (
                  <Badge variant="secondary" className="text-xs px-2.5 py-1">
                    {session.model}
                  </Badge>
                )}
                {session.voice && (
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    🎤 {session.voice}
                  </Badge>
                )}
              </div>

              {/* Session metadata */}
              <div className="flex items-center gap-5 mt-2 text-sm text-muted-foreground">
                {session.startTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimestamp(session.startTime)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {session.events.length} events
                </span>
                {session.sessionId && (
                  <span className="font-mono text-xs truncate max-w-[200px]" title={session.sessionId}>
                    {session.sessionId.slice(0, 12)}...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side - category indicators */}
          <div className="flex flex-wrap gap-1.5 justify-end">
            {categories.slice(0, 5).map((cat) => (
              <div
                key={cat}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]?.split(" ")[0] || "bg-gray-500/20"
                )}
                title={cat}
              />
            ))}
          </div>
        </div>

        {/* Event type stats bar */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(stats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([type, count]) => {
                const category = getEventCategory(type);
                const colorClasses = CATEGORY_COLORS[category];
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className={cn("text-xs font-mono px-2.5 py-1", colorClasses)}
                  >
                    {type.split(".").pop()} <span className="ml-1.5 opacity-60">×{count}</span>
                  </Badge>
                );
              })}
            {Object.keys(stats).length > 6 && (
              <Badge variant="outline" className="text-xs text-muted-foreground px-2.5 py-1">
                +{Object.keys(stats).length - 6} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {/* View mode toggle */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
            <span className="text-xs text-muted-foreground">View:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewMode("grouped");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                viewMode === "grouped"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Layers className="w-3 h-3" />
              Grouped
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewMode("flat");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                viewMode === "flat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="w-3 h-3" />
              Flat
            </button>
          </div>

          <div className="space-y-2.5">
            {viewMode === "grouped" && groupedEvents ? (
              // Grouped view
              groupedEvents.map((group, index) => renderGroupedItem(group, index))
            ) : (
              // Flat view (original)
              <>
                {session.events.slice(0, visibleCount).map((event, index) => (
                  <EventCard
                    key={`${event.lineNumber}-${index}`}
                    event={event}
                  />
                ))}
                {visibleCount < session.events.length && (
                  <div
                    ref={sentinelRef}
                    className="flex justify-center py-4 text-sm text-muted-foreground"
                  >
                    Loading more events...
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
