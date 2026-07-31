"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Sparkles, AlertCircle } from "lucide-react";

interface JsonTreeViewProps {
  data: any;
}

export function JsonTreeView({ data }: JsonTreeViewProps) {
  // 1. Handle Empty or Blank Editor Data
  if (data === null || data === undefined || (typeof data === "string" && !data.trim())) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] p-6 text-center select-none bg-card border border-border rounded-md text-muted-foreground space-y-2">
        <Sparkles className="w-8 h-8 text-primary/40 animate-pulse" />
        <span className="font-semibold text-xs text-foreground">Interactive Tree View</span>
        <span className="text-[11px] text-muted-foreground max-w-xs">
          Start typing or paste JSON into the source editor to inspect interactive tree nodes.
        </span>
      </div>
    );
  }

  let parsed: any;
  let parseError: string | null = null;

  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch (e: any) {
      parsed = null;
      parseError = e.message || "Invalid JSON syntax";
    }
  } else {
    parsed = data;
  }

  // 2. Handle Syntax Parse Errors gracefully
  if (parseError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] p-6 text-center select-none bg-card border border-border rounded-md text-muted-foreground space-y-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="font-bold text-xs text-foreground block">Waiting for Valid JSON</span>
          <div className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 max-w-sm truncate">
            {parseError}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground max-w-xs">
          Complete the JSON structure in the source editor to generate the interactive tree view.
        </span>
      </div>
    );
  }

  return (
    <div className="font-mono text-xs p-4 select-none overflow-y-auto max-h-full h-full bg-card border border-border rounded-md text-foreground">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-muted-foreground text-[10px]">
        <span>JSON TREE VIEW</span>
        <span>ROOT LEVEL</span>
      </div>
      <TreeNode value={parsed} name="" isLast={true} depth={0} />
    </div>
  );
}

interface TreeNodeProps {
  name: string;
  value: any;
  isLast: boolean;
  depth: number;
}

function TreeNode({ name, value, isLast, depth }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard error
    }
  };

  const type = typeof value;
  const isObject = value !== null && type === "object";
  const isArray = Array.isArray(value);

  // Padding left according to depth
  const indentStyle = { paddingLeft: `${depth * 16}px` };

  // Render Object or Array
  if (isObject) {
    const keys = Object.keys(value);
    const count = keys.length;
    const bracketOpen = isArray ? "[" : "{";
    const bracketClose = isArray ? "]" : "}";

    return (
      <div className="w-full">
        {/* Header line for collapsing */}
        <div
          onClick={toggleOpen}
          style={indentStyle}
          className="group flex items-center gap-1.5 py-1 hover:bg-accent/40 rounded cursor-pointer select-none transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}

          {name && (
            <span className="font-semibold text-foreground mr-1">
              "{name}":
            </span>
          )}

          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
            {isArray ? `array [${count}]` : `object {${count}}`}
          </span>

          <span className="text-muted-foreground/60">{bracketOpen}</span>

          {!isOpen && (
            <span className="text-muted-foreground/80 font-bold ml-1">...</span>
          )}

          {/* Inline controls */}
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-muted-foreground hover:text-foreground rounded transition-opacity cursor-pointer"
            title="Copy branch JSON"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Children nodes if expanded */}
        {isOpen && (
          <div className="w-full">
            {isArray
              ? value.map((item: any, idx: number) => (
                  <TreeNode
                    key={idx}
                    name={idx.toString()}
                    value={item}
                    isLast={idx === count - 1}
                    depth={depth + 1}
                  />
                ))
              : keys.map((key: string, idx: number) => (
                  <TreeNode
                    key={key}
                    name={key}
                    value={value[key]}
                    isLast={idx === count - 1}
                    depth={depth + 1}
                  />
                ))}

            {/* Bracket close line */}
            <div style={indentStyle} className="py-0.5 pl-5 text-muted-foreground/60">
              {bracketClose}
              {!isLast && ","}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Primitive Value
  const renderPrimitive = () => {
    if (value === null) {
      return <span className="text-muted-foreground font-bold">null</span>;
    }
    if (type === "string") {
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    }
    if (type === "number") {
      return <span className="text-amber-600 dark:text-amber-400">{value}</span>;
    }
    if (type === "boolean") {
      return (
        <span
          className={`font-semibold ${
            value ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {value ? "true" : "false"}
        </span>
      );
    }
    return <span className="text-foreground">{String(value)}</span>;
  };

  return (
    <div
      style={indentStyle}
      className="flex items-center gap-1.5 py-1 pl-5 hover:bg-accent/40 rounded select-text transition-colors"
    >
      <span className="font-semibold text-foreground">"{name}":</span>
      {renderPrimitive()}
      {!isLast && <span className="text-muted-foreground">,</span>}
    </div>
  );
}
