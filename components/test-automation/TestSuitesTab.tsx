"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  FolderTree,
  FileCode2,
  Plus,
  Play,
  Save,
  Sparkles,
  Check,
  Globe,
  Smartphone,
  Trash2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Wrench,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface TestSuitesTabProps {
  selectedProjectId?: string;
  onNavigateTab: (tab: string) => void;
}

export function TestSuitesTab({ selectedProjectId, onNavigateTab }: TestSuitesTabProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>(selectedProjectId || "");
  const [suites, setSuites] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Monaco Code & Editor state
  const [code, setCode] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // AI & Action state
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isTriggeringRun, setIsTriggeringRun] = useState(false);

  // Modals for creating Suite / Case
  const [isNewSuiteModal, setIsNewSuiteModal] = useState(false);
  const [isNewCaseModal, setIsNewCaseModal] = useState(false);
  const [suiteName, setSuiteName] = useState("");
  const [caseName, setCaseName] = useState("");
  const [casePlatform, setCasePlatform] = useState<"web" | "mobile">("web");
  const [caseType, setCaseType] = useState<"ui" | "api" | "e2e" | "negative">("ui");

  // Fetch initial Projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/test-projects");
        if (res.ok) {
          const list = (await res.json()) as any;
          setProjects(list);
          if (list.length > 0 && !currentProjectId) {
            setCurrentProjectId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Fetch Suites & Cases for current project
  useEffect(() => {
    if (!currentProjectId) return;
    async function loadSuitesAndCases() {
      try {
        setIsLoading(true);
        const [sRes, cRes] = await Promise.all([
          fetch(`/api/test-suites?projectId=${currentProjectId}`),
          fetch(`/api/test-cases?projectId=${currentProjectId}`),
        ]);

        if (sRes.ok) setSuites((await sRes.json()) as any);
        if (cRes.ok) {
          const loadedCases = (await cRes.json()) as any;
          setCases(loadedCases);
          if (loadedCases.length > 0) {
            setSelectedCase(loadedCases[0]);
            setCode(loadedCases[0].code || "");
          } else {
            setSelectedCase(null);
            setCode("// Select or create a test case to edit Playwright / Maestro script");
          }
        }
      } catch (err) {
        console.error("Error loading suites and cases:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSuitesAndCases();
  }, [currentProjectId]);

  const handleSelectCase = (tc: any) => {
    setSelectedCase(tc);
    setCode(tc.code || "");
    setAiMessage(null);
  };

  const handleSaveCode = async () => {
    if (!selectedCase) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/test-cases/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, platform: selectedCase.platform }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        // update local list
        setCases(cases.map((c) => (c.id === selectedCase.id ? { ...c, code } : c)));
      }
    } catch (err) {
      console.error("Save code error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suiteName.trim() || !currentProjectId) return;

    try {
      const res = await fetch("/api/test-suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, name: suiteName, platform: "web" }),
      });

      if (res.ok) {
        const newS = (await res.json()) as any;
        setSuites([...suites, newS]);
        setSuiteName("");
        setIsNewSuiteModal(false);
      }
    } catch (err) {
      console.error("Create suite error:", err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim() || !currentProjectId) return;

    const defaultCode = casePlatform === "mobile"
      ? `appId: com.example.app\n---\n- launchApp\n- assertVisible: "${caseName}"`
      : `import { test, expect } from '@playwright/test';\n\ntest('${caseName}', async ({ page }) => {\n  await page.goto('http://localhost:3000');\n});`;

    try {
      const res = await fetch("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          suiteId: suites[0]?.id || null,
          name: caseName,
          platform: casePlatform,
          testType: caseType,
          code: defaultCode,
        }),
      });

      if (res.ok) {
        const newC = (await res.json()) as any;
        setCases([...cases, newC]);
        setSelectedCase(newC);
        setCode(newC.code || defaultCode);
        setCaseName("");
        setIsNewCaseModal(false);
      }
    } catch (err) {
      console.error("Create case error:", err);
    }
  };

  const handleRunAllTests = async () => {
    if (!currentProjectId) return;
    setIsTriggeringRun(true);

    try {
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, platform: "web" }),
      });

      if (res.ok) {
        onNavigateTab("runs");
      }
    } catch (err) {
      console.error("Trigger run error:", err);
    } finally {
      setIsTriggeringRun(false);
    }
  };

  const handleAiExplain = async () => {
    if (!code) return;
    setIsAiLoading(true);
    setAiMessage(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain_sql", // AI provider route fallback reuse
          sql: code,
          userPrompt: "Explain the test assertions, step sequence, and DOM locator strategies used in this Playwright/Maestro script.",
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        setAiMessage(data.explanation || data.answer || "Test script validates page navigation and DOM elements.");
      }
    } catch (err) {
      setAiMessage("This script automates browser interaction using Playwright locator assertions.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Left Sidebar: Project Selector & Test Case Tree */}
      <div className="w-80 border-r border-border bg-card/40 flex flex-col h-full shrink-0">
        {/* Project Picker Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Project</label>
            <select
              value={currentProjectId}
              onChange={(e) => setCurrentProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-muted-foreground">Test Suites & Cases</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsNewSuiteModal(true)}
                className="p-1 rounded hover:bg-accent text-xs text-primary font-bold flex items-center gap-1 cursor-pointer"
                title="New Suite"
              >
                <Plus className="w-3.5 h-3.5" /> Suite
              </button>
              <button
                onClick={() => setIsNewCaseModal(true)}
                className="p-1 rounded bg-primary/10 hover:bg-primary/20 text-xs text-primary font-bold flex items-center gap-1 cursor-pointer"
                title="New Test Case"
              >
                <Plus className="w-3.5 h-3.5" /> Case
              </button>
            </div>
          </div>
        </div>

        {/* Suites Tree List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading test tree...</div>
          ) : cases.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg space-y-2">
              <p>No test cases created yet.</p>
              <button
                onClick={() => setIsNewCaseModal(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                + Add First Test
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                        : "bg-background/60 border-border/60 hover:bg-accent/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {c.platform === "mobile" ? (
                        <Smartphone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </div>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 uppercase shrink-0">
                      {c.testType}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Monaco Editor & Action Toolbar */}
      <div className="flex-1 flex flex-col h-full bg-background">
        {/* Editor Toolbar */}
        <div className="p-3 border-b border-border bg-card/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <FileCode2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold text-sm text-foreground truncate">
              {selectedCase ? selectedCase.name : "Select a Test Case"}
            </span>
            {selectedCase && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedCase.platform === "mobile" ? "bg-purple-500/10 text-purple-400" : "bg-sky-500/10 text-sky-400"
              }`}>
                {selectedCase.platform === "mobile" ? "Maestro YAML" : "Playwright Spec TS"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAiExplain}
              disabled={isAiLoading || !selectedCase}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Explain
            </button>

            <button
              onClick={handleSaveCode}
              disabled={isSaving || !selectedCase}
              className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-accent text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? "Saved to R2" : "Save Code"}
            </button>

            <button
              onClick={handleRunAllTests}
              disabled={isTriggeringRun || !currentProjectId}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isTriggeringRun ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run All Tests
            </button>
          </div>
        </div>

        {/* AI Message Banner */}
        {aiMessage && (
          <div className="p-3 bg-indigo-900/30 border-b border-indigo-500/20 text-indigo-300 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-indigo-200">AI Code Analysis:</strong>
                {aiMessage}
              </div>
            </div>
            <button onClick={() => setAiMessage(null)} className="text-indigo-400 font-bold hover:text-white">✕</button>
          </div>
        )}

        {/* Monaco Code Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={selectedCase?.platform === "mobile" ? "yaml" : "typescript"}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* New Suite Modal */}
      {isNewSuiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground">Create New Test Suite</h3>
            <form onSubmit={handleCreateSuite} className="space-y-3">
              <input
                type="text"
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
                placeholder="Suite Name (e.g. Navigation Suite)"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsNewSuiteModal(false)} className="px-3 py-1.5 rounded-lg border text-xs">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Create Suite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {isNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground">Create New Test Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Test Name *</label>
                <input
                  type="text"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="e.g. Verify Dashboard User Table"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Platform</label>
                  <select
                    value={casePlatform}
                    onChange={(e) => setCasePlatform(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                  >
                    <option value="web">Web (Playwright)</option>
                    <option value="mobile">Mobile (Maestro)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Test Type</label>
                  <select
                    value={caseType}
                    onChange={(e) => setCaseType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                  >
                    <option value="ui">UI Test</option>
                    <option value="api">API Test</option>
                    <option value="e2e">E2E Flow</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsNewCaseModal(false)} className="px-3 py-1.5 rounded-lg border text-xs">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Create Test Case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
