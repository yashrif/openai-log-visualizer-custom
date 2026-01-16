// OpenAI Realtime Event Types
export type EventCategory =
  | "session"
  | "error"
  | "conversation"
  | "audio_buffer"
  | "response_lifecycle"
  | "response_output"
  | "response_content"
  | "response_audio"
  | "response_text"
  | "function_call"
  | "rate_limits"
  | "unknown";

export interface OpenAIEvent {
  type: string;
  event_id: string;
  // Allow additional properties
  name?: string;
  delta?: string;
  transcript?: string;
  arguments?: string;
  response?: Record<string, unknown>;
  session?: Record<string, unknown>;
  error?: Record<string, unknown>;
  rate_limits?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ParsedLogLine {
  timestamp?: string;
  sessionId?: string;
  event: OpenAIEvent;
  rawLine: string;
  lineNumber: number;
}

export interface Session {
  id: string;
  sessionId?: string;
  startTime?: string;
  events: ParsedLogLine[];
  model?: string;
  voice?: string;
}

// Event type to category mapping
export const EVENT_CATEGORIES: Record<string, EventCategory> = {
  "session.created": "session",
  "session.updated": "session",
  error: "error",
  "conversation.created": "conversation",
  "conversation.item.created": "conversation",
  "conversation.item.retrieved": "conversation",
  "conversation.item.input_audio_transcription.delta": "conversation",
  "conversation.item.input_audio_transcription.completed": "conversation",
  "input_audio_buffer.committed": "audio_buffer",
  "input_audio_buffer.cleared": "audio_buffer",
  "input_audio_buffer.speech_started": "audio_buffer",
  "input_audio_buffer.speech_stopped": "audio_buffer",
  "response.created": "response_lifecycle",
  "response.done": "response_lifecycle",
  "response.cancelled": "response_lifecycle",
  "response.output_item.added": "response_output",
  "response.output_item.done": "response_output",
  "response.content_part.added": "response_content",
  "response.content_part.done": "response_content",
  "response.audio.delta": "response_audio",
  "response.audio.done": "response_audio",
  "response.audio_transcript.delta": "response_audio",
  "response.audio_transcript.done": "response_audio",
  "response.text.delta": "response_text",
  "response.text.done": "response_text",
  "response.function_call_arguments.delta": "function_call",
  "response.function_call_arguments.done": "function_call",
  "rate_limits.updated": "rate_limits",
};

export function getEventCategory(eventType: string): EventCategory {
  return EVENT_CATEGORIES[eventType] || "unknown";
}

// Color mapping for event categories - uses dark: variant for theme-aware colors
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  session: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40 dark:border-violet-500/30",
  error: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 dark:border-red-500/30",
  conversation: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 dark:border-blue-500/30",
  audio_buffer: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-500/30",
  response_lifecycle: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-500/30",
  response_output: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40 dark:border-teal-500/30",
  response_content: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 dark:border-cyan-500/30",
  response_audio: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40 dark:border-pink-500/30",
  response_text: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 dark:border-indigo-500/30",
  function_call: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40 dark:border-orange-500/30",
  rate_limits: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40 dark:border-slate-500/30",
  unknown: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/40 dark:border-gray-500/30",
};

// Delta events that should be aggregated when consecutive
export const DELTA_EVENT_TYPES = [
  "response.audio.delta",
  "response.audio_transcript.delta",
  "response.text.delta",
  "response.function_call_arguments.delta",
  "conversation.item.input_audio_transcription.delta",
] as const;

// Events that mark conversation phase transitions
export const PHASE_EVENTS = {
  SPEECH_START: "input_audio_buffer.speech_started",
  SPEECH_STOP: "input_audio_buffer.speech_stopped",
  RESPONSE_START: "response.created",
  FUNCTION_CALL: "response.function_call_arguments.done",
} as const;
