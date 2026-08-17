"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Smartphone,
  RefreshCw,
  ArrowRight,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface TestRunsTabProps {
  onSelectRunForReport: (runId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function TestRunsTab({ onSelectRunForReport, onNavigateTab }: TestRunsTabProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isTriggering, setIsTriggering] = useState(false);

  const fetchRunsAndProjects = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const [rRes, pRes] = await Promise.all([
        fetch("/api/test-runs"),
        fetch("/api/test-projects"),
      ]);

      if (pRes.ok) setProjects((await pRes.json()) as any);
      if (rRes.ok) {
        const loadedRuns = (await rRes.json()) as any;
        setRuns(loadedRuns);
      }
    } catch (err) {
      console.error("Error fetching runs:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRunsAndProjects();
    const interval = setInterval(() => {
      fetchRunsAndProjects(true);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerRun = async () => {
    try {
      const targetProj = selectedProjectId || projects[0]?.id;
      if (!targetProj) return;

      setIsTriggering(true);
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetProj, platform: "web" }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.run) {
          setRuns((prev) => [data.run, ...prev.filter((r) => r.id !== data.run.id)]);
        }
        await fetchRunsAndProjects(true);
      }
    } catch (err) {
      console.error("Failed to trigger run:", err);
    } finally {
      setIsTriggering(false);
    }
  };

  const filteredRuns = selectedProjectId
    ? runs.filter((r) => r.projectId === selectedProjectId)
    : runs;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background/50">
      {/* Top Header & Trigger Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Test Execution Runs
          </h1>
          <p className="text-xs text-muted-foreground">
            Live execution status, runner daemon polling, and run history logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchRunsAndProjects(false)}
            className="p-2 rounded-xl bg-card border border-border hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh Runs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleTriggerRun}
            disabled={projects.length === 0 || isTriggering}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTriggering ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            {isTriggering ? "Launching Run..." : "Trigger Test Run"}
          </button>
        </div>
      </div>

      {/* Runs Table List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading test runs...</div>
      ) : filteredRuns.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-4">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No test runs recorded</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click &quot;Trigger Test Run&quot; above to launch Playwright or Maestro test suites.
            </p>
          </div>
          <button
            onClick={handleTriggerRun}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            Launch Run Now
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tests Passed / Total</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">#{r.id.slice(0, 8)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.platform === "mobile" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}>
                        {r.platform === "mobile" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {r.platform === "mobile" ? "Maestro" : "Playwright"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        r.status === "passed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : r.status === "failed"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {r.status === "passed" && <CheckCircle2 className="w-3 h-3" />}
                        {r.status === "failed" && <XCircle className="w-3 h-3" />}
                        {(r.status === "queued" || r.status === "running") && <Clock className="w-3 h-3 animate-spin" />}
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <span className="text-emerald-400 font-bold">{r.passed}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{r.totalTests || "0"}</span>
                      {parseInt(r.failed || "0", 10) > 0 && (
                        <span className="ml-2 text-red-400 font-bold">({r.failed} failed)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {(parseInt(r.durationMs || "0", 10) / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectRunForReport(r.id);
                          onNavigateTab("reports");
                        }}
                        className="px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
