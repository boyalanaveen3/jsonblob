"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Wrench,
  AlertTriangle,
  Code2,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";

interface TestReportsTabProps {
  selectedRunId?: string;
  onNavigateTab: (tab: string) => void;
}

export function TestReportsTab({ selectedRunId, onNavigateTab }: TestReportsTabProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string>(selectedRunId || "");
  const [runDetails, setRunDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Failure Analysis State
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<any | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [fixAppliedSuccess, setFixAppliedSuccess] = useState(false);

  // Fetch all runs
  useEffect(() => {
    async function loadRuns() {
      try {
        const res = await fetch("/api/test-runs");
        if (res.ok) {
          const list = (await res.json()) as any;
          setRuns(list);
          if (list.length > 0 && !currentRunId) {
            setCurrentRunId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching runs list:", err);
      }
    }
    loadRuns();
  }, []);

  // Fetch details for selected run
  useEffect(() => {
    if (!currentRunId) return;
    async function loadRunDetails() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/test-runs/${currentRunId}`);
        if (res.ok) {
          const data = await res.json();
          setRunDetails(data);
        }
      } catch (err) {
        console.error("Error fetching run details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRunDetails();
  }, [currentRunId]);

  const handleAnalyzeFailure = async (resultId: string) => {
    setIsDiagnosing(true);
    setAiDiagnosis(null);
    setFixAppliedSuccess(false);

    try {
      const res = await fetch(`/api/test-failures/${resultId}/analyze`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setAiDiagnosis(data);
      }
    } catch (err) {
      console.error("Failure diagnosis error:", err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleApplyFix = async (resultId: string) => {
    if (!aiDiagnosis?.fixedCode) return;
    setIsApplyingFix(true);

    try {
      const res = await fetch(`/api/test-failures/${resultId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixedCode: aiDiagnosis.fixedCode }),
      });

      if (res.ok) {
        setFixAppliedSuccess(true);
      }
    } catch (err) {
      console.error("Apply fix error:", err);
    } finally {
      setIsApplyingFix(false);
    }
  };

  const run = runDetails?.run;
  const results = runDetails?.results || [];
  const artifacts = runDetails?.artifacts || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background/50">
      {/* Run Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Test Execution Report & AI Diagnostics
          </h1>
          <p className="text-xs text-muted-foreground">
            Detailed test run metrics, failure root cause analysis, and AI automated code patching
          </p>
        </div>

        {runs.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground">Select Run:</label>
            <select
              value={currentRunId}
              onChange={(e) => setCurrentRunId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-mono font-bold text-foreground focus:outline-none"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id.slice(0, 8)} ({r.status.toUpperCase()} - {r.passed}P/{r.failed}F)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!runDetails || isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading report details...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Overview Banner */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Run Status</span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                  run.status === "passed"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {run.status === "passed" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {run.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Test Results</span>
              <div className="text-lg font-bold text-foreground">
                <span className="text-emerald-400">{run.passed} Passed</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-red-400">{run.failed} Failed</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Duration</span>
              <div className="text-lg font-bold font-mono text-foreground">
                {(parseInt(run.durationMs || "0", 10) / 1000).toFixed(2)}s
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Artifacts Stored</span>
              <div className="text-sm font-semibold text-sky-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                {artifacts.length} Artifacts in Cloudflare R2
              </div>
            </div>
          </div>

          {/* Execution Results List */}
          <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden space-y-3 p-5">
            <h2 className="text-base font-bold text-foreground">Test Case Breakdown</h2>

            <div className="space-y-3">
              {results.map((res: any) => {
                const isExpanded = expandedResultId === res.id;
                const isFail = res.status === "failed";

                return (
                  <div
                    key={res.id}
                    className={`rounded-xl border transition-all ${
                      isFail ? "border-red-500/30 bg-red-500/5" : "border-border bg-background/50"
                    }`}
                  >
                    <div
                      onClick={() => setExpandedResultId(isExpanded ? null : res.id)}
                      className="p-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 truncate">
                        {isFail ? (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="font-bold text-sm text-foreground truncate">{res.name}</div>
                          {res.errorMessage && (
                            <div className="text-xs text-red-400 truncate font-mono">{res.errorMessage}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs font-mono text-muted-foreground">
                        <span>{(parseInt(res.durationMs || "0", 10) / 1000).toFixed(2)}s</span>
                        {isFail && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedResultId(res.id);
                              handleAnalyzeFailure(res.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center gap-1.5 cursor-pointer border border-red-500/20"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Diagnose
                          </button>
                        )}
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded Drawer for Details & AI Fix */}
                    {isExpanded && (
                      <div className="p-4 border-t border-border/60 bg-background/80 space-y-4 text-xs">
                        {res.errorMessage && (
                          <div className="space-y-1">
                            <strong className="text-red-400 block font-semibold">Error Message:</strong>
                            <pre className="p-3 rounded-lg bg-card border border-border font-mono text-red-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                              {res.errorMessage}
                            </pre>
                          </div>
                        )}

                        {res.stackTrace && (
                          <div className="space-y-1">
                            <strong className="text-muted-foreground block font-semibold">Stack Trace:</strong>
                            <pre className="p-3 rounded-lg bg-card border border-border font-mono text-muted-foreground text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                              {res.stackTrace}
                            </pre>
                          </div>
                        )}

                        {/* AI Diagnosis Result Panel */}
                        {isDiagnosing ? (
                          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI Engine analyzing failure root cause and generating code patch...</span>
                          </div>
                        ) : (
                          aiDiagnosis && (
                            <div className="p-5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-indigo-400" />
                                  AI Root Cause Diagnosis ({aiDiagnosis.confidence}% Confidence)
                                </span>
                                {fixAppliedSuccess && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Fix Patch Applied
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1">
                                <strong className="text-indigo-200">Problem Summary:</strong>
                                <p className="text-indigo-300">{aiDiagnosis.problem}</p>
                              </div>

                              <div className="space-y-1">
                                <strong className="text-indigo-200">Root Cause:</strong>
                                <p className="text-indigo-300">{aiDiagnosis.rootCause}</p>
                              </div>

                              {aiDiagnosis.fixedCode && (
                                <div className="space-y-1">
                                  <strong className="text-indigo-200">Proposed Code Fix Patch:</strong>
                                  <pre className="p-3 rounded-lg bg-card border border-border font-mono text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                    {aiDiagnosis.fixedCode}
                                  </pre>
                                </div>
                              )}

                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => handleApplyFix(res.id)}
                                  disabled={isApplyingFix || fixAppliedSuccess}
                                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isApplyingFix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                                  {fixAppliedSuccess ? "Fix Applied to Test Case" : "Apply AI Fix Patch"}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
