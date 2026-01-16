import { ParsedLogLine, Session, OpenAIEvent, LogSource } from "./types";

/**
 * Parse a single log line into its components
 * Format: [timestamp] [uuid] [source] {json}
 * Timestamp, UUID, and source are optional, JSON is required
 * Source can be [OPENAI] or [USER]
 */
export function parseLogLine(line: string, lineNumber: number): ParsedLogLine | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  let timestamp: string | undefined;
  let sessionId: string | undefined;
  let source: LogSource | undefined;
  let jsonStr: string;

  // Try to extract timestamp (ISO format at start)
  const timestampMatch = trimmedLine.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*/);
  let remaining = trimmedLine;

  if (timestampMatch) {
    timestamp = timestampMatch[1];
    remaining = remaining.slice(timestampMatch[0].length);
  }

  // Try to extract UUID in brackets
  const uuidMatch = remaining.match(/^\[([a-f0-9-]+)\]\s*/i);
  if (uuidMatch) {
    sessionId = uuidMatch[1];
    remaining = remaining.slice(uuidMatch[0].length);
  }

  // Try to extract source tag [OPENAI] or [USER]
  const sourceMatch = remaining.match(/^\[(OPENAI|USER)\]\s*/i);
  if (sourceMatch) {
    source = sourceMatch[1].toUpperCase() as LogSource;
    remaining = remaining.slice(sourceMatch[0].length);
  }

  // Rest should be JSON
  jsonStr = remaining;

  try {
    const event = JSON.parse(jsonStr) as OpenAIEvent;
    return {
      timestamp,
      sessionId,
      source,
      event,
      rawLine: line,
      lineNumber,
    };
  } catch {
    console.warn(`Failed to parse JSON at line ${lineNumber}:`, jsonStr.slice(0, 100));
    return null;
  }
}

/**
 * Parse entire log file content into sessions
 * Sessions are split by session.created events
 */
export function parseLogFile(content: string): Session[] {
  const lines = content.split(/\r?\n/);
  const sessions: Session[] = [];
  let currentSession: Session | null = null;
  let sessionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLogLine(lines[i], i + 1);
    if (!parsed) continue;

    // Check if this is a session.created event - start new session
    if (parsed.event.type === "session.created") {
      sessionCounter++;
      const sessionData = parsed.event.session as Record<string, unknown> | undefined;

      currentSession = {
        id: `session-${sessionCounter}`,
        sessionId: sessionData?.id as string | undefined,
        startTime: parsed.timestamp,
        events: [parsed],
        model: sessionData?.model as string | undefined,
        voice: sessionData?.voice as string | undefined,
      };
      sessions.push(currentSession);
    } else if (currentSession) {
      // Add event to current session
      currentSession.events.push(parsed);
    } else {
      // No session yet, create an implicit one
      sessionCounter++;
      currentSession = {
        id: `session-${sessionCounter}`,
        startTime: parsed.timestamp,
        events: [parsed],
      };
      sessions.push(currentSession);
    }
  }

  return sessions;
}

/**
 * Get summary statistics for a session
 */
export function getSessionStats(session: Session): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const event of session.events) {
    const type = event.event.type;
    stats[type] = (stats[type] || 0) + 1;
  }

  return stats;
}

/**
 * Check if an event contains audio delta (base64 data that should be hidden)
 */
export function isAudioDeltaEvent(event: OpenAIEvent): boolean {
  return event.type === "response.audio.delta";
}

/**
 * Get a display-friendly version of an event (hiding large binary data)
 */
export function getSanitizedEventData(event: OpenAIEvent): OpenAIEvent {
  if (isAudioDeltaEvent(event)) {
    return {
      ...event,
      delta: "[audio data hidden]",
    };
  }
  return event;
}
