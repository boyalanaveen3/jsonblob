"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePlaygroundStore } from "@/lib/store/playgroundStore";
import { Toolbar } from "@/components/playground/Toolbar";
import { Sidebar } from "@/components/playground/Sidebar";
import { Console } from "@/components/playground/Console";
import MonacoEditor from "@/components/editor/MonacoEditor";
import { AiAssistantPanel } from "@/components/editor/AiAssistantPanel";

function PlaygroundContent() {
  const {
    tabs,
    activeTabId,
    theme,
    addTab,
    setActiveTabId,
    closeTab,
    updateActiveTabContent,
    updateActiveTabTitle,
    runActiveTabCode,
    compilationError,
    runtimeError,
  } = usePlaygroundStore();

  const activeError = compilationError || runtimeError;

  const searchParams = useSearchParams();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Parse shareable query links (?code=...&lang=...)
  useEffect(() => {
    const codeParam = searchParams.get("code");
    const langParam = searchParams.get("lang");
    if (codeParam) {
      const decodedCode = decodeURIComponent(codeParam);
      const decodedLang = langParam || "javascript";
      const sharedTabId = `shared-${Date.now()}`;
      const extension = 
        decodedLang === "typescript" ? "ts" : 
        decodedLang === "javascript" ? "js" : 
        decodedLang === "python" ? "py" :
        decodedLang === "java" ? "java" :
        "txt";
      
      addTab({
        id: sharedTabId,
        title: `shared-snippet.${extension}`,
        content: decodedCode,
        language: decodedLang,
      });

      // Clear search parameters from address bar to prevent reload re-triggering
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("lang");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, addTab]);

  // Support Keyboard shortcuts (Ctrl+Enter to run, Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runActiveTabCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runActiveTabCode]);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden text-foreground ${theme === "vs-dark" ? "dark bg-background" : "bg-muted/10"}`}>
      {/* Top Toolbar Header */}
      <Toolbar />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Left Explorer Sidebar */}
        <Sidebar />

        {/* Center Editor and Console */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Tab Selection Bar */}
          <div className="h-10 border-b border-border bg-muted/20 flex items-center overflow-x-auto shrink-0 scrollbar-none">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 h-full border-r border-border text-xs cursor-pointer select-none transition-all ${
                  activeTabId === tab.id
                    ? "bg-background text-foreground font-semibold border-t-2 border-t-violet-500"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span className="truncate max-w-[120px]">{tab.title}</span>
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" title="Unsaved changes" />
                )}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground font-sans text-[10px] shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Rename File Name Input */}
          {activeTab && (
            <div className="h-8 px-4 flex items-center gap-2 text-xs border-b border-border bg-muted/5 shrink-0">
              <span className="text-muted-foreground select-none">Active File:</span>
              <input
                type="text"
                value={activeTab.title}
                onChange={(e) => updateActiveTabTitle(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-xs w-64 text-foreground focus:bg-muted/30 rounded px-1.5 py-0.5 transition-colors"
                placeholder="filename.js"
              />
            </div>
          )}

          {/* Editor Container */}
          <div className="flex-1 min-h-0 relative">
            {activeTab ? (
              <MonacoEditor
                key={activeTab.id}
                value={activeTab.content}
                language={activeTab.language}
                onChange={(val) => updateActiveTabContent(val || "")}
                isDark={theme === "vs-dark"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground select-none">
                No active editor tabs. Open or create a file in the explorer.
              </div>
            )}
          </div>

          {/* Bottom Console logs */}
          <Console />
        </main>

        {/* AI Assistant Sidebar Panel */}
        <AiAssistantPanel
          module="playground"
          content={activeTab?.content || ""}
          language={activeTab?.language || "javascript"}
          error={activeError || undefined}
          onInsertCode={(code) => updateActiveTabContent(code)}
        />
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center text-sm text-muted-foreground bg-background">
          Loading workspace...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
