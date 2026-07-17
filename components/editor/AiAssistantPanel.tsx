"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAiStore, type Message } from "@/lib/store/aiStore";
import {
  X,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  ChevronRight,
} from "lucide-react";

interface AiAssistantPanelProps {
  module: "json" | "playground";
  content: string;
  language?: string;
  error?: string;
  onInsertCode: (code: string) => void;
}

const JSON_SUGGESTIONS = [
  { label: "Explain JSON", prompt: "Explain this JSON data structure and summarize the keys/nesting levels in deep detail" },
  { label: "Fix Syntax", prompt: "Scan and resolve any JSON syntax errors, list what was wrong, and generate valid JSON" },
  { label: "Explain Errors", prompt: "Look at any syntax errors in the JSON and explain why they occurred and how to fix them" },
  { label: "TypeScript Interface", prompt: "Convert this JSON to a complete TypeScript interface with deep nested definitions" },
  { label: "Python Class", prompt: "Convert this JSON to Python dataclasses representing the full structure" },
  { label: "Java POJO", prompt: "Convert this JSON to Java POJO classes representing the full structure" },
  { label: "JSON Schema", prompt: "Generate a JSON Schema for this object" },
];

const PLAYGROUND_SUGGESTIONS = [
  { label: "Explain Code", prompt: "Provide a deep explanation of how this code works, listing functions, imports, and variables" },
  { label: "Find Bugs", prompt: "Scan this code for logical, compiler, or syntax bugs, and suggest fixes" },
  { label: "Optimize", prompt: "Suggest performance optimizations and refactored code for improved speed" },
  { label: "Explain Errors", prompt: "Analyze current compiler diagnostics/runtime errors and explain why they happened and how to fix them" },
  { label: "Generate Tests", prompt: "Generate Jest unit tests for this code" },
  { label: "Add Comments", prompt: "Add detailed documentation comments and docstrings to this code" },
];

export function AiAssistantPanel({
  module,
  content,
  language,
  error,
  onInsertCode,
}: AiAssistantPanelProps) {
  const { isOpen, messages, isLoading, setIsOpen, sendMessage, clearHistory } = useAiStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const suggestions = module === "json" ? JSON_SUGGESTIONS : PLAYGROUND_SUGGESTIONS;

  const getSelectedText = (): string | undefined => {
    if (typeof window !== "undefined" && (window as any).currentEditor) {
      const editor = (window as any).currentEditor;
      const selection = editor.getSelection();
      if (selection) {
        return editor.getModel().getValueInRange(selection);
      }
    }
    return undefined;
  };

  const handleSend = async (textToSend = input) => {
    if (!textToSend.trim() || isLoading) return;
    setInput("");
    
    const selectedText = getSelectedText();
    await sendMessage(textToSend, {
      module,
      content,
      selectedText,
      language,
      error,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 md:w-96 border-l border-border bg-card/90 backdrop-blur-md flex flex-col h-full shrink-0 z-40 transition-all duration-300 relative shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-violet-600/5 via-indigo-600/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-violet-600/10 text-violet-500 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              title="Clear Conversation History"
              className="p-1.5 hover:bg-accent hover:text-accent-foreground text-muted-foreground rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            title="Close Assistant"
            className="p-1.5 hover:bg-accent hover:text-accent-foreground text-muted-foreground rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages & Suggestions Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4 my-auto">
            <Sparkles className="w-8 h-8 text-violet-500/40 mb-3 animate-bounce" />
            <h3 className="text-xs font-bold text-foreground mb-1">Developer AI Assistant</h3>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mb-6 leading-relaxed">
              Ask questions or use quick actions to explain, generate, or refactor code and JSON.
            </p>
            <div className="w-full space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block text-left mb-2 pl-1">
                Suggested Actions
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.prompt)}
                    className="w-full text-left p-2.5 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 text-xs font-medium transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>{s.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} onInsert={onInsertCode} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-accent/30 border border-border flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Panel */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        {messages.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none shrink-0 mb-1">
            {suggestions.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.prompt)}
                className="px-2.5 py-1 text-[10px] font-medium border border-border hover:border-violet-500/40 hover:bg-violet-500/5 rounded-full whitespace-nowrap transition-colors cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI assistant anything..."
            rows={1}
            className="w-full pl-3 pr-10 py-2.5 bg-transparent border-none outline-none resize-none text-xs leading-relaxed focus:ring-0"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-md transition-all shadow-md shadow-violet-500/10 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Markdown and Code Block Formatter Bubble
function ChatBubble({ msg, onInsert }: { msg: Message; onInsert: (code: string) => void }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
          isUser
            ? "bg-violet-600 text-white font-medium"
            : "bg-accent/40 border border-border/80 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="space-y-3">
            {formatAiResponse(msg.content, onInsert)}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAiResponse(text: string, onInsert: (code: string) => void) {
  const parts = text.split("```");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // Code block
      const lines = part.split("\n");
      const language = lines[0].trim();
      const code = lines.slice(1).join("\n").trim();
      return (
        <AiCodeBlockCard key={index} language={language} code={code} onInsert={onInsert} />
      );
    } else {
      // Inline formatting (paragraphs, lists, and headers)
      return (
        <div key={index} className="space-y-2">
          {part.split("\n\n").map((para, pIdx) => {
            const trimmed = para.trim();
            if (!trimmed) return null;

            // Header Check
            if (trimmed.startsWith("###")) {
              return (
                <h4 key={pIdx} className="font-bold text-sm text-foreground mt-2 border-b border-border/50 pb-1">
                  {trimmed.replace(/^###\s*/, "")}
                </h4>
              );
            }
            if (trimmed.startsWith("##")) {
              return (
                <h3 key={pIdx} className="font-bold text-base text-foreground mt-3">
                  {trimmed.replace(/^##\s*/, "")}
                </h3>
              );
            }

            // Unordered List Check
            if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
              return (
                <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1.5">
                  {trimmed.split("\n").map((li, lIdx) => (
                    <li key={lIdx}>
                      {formatInlineBold(li.replace(/^[-*]\s*/, ""))}
                    </li>
                  ))}
                </ul>
              );
            }

            return <p key={pIdx} className="leading-relaxed">{formatInlineBold(trimmed)}</p>;
          })}
        </div>
      );
    }
  });
}

function formatInlineBold(text: string) {
  const parts = text.split("**");
  return parts.map((p, idx) => (idx % 2 === 1 ? <strong key={idx} className="font-semibold text-foreground">{p}</strong> : p));
}

function AiCodeBlockCard({
  language,
  code,
  onInsert,
}: {
  language: string;
  code: string;
  onInsert: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-zinc-950 text-zinc-100 font-mono text-[11px] my-2 shadow-inner">
      {/* Code Card Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400">
        <span className="font-sans uppercase font-bold tracking-wider">{language || "code"}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onInsert(code)}
            title="Replace Editor Content"
            className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors flex items-center gap-0.5 font-sans font-semibold text-[9px] cursor-pointer"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Insert</span>
          </button>
        </div>
      </div>
      {/* Code Area */}
      <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text bg-zinc-950/70">
        <code>{code}</code>
      </pre>
    </div>
  );
}
