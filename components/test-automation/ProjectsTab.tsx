"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Upload,
  Sparkles,
  Globe,
  Smartphone,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  FileArchive,
  Loader2,
  Play,
  ArrowRight,
  ExternalLink,
  Code2,
} from "lucide-react";

interface ProjectsTabProps {
  onSelectProject: (projectId: string) => void;
  onNavigateTab: (tab: string) => void;
  isOpenNewModalInitially?: boolean;
}

export function ProjectsTab({ onSelectProject, onNavigateTab, isOpenNewModalInitially }: ProjectsTabProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(isOpenNewModalInitially || false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"web" | "mobile" | "web_mobile">("web");
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [environment, setEnvironment] = useState("development");
  const [zipFile, setZipFile] = useState<File | null>(null);

  // Status & Analysis
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/test-projects");
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("projectType", projectType);
      formData.append("baseUrl", baseUrl);
      formData.append("environment", environment);
      if (zipFile) {
        formData.append("file", zipFile);
      }

      const res = await fetch("/api/test-projects", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        setAnalysisResult(data.analysis);
        fetchProjects();

        // Automatically trigger AI test generation if project created successfully
        if (data.project?.id) {
          setIsGeneratingTests(true);
          try {
            await fetch(`/api/test-projects/${data.project.id}/generate-tests`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ baseUrl, prompt: "Generate full initial test suite coverage" }),
            });
          } catch (genErr) {
            console.warn("Auto test generation notice:", genErr);
          } finally {
            setIsGeneratingTests(false);
          }
        }
      } else {
        const err = (await res.json()) as any;
        setErrorMsg(err.error || "Failed to create project");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Project upload error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this test project and all associated suites/runs?")) {
      try {
        const res = await fetch(`/api/test-projects/${id}`, { method: "DELETE" });
        if (res.ok) fetchProjects();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.framework && p.framework.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background/50">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            Test Automation Projects
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage web (Playwright) & mobile (Maestro) testing projects and source archives
          </p>
        </div>

        <button
          onClick={() => {
            setAnalysisResult(null);
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project Upload
        </button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading test projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No test projects found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Upload a project source ZIP file or configure a project URL to generate Playwright & Maestro test suites automatically.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            Upload Project ZIP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                onSelectProject(p.id);
                onNavigateTab("suites");
              }}
              className="p-5 rounded-xl bg-card border border-border/70 hover:border-primary/50 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.projectType === "mobile"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}>
                    {p.projectType === "mobile" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {p.projectType === "mobile" ? "Maestro Mobile" : "Playwright Web"}
                  </span>

                  <button
                    onClick={(e) => handleDeleteProject(p.id, e)}
                    className="text-muted-foreground hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {p.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span className="truncate text-sky-400">{p.baseUrl || "localhost:3000"}</span>
                <span className="flex items-center gap-1 text-primary font-sans font-semibold text-xs group-hover:translate-x-1 transition-transform">
                  View Suites <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  New Project & Source ZIP Upload
                </h2>
                <p className="text-xs text-muted-foreground">
                  Upload project source archive or enter URL for AI static analysis
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!analysisResult ? (
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SaaS Dashboard Portal"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Target Framework / Type</label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="web">Web App (Playwright TS)</option>
                      <option value="mobile">Mobile App (Maestro YAML)</option>
                      <option value="web_mobile">Web + Mobile (Playwright & Maestro)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Application Base URL</label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:3000"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of application features..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary h-20 resize-none"
                  />
                </div>

                {/* ZIP File Uploader */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project Source ZIP File (Optional)</label>
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-background/40">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="zip-input"
                    />
                    <label htmlFor="zip-input" className="cursor-pointer space-y-2 block">
                      <FileArchive className="w-8 h-8 text-primary mx-auto" />
                      <div className="text-xs font-semibold text-foreground">
                        {zipFile ? zipFile.name : "Click to choose ZIP archive (<50MB)"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        ZIP structure is inspected safely (path traversal protected) to extract routes & components.
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-accent text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing & Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Create & Analyze Project
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Analysis Summary View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Project created and static analysis completed!
                </div>

                <div className="space-y-2 bg-background p-4 rounded-xl border border-border text-xs">
                  <div className="font-bold text-foreground text-sm">Analysis Results:</div>
                  <div><strong>Framework:</strong> {analysisResult.framework}</div>
                  <div><strong>Language:</strong> {analysisResult.language}</div>
                  <div><strong>Detected Routes:</strong> {analysisResult.routes?.join(", ") || "None"}</div>
                  <div><strong>Detected API Endpoints:</strong> {analysisResult.apiEndpoints?.join(", ") || "None"}</div>
                </div>

                {isGeneratingTests && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Engine generating Playwright & Maestro test suites...</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                  >
                    Done & View Suites
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
