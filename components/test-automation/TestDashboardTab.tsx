"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Plus,
  Sparkles,
  Smartphone,
  Globe,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface TestDashboardTabProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewProject: () => void;
}

export function TestDashboardTab({ onNavigateTab, onOpenNewProject }: TestDashboardTabProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [projRes, runsRes] = await Promise.all([
          fetch("/api/test-projects"),
          fetch("/api/test-runs"),
        ]);

        if (projRes.ok) setProjects(await projRes.json());
        if (runsRes.ok) setRuns(await runsRes.json());
      } catch (err) {
        console.error("Error loading test dashboard stats:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalProjects = projects.length;
  const webProjects = projects.filter((p) => p.projectType === "web" || p.projectType === "web_mobile").length;
  const mobileProjects = projects.filter((p) => p.projectType === "mobile" || p.projectType === "web_mobile").length;

  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.status === "passed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  const totalTestsExecuted = runs.reduce((acc, r) => acc + (parseInt(r.totalTests || "0", 10) || 0), 0);
  const totalPassedTests = runs.reduce((acc, r) => acc + (parseInt(r.passed || "0", 10) || 0), 0);

  const passRate = totalTestsExecuted > 0 ? Math.round((totalPassedTests / totalTestsExecuted) * 100) : 100;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background/50">
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-background border border-indigo-500/20 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Test Automation Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Unified Playwright & Maestro Testing
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Automated web UI & REST API testing powered by Playwright, mobile app verification via Maestro, AI test planning, failure diagnosis, and Cloudflare D1/R2 storage integration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenNewProject}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              New Project Upload
            </button>
            <button
              onClick={() => onNavigateTab("runs")}
              className="px-4 py-2.5 rounded-xl bg-card hover:bg-accent text-foreground font-semibold text-sm border border-border flex items-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              View Test Runs
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Projects */}
        <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col justify-between space-y-3 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Projects</span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{totalProjects}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-sky-400" /> {webProjects} Web</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-purple-400" /> {mobileProjects} Mobile</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Pass Rate */}
        <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Pass Rate</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">{passRate}%</span>
            <span className="text-xs font-medium text-muted-foreground">
              {totalPassedTests} / {totalTestsExecuted} tests passed
            </span>
          </div>
        </div>

        {/* Metric 3: Total Runs */}
        <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col justify-between space-y-3 hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Runs</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{totalRuns}</span>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {passedRuns}</span>
              <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> {failedRuns}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Cloudflare Hybrid Engine */}
        <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Infrastructure</span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" /> Cloudflare D1 + R2
            </span>
            <span className="text-xs text-muted-foreground">Isolated Runner Execution</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Test Runs & Project Quick Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Test Executions
              </h2>
              <p className="text-xs text-muted-foreground">Live run history and result metrics across projects</p>
            </div>
            <button
              onClick={() => onNavigateTab("runs")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading run history...</div>
          ) : runs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              No test runs executed yet. Trigger your first run from Projects or Test Suites!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Passed / Failed</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {runs.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-foreground">#{r.id.slice(0, 8)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.platform === "mobile" ? "bg-purple-500/10 text-purple-400" : "bg-sky-500/10 text-sky-400"
                        }`}>
                          {r.platform === "mobile" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          {r.platform === "mobile" ? "Maestro" : "Playwright"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === "passed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : r.status === "failed"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {r.status === "passed" && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === "failed" && <XCircle className="w-3 h-3" />}
                          {r.status === "queued" && <Clock className="w-3 h-3 animate-spin" />}
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        <span className="text-emerald-400 font-bold">{r.passed}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-400 font-bold">{r.failed}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {(parseInt(r.durationMs || "0", 10) / 1000).toFixed(1)}s
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigateTab("reports")}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Launch & Active Projects (1 Col) */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-purple-400" />
              Active Projects
            </h2>
            <button
              onClick={() => onNavigateTab("projects")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Projects <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-5 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg space-y-3">
              <p>No test projects registered.</p>
              <button
                onClick={onOpenNewProject}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                + Create Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigateTab("suites")}
                  className="p-3.5 rounded-lg border border-border bg-background/60 hover:bg-accent/50 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px] text-sky-400 truncate">{p.baseUrl || "localhost:3000"}</span>
                      <span>•</span>
                      <span>{p.framework || "Web"}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
