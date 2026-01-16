"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface JsonViewerProps {
  data: unknown;
  initialExpanded?: boolean;
  className?: string;
  maxStringLength?: number;
}

export function JsonViewer({
  data,
  initialExpanded = false,
  className,
  maxStringLength = 100,
}: JsonViewerProps) {
  return (
    <div className={cn("font-mono text-sm", className)}>
      <JsonNode
        data={data}
        initialExpanded={initialExpanded}
        maxStringLength={maxStringLength}
        depth={0}
      />
    </div>
  );
}

interface JsonNodeProps {
  data: unknown;
  initialExpanded: boolean;
  maxStringLength: number;
  depth: number;
  keyName?: string;
}

function JsonNode({
  data,
  initialExpanded,
  maxStringLength,
  depth,
  keyName,
}: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded || depth < 1);
  const [copied, setCopied] = useState(false);

  const indent = depth * 16;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data === null) {
    return (
      <span className="json-null">
        {keyName && <span className="json-key">"{keyName}"</span>}
        {keyName && ": "}
        null
      </span>
    );
  }

  if (typeof data === "boolean") {
    return (
      <span className="json-boolean">
        {keyName && <span className="json-key">"{keyName}"</span>}
        {keyName && ": "}
        {data.toString()}
      </span>
    );
  }

  if (typeof data === "number") {
    return (
      <span className="json-number">
        {keyName && <span className="json-key">"{keyName}"</span>}
        {keyName && ": "}
        {data}
      </span>
    );
  }

  if (typeof data === "string") {
    const isLongString = data.length > maxStringLength;
    const [isStringExpanded, setIsStringExpanded] = useState(false);
    const displayValue =
      isLongString && !isStringExpanded
        ? data.slice(0, maxStringLength) + "..."
        : data;

    return (
      <span className="json-string">
        {keyName && <span className="json-key">"{keyName}"</span>}
        {keyName && ": "}
        <span className="whitespace-pre-wrap break-words">
          "{displayValue}"
        </span>
        {isLongString && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsStringExpanded(!isStringExpanded);
            }}
            className="text-xs ml-1 h-6 px-2"
          >
            {isStringExpanded ? "collapse" : `show all (${data.length} chars)`}
          </Button>
        )}
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <span>
          {keyName && <span className="json-key">"{keyName}"</span>}
          {keyName && ": "}
          []
        </span>
      );
    }

    return (
      <div>
        <span
          className="cursor-pointer hover:bg-muted/50 inline-flex items-center gap-1 rounded px-1 -ml-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {keyName && <span className="json-key">"{keyName}"</span>}
          {keyName && ": "}
          <span className="text-muted-foreground">
            [{isExpanded ? "" : `${data.length} items`}
          </span>
        </span>
        {isExpanded && (
          <div style={{ paddingLeft: indent + 16 }}>
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <JsonNode
                  data={item}
                  initialExpanded={initialExpanded}
                  maxStringLength={maxStringLength}
                  depth={depth + 1}
                />
                {index < data.length - 1 && ","}
              </div>
            ))}
          </div>
        )}
        {isExpanded && (
          <span style={{ paddingLeft: indent }} className="text-muted-foreground">
            ]
          </span>
        )}
        {!isExpanded && <span className="text-muted-foreground">]</span>}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <span>
          {keyName && <span className="json-key">"{keyName}"</span>}
          {keyName && ": "}
          {"{}"}
        </span>
      );
    }

    return (
      <div>
        <span
          className="cursor-pointer hover:bg-muted/50 inline-flex items-center gap-1 rounded px-1 -ml-1 group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {keyName && <span className="json-key">"{keyName}"</span>}
          {keyName && ": "}
          <span className="text-muted-foreground">
            {"{"}{isExpanded ? "" : `${entries.length} keys`}
          </span>
          {depth === 0 && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-muted rounded"
              title="Copy JSON"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </span>
        {isExpanded && (
          <div style={{ paddingLeft: indent + 16 }}>
            {entries.map(([key, value], index) => (
              <div key={key} className="py-0.5">
                <JsonNode
                  data={value}
                  keyName={key}
                  initialExpanded={initialExpanded}
                  maxStringLength={maxStringLength}
                  depth={depth + 1}
                />
                {index < entries.length - 1 && ","}
              </div>
            ))}
          </div>
        )}
        {isExpanded && (
          <span style={{ paddingLeft: indent }} className="text-muted-foreground">
            {"}"}
          </span>
        )}
        {!isExpanded && <span className="text-muted-foreground">{"}"}</span>}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
