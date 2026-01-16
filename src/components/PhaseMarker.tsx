"use client";

import { Mic, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseType } from "@/lib/group-events";

interface PhaseMarkerProps {
  type: PhaseType;
  className?: string;
}

const PHASE_CONFIG: Record<PhaseType, { icon: typeof Mic; label: string; color: string }> = {
  speech: {
    icon: Mic,
    label: "User Speaking",
    color: "text-amber-500 border-amber-500/30",
  },
  response: {
    icon: Bot,
    label: "AI Response",
    color: "text-emerald-500 border-emerald-500/30",
  },
  function_call: {
    icon: Zap,
    label: "Function Call",
    color: "text-orange-500 border-orange-500/30",
  },
};

export function PhaseMarker({ type, className }: PhaseMarkerProps) {
  const config = PHASE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 px-4",
        className
      )}
    >
      <div className={cn("flex items-center gap-2", config.color)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      <div className={cn("flex-1 h-px border-t border-dashed", config.color)} />
    </div>
  );
}
