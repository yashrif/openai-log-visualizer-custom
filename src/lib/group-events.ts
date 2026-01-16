import { ParsedLogLine, DELTA_EVENT_TYPES, PHASE_EVENTS } from "./types";

// ============================================================================
// Types
// ============================================================================

export type PhaseType = "speech" | "response" | "function_call";

export interface PhaseMarker {
  kind: "phase";
  type: PhaseType;
  timestamp?: string;
  lineNumber: number;
}

export interface DeltaGroup {
  kind: "delta_group";
  eventType: string;
  events: ParsedLogLine[];
  firstLineNumber: number;
  lastLineNumber: number;
}

export interface ResponseCycle {
  kind: "response_cycle";
  responseId?: string;
  startEvent: ParsedLogLine;
  endEvent?: ParsedLogLine;
  items: Array<ParsedLogLine | DeltaGroup>;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface StandaloneEvent {
  kind: "standalone";
  event: ParsedLogLine;
}

export type EventGroup = PhaseMarker | ResponseCycle | StandaloneEvent;

// ============================================================================
// Grouping Logic
// ============================================================================

function isDeltaEvent(type: string): boolean {
  return (DELTA_EVENT_TYPES as readonly string[]).includes(type);
}

/**
 * Aggregates consecutive delta events of the same type into DeltaGroup
 */
function aggregateDeltaEvents(events: ParsedLogLine[]): Array<ParsedLogLine | DeltaGroup> {
  const result: Array<ParsedLogLine | DeltaGroup> = [];
  let currentGroup: DeltaGroup | null = null;

  for (const event of events) {
    const eventType = event.event.type as string;

    if (isDeltaEvent(eventType)) {
      if (currentGroup && currentGroup.eventType === eventType) {
        // Continue current group
        currentGroup.events.push(event);
        currentGroup.lastLineNumber = event.lineNumber;
      } else {
        // Flush previous group if exists
        if (currentGroup) {
          result.push(currentGroup);
        }
        // Start new group
        currentGroup = {
          kind: "delta_group",
          eventType,
          events: [event],
          firstLineNumber: event.lineNumber,
          lastLineNumber: event.lineNumber,
        };
      }
    } else {
      // Non-delta event - flush current group and add standalone
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(event);
    }
  }

  // Flush final group
  if (currentGroup) {
    result.push(currentGroup);
  }

  return result;
}

/**
 * Groups events by response cycles and adds phase markers
 */
export function groupEvents(events: ParsedLogLine[]): EventGroup[] {
  const result: EventGroup[] = [];
  let currentCycle: ResponseCycle | null = null;
  let cycleEvents: ParsedLogLine[] = [];

  const flushCycle = () => {
    if (currentCycle) {
      // Aggregate deltas within the cycle
      currentCycle.items = aggregateDeltaEvents(cycleEvents);
      result.push(currentCycle);
      currentCycle = null;
      cycleEvents = [];
    }
  };

  for (const event of events) {
    const eventType = event.event.type as string;

    // Check for phase markers
    if (eventType === PHASE_EVENTS.SPEECH_START) {
      flushCycle();
      result.push({
        kind: "phase",
        type: "speech",
        timestamp: event.timestamp,
        lineNumber: event.lineNumber,
      });
      result.push({ kind: "standalone", event });
      continue;
    }

    // Start of response cycle
    if (eventType === PHASE_EVENTS.RESPONSE_START) {
      flushCycle();

      // Add phase marker for AI response
      result.push({
        kind: "phase",
        type: "response",
        timestamp: event.timestamp,
        lineNumber: event.lineNumber,
      });

      const responseData = event.event.response as Record<string, unknown> | undefined;
      currentCycle = {
        kind: "response_cycle",
        responseId: responseData?.id as string | undefined,
        startEvent: event,
        items: [],
      };
      cycleEvents.push(event);
      continue;
    }

    // End of response cycle
    if (eventType === "response.done" || eventType === "response.cancelled") {
      if (currentCycle) {
        currentCycle.endEvent = event;
        cycleEvents.push(event);

        // Extract token usage from response.done
        if (eventType === "response.done") {
          const response = event.event.response as Record<string, unknown> | undefined;
          const usage = response?.usage as Record<string, number> | undefined;
          if (usage) {
            currentCycle.tokenUsage = {
              input: usage.input_tokens || 0,
              output: usage.output_tokens || 0,
              total: usage.total_tokens || 0,
            };
          }
        }

        flushCycle();
      } else {
        // Orphan response.done - treat as standalone
        result.push({ kind: "standalone", event });
      }
      continue;
    }

    // Function call phase marker
    if (eventType === PHASE_EVENTS.FUNCTION_CALL) {
      if (currentCycle) {
        cycleEvents.push(event);
        // Also add a phase marker within the cycle rendering
      } else {
        result.push({
          kind: "phase",
          type: "function_call",
          timestamp: event.timestamp,
          lineNumber: event.lineNumber,
        });
        result.push({ kind: "standalone", event });
      }
      continue;
    }

    // Regular event - add to cycle or standalone
    if (currentCycle) {
      cycleEvents.push(event);
    } else {
      result.push({ kind: "standalone", event });
    }
  }

  // Flush any remaining cycle
  flushCycle();

  return result;
}

/**
 * Get aggregate data from a delta group
 */
export function getDeltaGroupStats(group: DeltaGroup): {
  count: number;
  aggregatedText?: string;
} {
  const count = group.events.length;

  // For transcript deltas, aggregate the text
  if (
    group.eventType === "response.audio_transcript.delta" ||
    group.eventType === "response.text.delta" ||
    group.eventType === "conversation.item.input_audio_transcription.delta"
  ) {
    const text = group.events
      .map((e) => {
        const delta = e.event.delta as string | undefined;
        const transcript = e.event.transcript as string | undefined;
        return delta || transcript || "";
      })
      .join("");
    return { count, aggregatedText: text };
  }

  return { count };
}
