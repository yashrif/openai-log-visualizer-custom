"use client";

import { useRef, useState } from "react";
import { parseLogFile } from "@/lib/parse-log";
import { SessionCard } from "@/components/SessionCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Session } from "@/lib/types";
import { Virtuoso } from "react-virtuoso";
import { FileText, ClipboardPaste, Trash2, UploadCloud } from "lucide-react";

export function LogViewer() {
  const [logContent, setLogContent] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    if (!logContent.trim()) return;
    const parsed = parseLogFile(logContent);
    setSessions(parsed);
    setIsParsed(true);
  };

  const handleClear = () => {
    setLogContent("");
    setSessions([]);
    setIsParsed(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLogContent(text);
    } catch {
      // Clipboard access denied, user can still paste manually
    }
  };

  const handleFileRead = (file: File) => {
    const isAllowed = /\.((log)|(txt))$/i.test(file.name);
    if (!isAllowed) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setLogContent(text);
      setSessions([]);
      setIsParsed(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileRead(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      setIsDragging(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileRead(file);
    event.target.value = "";
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const totalEvents = sessions.reduce((sum, s) => sum + s.events.length, 0);
  const shouldVirtualizeSessions = sessions.length > 30;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/3">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                OpenAI Realtime Log Visualizer
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize and analyze OpenAI Realtime API events
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isParsed && (
                <>
                  <Badge variant="outline" className="text-sm px-3 py-1.5">
                    {sessions.length} Sessions
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1.5">
                    {totalEvents.toLocaleString()} Events
                  </Badge>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-10">
        {!isParsed ? (
          /* Log Input Section */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 mb-5">
                <FileText className="w-9 h-9 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Paste Your Logs</h2>
              <p className="text-muted-foreground text-base">
                Paste your OpenAI Realtime API logs below to visualize and analyze them
              </p>
            </div>

            <div className="space-y-5">
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-[2rem] border ${
                  isDragging ? "border-primary/60 ring-2 ring-primary/20 bg-primary/5" : "border-border bg-card"
                } transition-all duration-300`}
              >
                <textarea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="Paste your OpenAI Realtime logs here...&#10;&#10;Example:&#10;2024-01-15T10:30:00.000Z - {&quot;type&quot;: &quot;session.created&quot;, ...}"
                  className="w-full h-72 p-5 rounded-[2rem] bg-transparent text-foreground
                           placeholder:text-muted-foreground resize-none font-mono text-sm border-none
                           focus:outline-none"
                />

                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={handlePaste}
                    className="p-2.5 rounded-[1rem] bg-muted/80 hover:bg-muted transition-all duration-300"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    <span>Drag & drop .log or .txt files, or choose a file</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={triggerFilePicker}
                      className="px-3 py-2 rounded-[1rem] bg-muted/80 hover:bg-muted transition-all duration-300 text-xs font-medium"
                    >
                      Browse files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".log,.txt"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleParse}
                  disabled={!logContent.trim()}
                  className="px-8 py-3 rounded-[1.5rem] bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium
                           hover:from-primary/95 hover:to-primary/85 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Visualize Logs
                </button>
                {logContent && (
                  <button
                    onClick={handleClear}
                    className="px-5 py-3 rounded-[1.5rem] bg-muted/80 text-muted-foreground font-medium
                             hover:bg-destructive/15 hover:text-destructive
                             transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          /* No events found */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/80 mb-5">
              <span className="text-3xl">📄</span>
            </div>
            <h2 className="text-2xl font-semibold mb-3">No Events Found</h2>
            <p className="text-muted-foreground mb-6 text-base">
              The log content contains no valid events.
            </p>
            <button
              onClick={handleClear}
              className="px-6 py-2.5 rounded-[1.5rem] bg-muted/80 text-muted-foreground font-medium
                       hover:bg-muted transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        ) : (
          /* Parsed Events View */
          <div className="space-y-7">
            {/* Back button and Legend */}
            <div className="flex flex-wrap items-center justify-between gap-5">
              <button
                onClick={handleClear}
                className="px-5 py-2.5 rounded-[1.5rem] bg-muted/80 text-muted-foreground font-medium
                         hover:bg-muted transition-all duration-300 text-sm"
              >
                ← Paste New Logs
              </button>

              <div className="flex flex-wrap gap-2.5 items-center text-xs">
                <span className="text-muted-foreground font-medium mr-1">Categories:</span>
                <Badge variant="outline" className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 dark:border-violet-500/25">session</Badge>
                <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/25">conversation</Badge>
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/25">audio_buffer</Badge>
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/25">response</Badge>
                <Badge variant="outline" className="bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30 dark:border-pink-500/25">audio</Badge>
                <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/25">function_call</Badge>
                <Badge variant="outline" className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 dark:border-red-500/25">error</Badge>
              </div>
            </div>

            {/* Sessions */}
            {shouldVirtualizeSessions ? (
              <Virtuoso
                useWindowScroll
                increaseViewportBy={{ top: 320, bottom: 640 }}
                data={sessions}
                overscan={300}
                computeItemKey={(index, session) => session.id ?? `session-${index}`}
                itemContent={(index, session) => (
                  <div className="pb-6">
                    <SessionCard
                      session={session}
                      defaultExpanded={index === 0}
                    />
                  </div>
                )}
              />
            ) : (
              sessions.map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  defaultExpanded={index === 0}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-auto">
        <div className="container mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>
            OpenAI Realtime API Log Visualizer • Built with Next.js & shadcn/ui
          </p>
        </div>
      </footer>
    </div>
  );
}
