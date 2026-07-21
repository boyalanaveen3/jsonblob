"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAiStore, type Message, type AIContext } from "@/lib/store/aiStore";
import { usePlaygroundStore } from "@/lib/store/playgroundStore";
import {
  X,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  ChevronRight,
  Code2,
  FileCode,
  AlertTriangle,
  Terminal,
  Layers,
  Wand2,
} from "lucide-react";

interface AiAssistantPanelProps {
  module: "json" | "playground";
  content: string;
  language?: string;
  error?: string;
  activeFileName?: string;
  onInsertCode: (code: string) => void;
}

const JSON_SUGGESTIONS = [
  { label: "Explain JSON", prompt: "Explain this JSON data structure and summarize the keys/nesting levels in deep detail" },
  { label: "Validate JSON", prompt: "Validate this JSON and report any syntax or structural issues" },
  { label: "Fix Syntax", prompt: "Scan and resolve any JSON syntax errors, list what was wrong, and generate valid JSON" },
  { label: "Beautify JSON", prompt: "Beautify this JSON and format it with indentation" },
  { label: "Minify JSON", prompt: "Minify this JSON into a compact single-line payload" },
  { label: "TypeScript Interface", prompt: "Convert this JSON to a complete TypeScript interface with deep nested definitions" },
  { label: "JavaScript Types", prompt: "Generate JavaScript type definitions for this JSON payload" },
  { label: "JSON Schema", prompt: "Generate a JSON Schema for this object" },
  { label: "Generate Mock Data", prompt: "Generate realistic mock data for this JSON structure" },
  { label: "Flatten JSON", prompt: "Flatten this nested JSON into a single-level object" },
  { label: "Unflatten JSON", prompt: "Unflatten this flat JSON object back into a nested structure" },
  { label: "Compare JSON", prompt: "Compare this JSON with a sample object and highlight differences" },
  { label: "Merge JSON", prompt: "Merge this JSON with a sample object and produce the combined result" },
];

const PLAYGROUND_SUGGESTIONS = [
  { label: "Analyze Code", prompt: "Perform a comprehensive, deep code analysis and generate a structured report covering: summary, variables, functions, imports, classes/interfaces, execution flow, language features, complexity, bugs, optimizations, best practices, security, suggested comments, unit tests, a refactored version, and an overall quality score." },
  { label: "Explain Code", prompt: "Explain the active editor code in detail" },
  { label: "Find Bugs", prompt: "Scan this code for logical, compiler, or syntax bugs, and suggest fixes" },
  { label: "Optimize", prompt: "Suggest performance optimizations and refactored code for improved speed" },
  { label: "Explain Errors", prompt: "Analyze current compiler diagnostics/runtime errors and explain why they happened and how to fix them" },
  { label: "Generate Tests", prompt: "Generate unit tests for this code" },
  { label: "Add Comments", prompt: "Add professional inline documentation comments to this code" },
];

const SLASH_COMMANDS = [
  { command: "@code", label: "Active Code", description: "Reference active editor file content", icon: FileCode },
  { command: "@selection", label: "Selected Code", description: "Reference currently highlighted text", icon: Code2 },
  { command: "@errors", label: "Diagnostics", description: "Reference compiler or runtime errors", icon: AlertTriangle },
  { command: "@refactor", label: "Refactor Code", description: "Optimize performance and clean structure", icon: Wand2 },
  { command: "@test", label: "Generate Tests", description: "Create unit test suite for active code", icon: Layers },
  { command: "@docs", label: "Inline Comments", description: "Generate JSDoc and inline comments", icon: Terminal },
  { command: "@json", label: "JSON Schema", description: "Inspect or format JSON data payload", icon: Sparkles },
  { command: "@api", label: "Generate SDK", description: "Build Axios/Fetch client SDK hooks", icon: ChevronRight },
];

export function AiAssistantPanel({
  module,
  content,
  language,
  error,
  activeFileName: activeFileNameProp,
  onInsertCode,
}: AiAssistantPanelProps) {
  const { isOpen, messages, isLoading, setIsOpen, sendMessage, clearHistory } = useAiStore();
  const playgroundStore = usePlaygroundStore();
  const [input, setInput] = useState("");
  const [showCommandsMenu, setShowCommandsMenu] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const suggestions = module === "json" ? JSON_SUGGESTIONS : PLAYGROUND_SUGGESTIONS;

  // Active Tab details from Playground Store if available
  const activeTab = playgroundStore.tabs.find((t) => t.id === playgroundStore.activeTabId);
  const activeFileName = activeFileNameProp || activeTab?.title || (module === "json" ? "document.json" : "scratchpad.js");
  const activeLang = activeTab?.language || language || "javascript";
  const activeCompError = playgroundStore.compilationError || error;
  const activeRunError = playgroundStore.runtimeError;
  const activeConsoleLogs = playgroundStore.consoleLogs.join("\n");

  const getSelectedText = (): string | undefined => {
    if (typeof window !== "undefined" && (window as any).currentEditor) {
      const editor = (window as any).currentEditor;
      const selection = editor.getSelection();
      if (selection) {
        const text = editor.getModel().getValueInRange(selection);
        if (text && text.trim()) return text;
      }
    }
    return undefined;
  };

  const normalizePrompt = (rawPrompt: string) => {
    const commandPattern = /(^|\s)(@code|@selection|@errors|@json|@api|@test|@docs|@refactor)(?=\s|$)/gi;
    const commands = Array.from(rawPrompt.matchAll(commandPattern), (match) => match[2].toLowerCase());
    const sanitizedPrompt = rawPrompt
      .replace(commandPattern, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    const commandGuidance = commands
      .map((command) => {
        switch (command) {
          case "@code":
            return "Please focus on the active editor content.";
          case "@selection":
            return "Please focus on the selected code snippet.";
          case "@errors":
            return "Please investigate compiler or runtime errors and propose fixes.";
          case "@json":
            return "Please treat this as JSON data and help format or validate it.";
          case "@api":
            return "Please help design or explain the relevant API integration.";
          case "@test":
            return "Please generate or improve tests for this code.";
          case "@docs":
            return "Please add or improve documentation and inline comments.";
          case "@refactor":
            return "Please refactor the code for clarity and maintainability.";
          default:
            return "Please use the requested context.";
        }
      })
      .join(" ");

    const promptText = commandGuidance && sanitizedPrompt
      ? `${commandGuidance}\n\n${sanitizedPrompt}`.trim()
      : sanitizedPrompt || rawPrompt.trim();

    return promptText;
  };

  const handleSend = async (textToSend = input) => {
    if (!textToSend.trim() || isLoading) return;
    setInput("");
    setShowCommandsMenu(false);

    const selectedText = getSelectedText();
    const currentCode = activeTab?.content || content || "";

    const aiContext: AIContext = {
      editorCode: currentCode,
      selectedCode: selectedText,
      language: activeLang,
      activeFile: activeFileName,
      compilerErrors: activeCompError || undefined,
      runtimeErrors: activeRunError || undefined,
      consoleOutput: activeConsoleLogs || undefined,
    };

    const preparedPrompt = normalizePrompt(textToSend);

    await sendMessage(preparedPrompt, {
      module,
      aiContext,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("@") || lastWord.startsWith("/")) {
      setShowCommandsMenu(true);
      setCommandFilter(lastWord.toLowerCase());
    } else {
      setShowCommandsMenu(false);
    }
  };

  const selectCommand = (cmd: string) => {
    const words = input.split(/\s+/);
    words.pop(); // remove triggering prefix
    const newText = [...words, cmd].join(" ") + " ";
    setInput(newText);
    setShowCommandsMenu(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredCommands = SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(commandFilter) ||
      c.label.toLowerCase().includes(commandFilter)
  );

  const hasErrors = Boolean(activeCompError || activeRunError);

  return (
    <div className="w-80 md:w-96 border-l border-border bg-card/90 backdrop-blur-md flex flex-col h-full shrink-0 z-40 transition-all duration-300 relative shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-violet-600/5 via-indigo-600/5 to-transparent shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-violet-600/10 text-violet-500 animate-pulse shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-tight truncate">AI Assistant</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <span className="truncate">{activeFileName}</span>
              <span>•</span>
              <span className="uppercase text-violet-400 font-bold">{activeLang}</span>
              {hasErrors && (
                <>
                  <span>•</span>
                  <span className="text-red-400 font-semibold flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Error
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
            <h3 className="text-xs font-bold text-foreground mb-1">Developer AI Chat Assistant</h3>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mb-4 leading-relaxed">
              Ask any free-form questions or use quick actions. AI automatically reads your active file code & console output!
            </p>

            {/* Context Badge Info */}
            <div className="w-full mb-5 p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-left text-[10px] space-y-1">
              <div className="font-semibold text-violet-400 flex items-center gap-1">
                <FileCode className="w-3 h-3" />
                <span>Active Editor Context Loaded</span>
              </div>
              <p className="text-muted-foreground leading-tight">
                File: <span className="font-mono text-foreground">{activeFileName}</span> ({activeLang})
              </p>
              {hasErrors && (
                <p className="text-red-400 leading-tight flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Active diagnostics ready for AI auto-fix.
                </p>
              )}
            </div>

            <div className="w-full space-y-3">
              {module === "playground" ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider block text-left pl-1">
                      Primary Quick Action
                    </span>
                    <button
                      onClick={() => handleSend(suggestions[0].prompt)}
                      className="w-full text-left p-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 hover:from-violet-600/15 hover:to-indigo-600/15 hover:border-violet-500/50 text-xs font-bold transition-all flex items-center justify-between group cursor-pointer shadow-sm shadow-violet-500/5"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500 animate-pulse shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="text-foreground font-bold">Analyze Code</span>
                          <span className="text-[10px] text-muted-foreground font-normal mt-0.5">Run quality & complexity audit</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-violet-500 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider block text-left pl-1">
                      Quick actions
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {suggestions.slice(1).map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s.prompt)}
                          className="w-full text-left px-2.5 py-2 rounded-lg border border-border hover:border-violet-500/30 hover:bg-violet-500/5 text-[11px] font-medium transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate">{s.label}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block text-left pl-1">
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
                </>
              )}
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

      {/* Input Panel with Commands Menu */}
      <div className="p-3 border-t border-border bg-card shrink-0 relative">
        {/* Commands Autocomplete Menu */}
        {showCommandsMenu && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover/95 border border-border rounded-xl shadow-xl p-1.5 max-h-48 overflow-y-auto z-50 backdrop-blur-md">
            <div className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider border-b border-border/50 mb-1">
              Commands & Context Mention
            </div>
            {filteredCommands.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => selectCommand(item.command)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-violet-600/10 hover:text-violet-400 text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <IconComp className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-foreground font-mono">{item.command}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Action Pill Chips above input */}
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none shrink-0 mb-1">
          {(module === "playground" ? suggestions.slice(1) : suggestions.slice(0, 4)).map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.prompt)}
              className="px-2.5 py-1 text-[10px] font-medium border border-border hover:border-violet-500/40 hover:bg-violet-500/5 rounded-full whitespace-nowrap transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative flex items-center border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything or type @ for commands..."
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
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
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
  return renderContentWithDetails(text, onInsert);
}

function renderContentWithDetails(text: string, onInsert: (code: string) => void): React.ReactNode {
  if (!text.includes("<details>")) {
    return renderCodeAndMarkdown(text, onInsert);
  }

  const parts = text.split("</details>");
  return (
    <>
      {parts.map((p, pIdx) => {
        if (p.includes("<details>")) {
          const subParts = p.split("<details>");
          const before = subParts[0];
          const inside = subParts[1] || "";
          
          const summaryMatch = inside.match(/<summary>([\s\S]*?)<\/summary>/);
          const summary = summaryMatch ? summaryMatch[1] : "Details";
          const body = inside.replace(/<summary>[\s\S]*?<\/summary>/, "");
          
          return (
            <React.Fragment key={pIdx}>
              {before.trim() ? renderCodeAndMarkdown(before, onInsert) : null}
              <details open className="border border-border/80 rounded-lg p-2.5 bg-accent/10 transition-all open:bg-accent/20 my-2">
                <summary className="font-semibold text-xs text-foreground cursor-pointer select-none outline-none hover:text-violet-500 transition-colors">
                  {summary}
                </summary>
                <div className="mt-2 pl-2 text-[11px] leading-relaxed text-muted-foreground border-l border-border/60 space-y-2">
                  {renderCodeAndMarkdown(body, onInsert)}
                </div>
              </details>
            </React.Fragment>
          );
        } else {
          return p.trim() ? <React.Fragment key={pIdx}>{renderCodeAndMarkdown(p, onInsert)}</React.Fragment> : null;
        }
      })}
    </>
  );
}

function renderCodeAndMarkdown(text: string, onInsert: (code: string) => void): React.ReactNode {
  const parts = text.split("```");
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          // Code block
          const lines = part.split("\n");
          const language = lines[0].trim();
          const code = lines.slice(1).join("\n").trim();
          return (
            <AiCodeBlockCard key={index} language={language} code={code} onInsert={onInsert} />
          );
        } else {
          // Inline text & Markdown tables
          return part.trim() ? (
            <div key={index} className="space-y-2">
              {formatMarkdownText(part, onInsert)}
            </div>
          ) : null;
        }
      })}
    </>
  );
}

function formatMarkdownText(text: string, onInsert: (code: string) => void) {
  // Check for Markdown Table (contains | separators)
  if (text.includes("|") && text.includes("---")) {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const tableLines = lines.filter((l) => l.includes("|"));
    if (tableLines.length >= 2) {
      const headers = tableLines[0].split("|").map((h) => h.trim()).filter(Boolean);
      const rows = tableLines.slice(2).map((r) => r.split("|").map((c) => c.trim()).filter(Boolean));

      return (
        <div className="my-2 overflow-x-auto border border-border/60 rounded-lg">
          <table className="w-full text-[11px] border-collapse text-left">
            <thead className="bg-muted/40 border-b border-border/60">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="p-2 font-bold text-foreground">
                    {formatInlineBold(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-border/30 hover:bg-muted/10">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 text-muted-foreground">
                      {formatInlineBold(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  const paras = text.split("\n\n");
  return paras.map((para, pIdx) => {
    const trimmed = para.trim();
    if (!trimmed) return null;

    // Header Check
    if (trimmed.startsWith("####")) {
      return (
        <h5 key={pIdx} className="font-bold text-xs text-violet-400 mt-2">
          {trimmed.replace(/^####\s*/, "")}
        </h5>
      );
    }
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
  });
}

function formatInlineBold(text: string) {
  const parts = text.split("**");
  return parts.map((p, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} className="font-semibold text-foreground">{p}</strong>;
    }
    const subParts = p.split("`");
    return subParts.map((sub, sIdx) =>
      sIdx % 2 === 1 ? (
        <code key={sIdx} className="px-1 py-0.5 rounded bg-accent/50 font-mono text-[10px] text-violet-400 border border-border/50">
          {sub}
        </code>
      ) : (
        sub
      )
    );
  });
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

  const highlightedCode = renderHighlightedCode(code, language);

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
            className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors flex items-center gap-0.5 font-sans font-semibold text-[9px] cursor-pointer text-violet-400 hover:text-violet-300"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Insert</span>
          </button>
        </div>
      </div>
      {/* Code Area */}
      <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text bg-zinc-950/70">
        <code>{highlightedCode}</code>
      </pre>
    </div>
  );
}

function renderHighlightedCode(code: string, language: string) {
  const keywords = /\b(function|const|let|var|return|if|else|for|while|class|interface|type|import|from|new|async|await|true|false|null|undefined|public|private|protected|export|default|try|catch|throw|extends|implements|switch|case|break|continue)\b/;
  const strings = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/m;
  const numbers = /\b\d+(?:\.\d+)?\b/;
  const punctuation = /([{}()[\];,.])/;

  const parts: Array<{ text: string; className?: string }> = [];
  const combinedPattern = new RegExp(`(${strings.source}|${comments.source}|${keywords.source}|${numbers.source}|${punctuation.source})`, "gm");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: code.slice(lastIndex, match.index) });
    }

    const token = match[0];
    let className: string | undefined;

    if (strings.test(token)) {
      className = "text-amber-300";
    } else if (comments.test(token)) {
      className = "text-emerald-400";
    } else if (keywords.test(token)) {
      className = "text-sky-300";
    } else if (numbers.test(token)) {
      className = "text-fuchsia-300";
    } else if (punctuation.test(token)) {
      className = "text-zinc-400";
    }

    parts.push({ text: token, className });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < code.length) {
    parts.push({ text: code.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part.text}-${index}`} className={part.className}>
          {part.text}
        </span>
      ))}
    </>
  );
}
