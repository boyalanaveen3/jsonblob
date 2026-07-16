"use client";

import { usePlaygroundStore } from "@/lib/store/playgroundStore";
import { Terminal, Trash2, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle, AlertCircle, FileCode, Play } from "lucide-react";
import { useState } from "react";

export function Console() {
  const { 
    consoleLogs, 
    consoleStatus, 
    executionTimeMs, 
    clearConsole,
    compilationError,
    runtimeError,
    warnings,
    consoleOutput 
  } = usePlaygroundStore();

  const [activeTab, setActiveTab] = useState<"all" | "stdout" | "compile" | "runtime" | "warn">("all");

  const compileErrorsCount = compilationError ? compilationError.split("\n").filter(Boolean).length : 0;
  const runtimeErrorsCount = runtimeError ? 1 : 0;
  const warningsCount = warnings ? warnings.length : 0;
  const stdoutCount = consoleOutput ? consoleOutput.length : 0;

  return (
    <div className="h-64 border-t border-border bg-card flex flex-col shrink-0 font-mono">
      {/* Console Top Toolbar */}
      <div className="h-10 border-b border-border bg-muted/40 px-4 flex items-center justify-between shrink-0 select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 h-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "all"
                ? "border-primary text-foreground bg-muted/20"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>All Logs</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-normal">
              {consoleLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("stdout")}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "stdout"
                ? "border-primary text-foreground bg-muted/20"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="w-3 h-3 text-emerald-500 fill-emerald-500/20" />
            <span>Console Output</span>
            {stdoutCount > 0 && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-normal">
                {stdoutCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("compile")}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "compile"
                ? "border-destructive text-foreground bg-muted/20"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-destructive" />
            <span>Compiler Errors</span>
            {compileErrorsCount > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                {compileErrorsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("runtime")}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "runtime"
                ? "border-destructive text-foreground bg-muted/20"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span>Runtime Errors</span>
            {runtimeErrorsCount > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                {runtimeErrorsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("warn")}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "warn"
                ? "border-amber-500 text-foreground bg-muted/20"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Warnings</span>
            {warningsCount > 0 && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold">
                {warningsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right side metrics and actions */}
        <div className="flex items-center gap-3 shrink-0">
          {consoleStatus === "running" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </div>
          )}

          {consoleStatus === "success" && (
            <div className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Success ({executionTimeMs}ms)</span>
            </div>
          )}

          {consoleStatus === "error" && (
            <div className="flex items-center gap-1.5 text-xs text-destructive font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Failed ({executionTimeMs}ms)</span>
            </div>
          )}

          {consoleStatus === "idle" && consoleLogs.length > 0 && (
            <span className="text-xs text-muted-foreground">Cleared</span>
          )}

          <div className="h-3 w-px bg-border" />

          {/* Action: Clear Console */}
          <button
            onClick={clearConsole}
            title="Clear Console Output"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Logs Print Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 bg-background/30 text-xs">
        {activeTab === "all" && (
          consoleLogs.length === 0 ? (
            <div className="text-muted-foreground/60 italic text-center py-8">
              Console clean. Press the "Run" button to execute scripts.
            </div>
          ) : (
            consoleLogs.map((log, idx) => {
              let className = "text-muted-foreground";
              if (log.startsWith("[ERROR]")) {
                className = "text-destructive font-semibold";
              } else if (log.startsWith("[WARN]")) {
                className = "text-amber-500 font-semibold";
              } else if (log.startsWith("Execution timed out")) {
                className = "text-rose-500 font-bold bg-rose-500/10 px-2 py-1.5 rounded border border-rose-500/20";
              } else if (log.startsWith("Executing script...")) {
                className = "text-blue-400 italic";
              }
              return (
                <pre key={idx} className={`whitespace-pre-wrap ${className}`}>
                  {log}
                </pre>
              );
            })
          )
        )}

        {activeTab === "stdout" && (
          consoleOutput.length === 0 ? (
            <div className="text-muted-foreground/40 italic text-center py-8">
              No console output.
            </div>
          ) : (
            consoleOutput.map((log, idx) => (
              <pre key={idx} className="whitespace-pre-wrap text-muted-foreground">
                {log}
              </pre>
            ))
          )
        )}

        {activeTab === "compile" && (
          !compilationError ? (
            <div className="text-muted-foreground/40 italic text-center py-8">
              No compilation errors.
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-destructive font-semibold">
              {compilationError}
            </pre>
          )
        )}

        {activeTab === "runtime" && (
          !runtimeError ? (
            <div className="text-muted-foreground/40 italic text-center py-8">
              No runtime errors.
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-destructive font-bold bg-destructive/5 p-3 rounded border border-destructive/15">
              {runtimeError}
            </pre>
          )
        )}

        {activeTab === "warn" && (
          warnings.length === 0 ? (
            <div className="text-muted-foreground/40 italic text-center py-8">
              No warnings.
            </div>
          ) : (
            warnings.map((warn, idx) => (
              <pre key={idx} className="whitespace-pre-wrap text-amber-500 font-semibold">
                {warn}
              </pre>
            ))
          )
        )}
      </div>
    </div>
  );
}
