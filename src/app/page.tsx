import { LogViewer } from "@/components/LogViewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenAI Realtime Log Visualizer",
  description: "Visualize and analyze OpenAI Realtime API events with session separation and structured JSON display",
};

export default function Home() {
  return <LogViewer />;
}
