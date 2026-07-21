"use client";

import React, { useState, useEffect } from "react";
import {
  Code,
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Folder,
  File,
  ArrowLeft,
  Loader2,
  FileCode,
  Info,
  Layers,
  Globe
} from "lucide-react";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { inferEntityNameFromJson } from "@/lib/ai/generators/api-generator/parser";

interface ApiClientGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editorContent: string;
  isDark: boolean;
}

interface GeneratedFile {
  name: string;
  content: string;
  language: string;
}

export function ApiClientGeneratorModal({
  isOpen,
  onClose,
  editorContent,
  isDark
}: ApiClientGeneratorModalProps) {
  // Input settings
  const [inputType, setInputType] = useState<"json" | "rest" | "openapi">("json");
  const [inputVal, setInputVal] = useState("");
  const [language, setLanguage] = useState<"typescript" | "javascript">("typescript");
  const [httpClient, setHttpClient] = useState<"axios" | "fetch">("axios");
  const [queryLibrary, setQueryLibrary] = useState<"react-query" | "tanstack-query">("tanstack-query");
  const [entityName, setEntityName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  // Prepopulate JSON input and infer dynamic Entity Name if content is present
  useEffect(() => {
    if (isOpen) {
      let isValidJson = false;
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(editorContent);
        isValidJson = true;
      } catch (e) {
        // Not valid JSON
      }

      if (isValidJson) {
        setInputType("json");
        setInputVal(editorContent);
        const targetObj = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
        const inferred = inferEntityNameFromJson(targetObj, parsedJson);
        setEntityName(inferred !== "Entity" ? inferred : "");
      } else {
        setInputType("rest");
        setInputVal("GET /api/employees\nGET /api/employees/:id\nPOST /api/employees\nPUT /api/employees/:id\nDELETE /api/employees/:id");
        setEntityName("Employee");
      }
      
      setCustomInstructions("");
      setGeneratedFiles([]);
      setActiveFileIndex(0);
      setError("");
      setWarning("");
    }
  }, [isOpen, editorContent]);

  if (!isOpen) return null;

  // Generate action
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setWarning("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "api-generator",
          inputType,
          inputVal,
          language,
          httpClient,
          queryLibrary,
          entityName: entityName.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
          prompt: "generate api client" // unused but required by api validator
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed with status code ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.files && Array.isArray(data.files)) {
        setGeneratedFiles(data.files);
        setActiveFileIndex(0);
        if (data.warning) {
          setWarning(data.warning);
        }
      } else {
        throw new Error("No files returned from the generator API");
      }
    } catch (err: any) {
      console.error("API client generation error:", err);
      setError(err.message || "Failed to generate SDK Client");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy single file contents
  const handleCopyFile = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Download individual file
  const handleDownloadFile = (file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download ZIP of all files
  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      const folderName = `api-client-${(entityName.trim() || "entity").toLowerCase()}`;
      const folder = zip.folder(folderName);

      if (folder) {
        generatedFiles.forEach(file => {
          folder.file(file.name, file.content);
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP file:", err);
      setError("Failed to package files into ZIP archives.");
    }
  };

  const activeFile = generatedFiles[activeFileIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-accent/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Generate API Client SDK
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">AI Powered</span>
              </h2>
              <p className="text-xs text-muted-foreground">Instantly construct production-ready Axios/Fetch services and Query hooks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* CONFIGURATION / FORM VIEW */}
          {generatedFiles.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  {error}
                </div>
              )}

              {/* 1. Input Type Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">1. Input Type</label>
                <div className="flex bg-accent/40 p-1 rounded-lg gap-1 border border-border/50 max-w-md">
                  {(["json", "rest", "openapi"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setInputType(type);
                        if (type === "rest" && !inputVal.includes("GET")) {
                          setInputVal("GET /api/employees\nPOST /api/employees\nDELETE /api/employees/:id");
                        } else if (type === "json" && editorContent) {
                          setInputVal(editorContent);
                        } else if (type === "openapi") {
                          setInputVal(JSON.stringify({
                            swagger: "2.0",
                            info: { title: "Sample API", version: "1.0.0" },
                            paths: { "/api/employees": { get: { summary: "Retrieve employees" } } }
                          }, null, 2));
                        }
                      }}
                      className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${
                        inputType === type
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "json" ? "JSON Response" : type === "rest" ? "REST Endpoint" : "OpenAPI / Swagger"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Raw Input value */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">
                  {inputType === "json" ? "2. Paste Raw JSON" : inputType === "rest" ? "2. List Endpoints (Method /path)" : "2. Paste OpenAPI JSON"}
                </label>
                <textarea
                  id="api-client-generator-input"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full h-40 p-3 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-indigo-500/50 resize-none transition-colors"
                  placeholder={
                    inputType === "json"
                      ? '{\n  "id": 1,\n  "name": "Naveen"\n}'
                      : "GET /api/employees\nPOST /api/employees"
                  }
                />
              </div>

              {/* Grid Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Entity Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">Entity Name (Optional)</label>
                  <input
                    id="api-client-generator-entity-name"
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="e.g., Employee"
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <p className="text-[10px] text-muted-foreground">Sets names for interfaces (e.g. Employee) and hooks (e.g. useEmployee)</p>
                </div>

                {/* Target Language */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">Language</label>
                  <div className="flex bg-accent/40 p-1 rounded-lg gap-1 border border-border/50">
                    {(["typescript", "javascript"] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          language === lang ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang === "typescript" ? "TypeScript (Strict)" : "JavaScript (ESM)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HTTP Client */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">HTTP Client</label>
                  <div className="flex bg-accent/40 p-1 rounded-lg gap-1 border border-border/50">
                    {(["axios", "fetch"] as const).map(client => (
                      <button
                        key={client}
                        onClick={() => setHttpClient(client)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          httpClient === client ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {client === "axios" ? "Axios Instance" : "Native Fetch wrapper"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* React Query v4 vs v5 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">Async Query Library</label>
                  <div className="flex bg-accent/40 p-1 rounded-lg gap-1 border border-border/50">
                    {(["react-query", "tanstack-query"] as const).map(lib => (
                      <button
                        key={lib}
                        onClick={() => setQueryLibrary(lib)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          queryLibrary === lib ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lib === "react-query" ? "React Query (v4)" : "TanStack Query (v5)"}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Custom Guidelines (AI prompt addition) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">Custom Prompt Guidelines (Optional)</label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Include bearer auth token headers, or add client side logging middleware"
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {/* Action Trigger */}
              <div className="pt-2 flex justify-end gap-3 border-t border-border">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-border hover:bg-accent rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="api-client-generator-submit"
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputVal.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Client...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate SDK Client</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            
            // GENERATED CODE PREVIEW / VIRTUAL EXPLORER VIEW
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
              
              {/* Virtual Explorer Sidebar */}
              <div className="w-full md:w-64 border-r border-border flex flex-col bg-accent/5 h-full shrink-0">
                <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Virtual Explorer</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                    {generatedFiles.length} files
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider block text-left pl-2.5 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>api-client SDK</span>
                  </div>
                  {generatedFiles.map((file, idx) => {
                    const isActive = idx === activeFileIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveFileIndex(idx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        <File className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-indigo-400"}`} />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar footer download zip */}
                <div className="p-3 border-t border-border bg-accent/10 shrink-0">
                  <button
                    onClick={handleDownloadZip}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All (ZIP)</span>
                  </button>
                </div>
              </div>

              {/* Code Preview View */}
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                
                {/* File actions */}
                <div className="px-5 py-2.5 border-b border-border flex items-center justify-between bg-accent/5 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-xs text-foreground truncate">{activeFile.name}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      ✏️ Live Editable
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyFile(activeFile.content, activeFileIndex)}
                      className="px-2.5 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Copy file contents"
                    >
                      {copiedIndex === activeFileIndex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadFile(activeFile)}
                      className="p-1.5 border border-border hover:bg-accent rounded-md transition-colors flex items-center justify-center cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Monaco Editor Code Preview (Editable) */}
                <div className="flex-1 relative overflow-hidden bg-background">
                  <Editor
                    height="100%"
                    language={activeFile.language}
                    value={activeFile.content}
                    onChange={(val) => {
                      if (val !== undefined) {
                        setGeneratedFiles(prev => {
                          const next = [...prev];
                          if (next[activeFileIndex]) {
                            next[activeFileIndex] = { ...next[activeFileIndex], content: val };
                          }
                          return next;
                        });
                      }
                    }}
                    theme={isDark ? "vs-dark" : "light"}
                    loading={
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground bg-background">
                        Loading preview...
                      </div>
                    }
                    options={{
                      readOnly: false,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      fontSize: 13,
                      fontFamily: "var(--font-mono), ui-monospace, monospace",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      lineNumbers: "on",
                      padding: { top: 12, bottom: 12 }
                    }}
                  />
                </div>

                {/* Staging Warning banner if fallback occurred */}
                {warning && (
                  <div className="px-5 py-2 bg-yellow-500/10 border-t border-yellow-500/20 text-yellow-500 text-[10px] font-semibold flex items-center gap-2 shrink-0">
                    <Info className="w-3.5 h-3.5" />
                    {warning}
                  </div>
                )}

                {/* Back to settings bar */}
                <div className="p-3 border-t border-border bg-accent/5 flex justify-between items-center shrink-0">
                  <button
                    onClick={() => setGeneratedFiles([])}
                    className="px-3.5 py-1.5 border border-border hover:bg-accent rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Settings</span>
                  </button>
                  <button
                    id="api-client-generator-done"
                    onClick={onClose}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>

              </div>

            </div>

          )}

        </div>

      </div>
    </div>
  );
}
