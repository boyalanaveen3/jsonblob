"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useWorkspaceStore,
  type ApiRequestItem,
  type ApiHistoryItem,
  type ApiCollection,
} from "@/lib/store/workspaceStore";
import {
  parsePostmanCollection,
  parseOpenApiSpec,
  exportAsPostmanCollection,
} from "@/lib/utils/apiImportExport";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  History,
  FolderPlus,
  Globe,
  Clock,
  Layers,
  Check,
  AlertCircle,
  Download,
  Upload,
  Code,
  Sliders,
  FileJson,
  Edit3,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  FileCode,
  Folder,
  FolderOpen,
  Share2,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background">
      Loading Response Editor...
    </div>
  ),
});

interface ApiStudioViewProps {
  isDark: boolean;
  onSaveAsBlob: (title: string, content: string) => void;
}

export function ApiStudioView({ isDark, onSaveAsBlob }: ApiStudioViewProps) {
  const {
    apiHistory,
    apiCollections,
    envVariables,
    activeApiRequest,
    setActiveApiRequest,
    updateActiveApiRequest,
    addApiHistory,
    clearApiHistory,
    addApiCollection,
    renameApiCollection,
    deleteApiCollection,
    saveRequestToCollection,
    addRequestToCollection,
    deleteRequestFromCollection,
    updateRequestInCollection,
    importApiCollections,
    addEnvVariable,
    updateEnvVariable,
    deleteEnvVariable,
    addActivity,
  } = useWorkspaceStore();

  // Sidebar Tab Switcher: collections | history | environments
  const [sidebarTab, setSidebarTab] = useState<"collections" | "history" | "environments">("collections");
  const [searchQuery, setSearchQuery] = useState("");

  // Request & Response UI tabs
  const [activeReqTab, setActiveReqTab] = useState<"params" | "headers" | "auth" | "body">("params");
  const [activeResTab, setActiveResTab] = useState<"pretty" | "raw" | "headers">("pretty");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    timeMs: number;
    sizeBytes: number;
    body: string;
    headers: Record<string, string>;
  } | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Modals state
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColNameInput, setNewColNameInput] = useState("");
  const [newColDescInput, setNewColDescInput] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"file" | "postman" | "openapi" | "curl">("postman");
  const [importRawText, setImportRawText] = useState("");
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const [showSaveColModal, setShowSaveColModal] = useState(false);
  const [selectedColId, setSelectedColId] = useState("");
  const [newSaveColName, setNewSaveColName] = useState("");
  const [reqSaveTitle, setReqSaveTitle] = useState("");

  const [showEnvModal, setShowEnvModal] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  // Collapsed state for collections folders in sidebar
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  // Query Parameters table state parsed from activeApiRequest.url
  const queryParams = useMemo(() => {
    try {
      const urlObj = new URL(
        activeApiRequest.url.startsWith("http") ? activeApiRequest.url : `http://localhost${activeApiRequest.url.startsWith("/") ? "" : "/"}${activeApiRequest.url}`
      );
      const params: Array<{ key: string; value: string; enabled: boolean }> = [];
      urlObj.searchParams.forEach((val, key) => {
        params.push({ key, value: val, enabled: true });
      });
      return params;
    } catch {
      return [];
    }
  }, [activeApiRequest.url]);

  const toggleColCollapse = (colId: string) => {
    setCollapsedCols((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  // Environment variables replacement
  const replaceEnvVars = (str: string): string => {
    let replaced = str;
    envVariables.forEach((variable) => {
      if (variable.enabled && variable.key) {
        replaced = replaced.replaceAll(`{{${variable.key}}}`, variable.value);
      }
    });
    return replaced;
  };

  // URL & Query Params sync helpers
  const handleUpdateQueryParam = (index: number, key: string, val: string) => {
    try {
      const isFull = activeApiRequest.url.startsWith("http");
      const base = isFull ? activeApiRequest.url : `http://localhost${activeApiRequest.url.startsWith("/") ? "" : "/"}${activeApiRequest.url}`;
      const urlObj = new URL(base);

      // Rebuild params
      const currentParams: Array<[string, string]> = [];
      urlObj.searchParams.forEach((v, k) => currentParams.push([k, v]));

      if (index < currentParams.length) {
        currentParams[index] = [key, val];
      } else {
        currentParams.push([key, val]);
      }

      // Clear & set
      const newSearch = new URLSearchParams();
      currentParams.forEach(([k, v]) => {
        if (k) newSearch.append(k, v);
      });

      const newUrl = isFull
        ? `${urlObj.origin}${urlObj.pathname}${newSearch.toString() ? `?${newSearch.toString()}` : ""}`
        : `${activeApiRequest.url.split("?")[0]}${newSearch.toString() ? `?${newSearch.toString()}` : ""}`;

      updateActiveApiRequest({ url: newUrl });
    } catch {
      // Fallback append
      updateActiveApiRequest({ url: `${activeApiRequest.url}?${key}=${val}` });
    }
  };

  const handleAddQueryParam = () => {
    const hasQuery = activeApiRequest.url.includes("?");
    const newUrl = activeApiRequest.url + (hasQuery ? "&key=value" : "?key=value");
    updateActiveApiRequest({ url: newUrl });
  };

  const handleRemoveQueryParam = (index: number) => {
    try {
      const isFull = activeApiRequest.url.startsWith("http");
      const base = isFull ? activeApiRequest.url : `http://localhost${activeApiRequest.url.startsWith("/") ? "" : "/"}${activeApiRequest.url}`;
      const urlObj = new URL(base);

      const currentParams: Array<[string, string]> = [];
      urlObj.searchParams.forEach((v, k) => currentParams.push([k, v]));

      const filtered = currentParams.filter((_, i) => i !== index);
      const newSearch = new URLSearchParams();
      filtered.forEach(([k, v]) => newSearch.append(k, v));

      const newUrl = isFull
        ? `${urlObj.origin}${urlObj.pathname}${newSearch.toString() ? `?${newSearch.toString()}` : ""}`
        : `${activeApiRequest.url.split("?")[0]}${newSearch.toString() ? `?${newSearch.toString()}` : ""}`;

      updateActiveApiRequest({ url: newUrl });
    } catch {
      // ignore
    }
  };

  // Header table handlers
  const handleAddHeader = () => {
    const headers = [...activeApiRequest.headers, { key: "", value: "", enabled: true }];
    updateActiveApiRequest({ headers });
  };

  const handleUpdateHeader = (index: number, updates: Partial<ApiRequestItem["headers"][0]>) => {
    const headers = activeApiRequest.headers.map((h, i) => (i === index ? { ...h, ...updates } : h));
    updateActiveApiRequest({ headers });
  };

  const handleRemoveHeader = (index: number) => {
    const headers = activeApiRequest.headers.filter((_, i) => i !== index);
    updateActiveApiRequest({ headers });
  };

  const handleAddCommonHeader = (key: string, value: string) => {
    const existingIdx = activeApiRequest.headers.findIndex((h) => h.key.toLowerCase() === key.toLowerCase());
    if (existingIdx >= 0) {
      handleUpdateHeader(existingIdx, { value, enabled: true });
    } else {
      updateActiveApiRequest({
        headers: [...activeApiRequest.headers, { key, value, enabled: true }],
      });
    }
  };

  // Form Data handlers
  const handleAddFormData = () => {
    const formData = [...activeApiRequest.formData, { key: "", value: "", enabled: true }];
    updateActiveApiRequest({ formData });
  };

  const handleUpdateFormData = (index: number, updates: Partial<ApiRequestItem["formData"][0]>) => {
    const formData = activeApiRequest.formData.map((f, i) => (i === index ? { ...f, ...updates } : f));
    updateActiveApiRequest({ formData });
  };

  const handleRemoveFormData = (index: number) => {
    const formData = activeApiRequest.formData.filter((_, i) => i !== index);
    updateActiveApiRequest({ formData });
  };

  // Create Collection Handler
  const handleCreateCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColNameInput.trim()) return;
    const newId = addApiCollection(newColNameInput, newColDescInput);
    addActivity("api_send", `Created Collection: ${newColNameInput}`);
    setNewColNameInput("");
    setNewColDescInput("");
    setShowCreateColModal(false);
  };

  // Import Action Handler
  const handleImportSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importRawText.trim()) return;

    let imported: ApiCollection[] = [];

    if (importTab === "postman" || importTab === "file") {
      imported = parsePostmanCollection(importRawText);
      if (imported.length === 0) {
        // Fallback try OpenAPI
        imported = parseOpenApiSpec(importRawText);
      }
    } else if (importTab === "openapi") {
      imported = parseOpenApiSpec(importRawText);
    } else if (importTab === "curl") {
      // Parse single curl command into a request inside a collection
      const curlString = importRawText;
      const methodMatch = curlString.match(/-X\s+([A-Z]+)/i) || curlString.match(/--request\s+([A-Z]+)/i);
      const method = methodMatch ? (methodMatch[1].toUpperCase() as any) : "GET";
      const urlMatch =
        curlString.match(/"(https?:\/\/[^"]+)"/) ||
        curlString.match(/'(https?:\/\/[^']+)'/) ||
        curlString.match(/(https?:\/\/\S+)/);
      const url = urlMatch ? urlMatch[1] : "https://api.github.com";

      const headers: ApiRequestItem["headers"] = [];
      const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/g;
      let match;
      while ((match = headerRegex.exec(curlString)) !== null) {
        const parts = match[1].split(":");
        if (parts.length >= 2) {
          headers.push({
            key: parts[0].trim(),
            value: parts.slice(1).join(":").trim(),
            enabled: true,
          });
        }
      }

      const bodyMatch = curlString.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]+?)['"]/);
      const body = bodyMatch ? bodyMatch[1] : "";

      imported = [
        {
          id: crypto.randomUUID(),
          name: "cURL Import",
          description: "Imported from cURL command",
          requests: [
            {
              id: crypto.randomUUID(),
              name: `${method} ${url}`,
              method,
              url,
              headers,
              auth: { type: "none" },
              bodyType: body ? "json" : "none",
              body: body || "{\n  \n}",
              formData: [],
            },
          ],
        },
      ];
    }

    if (imported.length > 0) {
      importApiCollections(imported);
      addActivity("api_send", `Imported ${imported.length} collection(s) (${imported[0].name})`);
      setImportRawText("");
      setImportFileName(null);
      setShowImportModal(false);
    } else {
      alert("Could not parse the provided import data. Please verify the JSON schema or format.");
    }
  };

  // Handle File upload input for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportRawText(content);
      }
    };
    reader.readAsText(file);
  };

  // Export Collection Handler
  const handleExportCollection = (col: ApiCollection) => {
    const jsonOutput = exportAsPostmanCollection(col);
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${col.name.replace(/\s+/g, "_")}.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Send request execution
  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponse(null);
    setErrorInfo(null);

    const start = performance.now();
    const finalUrl = replaceEnvVars(activeApiRequest.url);
    const method = activeApiRequest.method;

    // Headers construction
    const headersInit: Record<string, string> = {};
    activeApiRequest.headers.forEach((h) => {
      if (h.enabled && h.key) {
        headersInit[h.key] = replaceEnvVars(h.value);
      }
    });

    // Auth construction
    if (activeApiRequest.auth.type === "bearer" && activeApiRequest.auth.bearerToken) {
      headersInit["Authorization"] = `Bearer ${replaceEnvVars(activeApiRequest.auth.bearerToken)}`;
    } else if (activeApiRequest.auth.type === "basic" && activeApiRequest.auth.basicUser) {
      const credentials = btoa(`${activeApiRequest.auth.basicUser}:${activeApiRequest.auth.basicPass || ""}`);
      headersInit["Authorization"] = `Basic ${credentials}`;
    } else if (activeApiRequest.auth.type === "apikey" && activeApiRequest.auth.apiKeyName) {
      headersInit[activeApiRequest.auth.apiKeyName] = replaceEnvVars(activeApiRequest.auth.apiKeyValue || "");
    }

    // Body construction
    let bodyInit: any = undefined;
    if (method !== "GET") {
      if (activeApiRequest.bodyType === "json") {
        bodyInit = replaceEnvVars(activeApiRequest.body);
        if (!headersInit["Content-Type"]) {
          headersInit["Content-Type"] = "application/json";
        }
      } else if (activeApiRequest.bodyType === "form") {
        const fd = new URLSearchParams();
        activeApiRequest.formData.forEach((f) => {
          if (f.enabled && f.key) {
            fd.append(f.key, replaceEnvVars(f.value));
          }
        });
        bodyInit = fd.toString();
        headersInit["Content-Type"] = "application/x-www-form-urlencoded";
      } else if (activeApiRequest.bodyType === "raw") {
        bodyInit = replaceEnvVars(activeApiRequest.body);
      }
    }

    try {
      const res = await fetch(finalUrl, {
        method,
        headers: headersInit,
        body: bodyInit,
      });

      const text = await res.text();
      const end = performance.now();
      const timeMs = Math.round(end - start);
      const sizeBytes = new Blob([text]).size;

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      // Automatically pretty-print JSON response if valid JSON string
      let formattedText = text;
      try {
        const parsed = JSON.parse(text);
        formattedText = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw text if not valid JSON
      }

      setResponse({
        status: res.status,
        timeMs,
        sizeBytes,
        body: formattedText,
        headers: resHeaders,
      });

      addApiHistory({
        ...activeApiRequest,
        statusCode: res.status,
        duration: timeMs,
        responseBody: formattedText,
        responseHeaders: resHeaders,
      });
      addActivity("api_send", `Dispatched ${method} to ${finalUrl.slice(0, 40)}`);
    } catch (err: any) {
      const end = performance.now();
      const timeMs = Math.round(end - start);
      const isCors = err.message?.includes("Failed to fetch") || err.message?.includes("CORS");

      const fallbackBody = JSON.stringify(
        {
          error: isCors ? "CORS Policy Restriction" : "Network Connection Error",
          message: err.message || "Failed to execute fetch request.",
          suggestion: isCors
            ? "Browsers block cross-origin requests without Access-Control-Allow-Origin headers. Try testing endpoint CORS policies or testing public APIs like https://api.github.com/users/google."
            : "Check endpoint server state and URL spelling.",
          echo: {
            url: finalUrl,
            method,
            headers: headersInit,
          },
        },
        null,
        2
      );

      setErrorInfo(isCors ? "CORS Policy Block" : "Network Error");
      setResponse({
        status: isCors ? 0 : 503,
        timeMs,
        sizeBytes: fallbackBody.length,
        body: fallbackBody,
        headers: { "content-type": "application/json" },
      });

      addApiHistory({
        ...activeApiRequest,
        statusCode: isCors ? 0 : 503,
        duration: timeMs,
        responseBody: fallbackBody,
        responseHeaders: { "content-type": "application/json" },
      });
      addActivity("api_send", `Failed API ${method} request to ${finalUrl.slice(0, 30)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // cURL Export
  const getCurlCommand = (): string => {
    const finalUrl = replaceEnvVars(activeApiRequest.url);
    const method = activeApiRequest.method;
    let cmd = `curl -X ${method} "${finalUrl}"`;

    activeApiRequest.headers.forEach((h) => {
      if (h.enabled && h.key) {
        cmd += ` \\\n  -H "${h.key}: ${replaceEnvVars(h.value)}"`;
      }
    });

    if (activeApiRequest.auth.type === "bearer" && activeApiRequest.auth.bearerToken) {
      cmd += ` \\\n  -H "Authorization: Bearer ${replaceEnvVars(activeApiRequest.auth.bearerToken)}"`;
    }

    if (method !== "GET" && activeApiRequest.bodyType === "json" && activeApiRequest.body) {
      cmd += ` \\\n  -d '${replaceEnvVars(activeApiRequest.body).replace(/'/g, "'\\''")}'`;
    }

    return cmd;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
  };

  // Save Request to collection submit
  const handleSaveToColSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let colId = selectedColId;

    if (colId === "new" && newSaveColName.trim()) {
      colId = addApiCollection(newSaveColName);
    }

    if (!colId) return;

    saveRequestToCollection(colId, {
      ...activeApiRequest,
      name: reqSaveTitle.trim() || activeApiRequest.name || `${activeApiRequest.method} ${activeApiRequest.url}`,
    });

    setNewSaveColName("");
    setReqSaveTitle("");
    setShowSaveColModal(false);
    addActivity("api_send", `Saved Request to Collection`);
  };

  // Save Response Body as JSON Blob SaaS
  const handleSaveResponseAsBlob = () => {
    if (!response || !response.body) return;
    try {
      const parsed = JSON.parse(response.body);
      const formatted = JSON.stringify(parsed, null, 2);
      onSaveAsBlob(`API Response [${activeApiRequest.method}]`, formatted);
    } catch {
      onSaveAsBlob(`API Response [${activeApiRequest.method}]`, response.body);
    }
  };

  // Prettify JSON Body
  const handlePrettifyBody = () => {
    try {
      const parsed = JSON.parse(activeApiRequest.body);
      updateActiveApiRequest({ body: JSON.stringify(parsed, null, 2) });
    } catch (e: any) {
      alert(`Invalid JSON format: ${e.message}`);
    }
  };

  // Filter collections and requests
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return apiCollections;
    const q = searchQuery.toLowerCase();
    return apiCollections
      .map((col) => {
        const matchesColName = col.name.toLowerCase().includes(q);
        const matchingRequests = col.requests.filter(
          (req) => (req.name || "").toLowerCase().includes(q) || req.url.toLowerCase().includes(q) || req.method.toLowerCase().includes(q)
        );
        if (matchesColName || matchingRequests.length > 0) {
          return {
            ...col,
            requests: matchesColName ? col.requests : matchingRequests,
          };
        }
        return null;
      })
      .filter(Boolean) as ApiCollection[];
  }, [apiCollections, searchQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground h-full relative select-none">
      {/* ================= POSTMAN STYLE TOP TOOLBAR ================= */}
      <header className="h-12 border-b border-border bg-card/60 px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-primary">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>API Studio</span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Quick Actions */}
          <button
            onClick={() => {
              setActiveApiRequest({
                id: crypto.randomUUID(),
                name: "New Request",
                method: "GET",
                url: "https://api.github.com/users/google",
                headers: [{ key: "Accept", value: "application/json", enabled: true }],
                auth: { type: "none" },
                bodyType: "none",
                body: "{\n  \n}",
                formData: [],
              });
            }}
            className="px-2.5 py-1 bg-primary text-primary-foreground hover:opacity-95 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Create New HTTP Request"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>

          <button
            onClick={() => setShowCreateColModal(true)}
            className="px-2.5 py-1 bg-card border border-border hover:bg-accent text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Create New Collection Folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>Create Collection</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1 bg-card border border-border hover:bg-accent text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Import Postman Collection, OpenAPI, or cURL"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span>Import</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Environments button */}
          <button
            onClick={() => setShowEnvModal(true)}
            className="px-2.5 py-1 border border-border hover:bg-accent text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            <span>Environments ({envVariables.filter((e) => e.enabled).length})</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= LEFT SIDEBAR (Collections / History / Environments) ================= */}
        <aside className="w-72 border-r border-border bg-card/30 flex flex-col shrink-0">
          
          {/* Sidebar Nav Tabs */}
          <div className="flex border-b border-border bg-card/60 shrink-0">
            <button
              onClick={() => setSidebarTab("collections")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                sidebarTab === "collections"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Collections</span>
            </button>

            <button
              onClick={() => setSidebarTab("history")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                sidebarTab === "history"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>

          {/* Search Filter Bar */}
          <div className="p-2 border-b border-border bg-background/50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter collections & requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-background border border-border rounded text-xs outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Tab Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sidebarTab === "collections" && (
              <>
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Collections ({filteredCollections.length})</span>
                  <button
                    onClick={() => setShowCreateColModal(true)}
                    className="p-1 hover:text-primary rounded cursor-pointer"
                    title="Create Collection Folder"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filteredCollections.length === 0 ? (
                  <div className="text-center py-8 px-3 space-y-3">
                    <Folder className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <div className="text-xs text-muted-foreground">
                      No collections match search. Click below to create a collection folder.
                    </div>
                    <button
                      onClick={() => setShowCreateColModal(true)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Create Collection</span>
                    </button>
                  </div>
                ) : (
                  filteredCollections.map((col) => {
                    const isCollapsed = collapsedCols[col.id];
                    return (
                      <div key={col.id} className="rounded-lg border border-border/40 bg-card/20 overflow-hidden mb-1.5">
                        {/* Collection Header */}
                        <div
                          onClick={() => toggleColCollapse(col.id)}
                          className="flex items-center justify-between p-2 hover:bg-accent/50 cursor-pointer group transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            {isCollapsed ? (
                              <Folder className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500/10" />
                            ) : (
                              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500/20" />
                            )}
                            <span className="text-xs font-bold truncate text-foreground/90">{col.name}</span>
                            <span className="text-[10px] text-muted-foreground bg-accent/60 px-1.5 py-0.2 rounded-full">
                              {col.requests.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addRequestToCollection(col.id);
                              }}
                              className="p-1 hover:text-primary rounded cursor-pointer"
                              title="Add Request to Folder"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportCollection(col);
                              }}
                              className="p-1 hover:text-indigo-500 rounded cursor-pointer"
                              title="Export Postman Collection JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete collection "${col.name}"?`)) {
                                  deleteApiCollection(col.id);
                                }
                              }}
                              className="p-1 hover:text-red-500 rounded cursor-pointer"
                              title="Delete Collection"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Requests List under Collection */}
                        {!isCollapsed && (
                          <div className="pl-4 pr-1 pb-1 space-y-0.5 border-t border-border/20 bg-background/30">
                            {col.requests.length === 0 ? (
                              <div className="text-[11px] text-muted-foreground py-2 pl-2 italic flex items-center justify-between">
                                <span>No requests in folder</span>
                                <button
                                  onClick={() => addRequestToCollection(col.id)}
                                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            ) : (
                              col.requests.map((req) => {
                                const isActive = activeApiRequest.id === req.id;
                                return (
                                  <div
                                    key={req.id}
                                    onClick={() => setActiveApiRequest(req)}
                                    className={`group flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-all ${
                                      isActive
                                        ? "bg-primary/15 border-l-2 border-primary font-semibold text-primary"
                                        : "hover:bg-accent/60 text-foreground/80"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span
                                        className={`text-[9px] font-extrabold px-1 rounded uppercase shrink-0 ${
                                          req.method === "GET"
                                            ? "text-green-600 bg-green-500/10"
                                            : req.method === "POST"
                                            ? "text-blue-600 bg-blue-500/10"
                                            : req.method === "PUT"
                                            ? "text-amber-600 bg-amber-500/10"
                                            : "text-red-600 bg-red-500/10"
                                        }`}
                                      >
                                        {req.method}
                                      </span>
                                      <span className="truncate">{req.name || req.url}</span>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteRequestFromCollection(col.id, req.id);
                                      }}
                                      className="p-1 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Remove from collection"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {sidebarTab === "history" && (
              <>
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Execution History ({apiHistory.length})</span>
                  <button
                    onClick={clearApiHistory}
                    className="text-[9px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {apiHistory.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No request history recorded yet.
                  </div>
                ) : (
                  apiHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveApiRequest(item)}
                      className="p-2 rounded border border-border/30 hover:bg-accent text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            item.method === "GET"
                              ? "text-green-600 bg-green-500/10"
                              : item.method === "POST"
                              ? "text-blue-600 bg-blue-500/10"
                              : "text-amber-600 bg-amber-500/10"
                          }`}
                        >
                          {item.method}
                        </span>
                        <span className="truncate text-foreground/90 font-mono text-[11px]">
                          {item.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold font-mono ${
                            item.statusCode >= 200 && item.statusCode < 300
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {item.statusCode || "CORS"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{item.duration}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </aside>

        {/* ================= RIGHT WORKSPACE (HTTP Dispatcher & Response) ================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          
          {/* URL Input Toolbar */}
          <div className="p-3 border-b border-border bg-card/20 flex items-center gap-2 shrink-0 flex-wrap">
            {/* Method Select */}
            <select
              value={activeApiRequest.method}
              onChange={(e) => updateActiveApiRequest({ method: e.target.value as any })}
              className={`px-3 py-2 bg-background border border-border rounded text-xs font-black uppercase cursor-pointer ${
                activeApiRequest.method === "GET"
                  ? "text-green-600"
                  : activeApiRequest.method === "POST"
                  ? "text-blue-600"
                  : activeApiRequest.method === "PUT"
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            {/* URL Input */}
            <div className="flex-1 min-w-[240px] relative flex items-center">
              <input
                type="text"
                value={activeApiRequest.url}
                onChange={(e) => updateActiveApiRequest({ url: e.target.value })}
                placeholder="Enter HTTP Request URL e.g. http://localhost:5072/analytics/departmentanalytics"
                className="w-full text-xs font-mono bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendRequest}
              disabled={isLoading || !activeApiRequest.url.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:opacity-95 text-primary-foreground font-bold rounded text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send</span>
            </button>

            {/* Save Request Button */}
            <button
              onClick={() => {
                setReqSaveTitle(activeApiRequest.name || `${activeApiRequest.method} ${activeApiRequest.url}`);
                setShowSaveColModal(true);
              }}
              aria-label="Save Request"
              className="px-3 py-2 border border-border hover:bg-accent rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Save</span>
            </button>

            {/* Copy cURL Button */}
            <button
              onClick={handleCopyCurl}
              aria-label="Copy cURL command"
              className="px-2.5 py-2 border border-border hover:bg-accent rounded text-xs font-semibold cursor-pointer"
              title="Copy cURL command to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Request Section Tabs (Params, Headers, Auth, Body) */}
          <div className="h-9 border-b border-border bg-card/40 flex items-center px-4 gap-5 shrink-0">
            <button
              onClick={() => setActiveReqTab("params")}
              className={`text-xs font-bold h-full border-b-2 px-1 transition-all cursor-pointer ${
                activeReqTab === "params"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Params ({queryParams.length})
            </button>

            <button
              onClick={() => setActiveReqTab("headers")}
              className={`text-xs font-bold h-full border-b-2 px-1 transition-all cursor-pointer ${
                activeReqTab === "headers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Headers ({activeApiRequest.headers.filter((h) => h.enabled && h.key).length})
            </button>

            <button
              onClick={() => setActiveReqTab("auth")}
              className={`text-xs font-bold h-full border-b-2 px-1 transition-all cursor-pointer ${
                activeReqTab === "auth"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Authorization {activeApiRequest.auth.type !== "none" && "•"}
            </button>

            {activeApiRequest.method !== "GET" && (
              <button
                onClick={() => setActiveReqTab("body")}
                className={`text-xs font-bold h-full border-b-2 px-1 transition-all cursor-pointer ${
                  activeReqTab === "body"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Body {activeApiRequest.bodyType !== "none" && "•"}
              </button>
            )}
          </div>

          {/* Request Tab Contents Panel */}
          <div className="h-48 border-b border-border p-3 overflow-y-auto shrink-0 bg-background/50">
            
            {/* PARAMS TAB */}
            {activeReqTab === "params" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>URL Query Parameters</span>
                  <button
                    onClick={handleAddQueryParam}
                    className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Query Parameter
                  </button>
                </div>

                {queryParams.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-3 italic">
                    No query parameters. Click "Add Query Parameter" above to append params to the request URL.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {queryParams.map((param, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => handleUpdateQueryParam(idx, e.target.value, param.value)}
                          className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => handleUpdateQueryParam(idx, param.key, e.target.value)}
                          className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleRemoveQueryParam(idx)}
                          className="p-1 hover:text-red-500 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HEADERS TAB */}
            {activeReqTab === "headers" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>HTTP Request Headers</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddCommonHeader("Content-Type", "application/json")}
                      className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      + Content-Type
                    </button>
                    <button
                      onClick={() => handleAddCommonHeader("Authorization", "Bearer token_here")}
                      className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      + Authorization
                    </button>
                    <button
                      onClick={handleAddHeader}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Header
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {activeApiRequest.headers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => handleUpdateHeader(idx, { enabled: e.target.checked })}
                        className="rounded border-border w-3.5 h-3.5 text-primary"
                      />
                      <input
                        type="text"
                        placeholder="Header Key (e.g. Authorization)"
                        value={h.key}
                        onChange={(e) => handleUpdateHeader(idx, { key: e.target.value })}
                        className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="Header Value"
                        value={h.value}
                        onChange={(e) => handleUpdateHeader(idx, { value: e.target.value })}
                        className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => handleRemoveHeader(idx)}
                        className="p-1 hover:text-red-500 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUTHORIZATION TAB */}
            {activeReqTab === "auth" && (
              <div className="space-y-3 max-w-md">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Auth Type</label>
                  <select
                    value={activeApiRequest.auth.type}
                    onChange={(e) =>
                      updateActiveApiRequest({
                        auth: { ...activeApiRequest.auth, type: e.target.value as any },
                      })
                    }
                    className="text-xs bg-card border border-border rounded p-2 focus:outline-none cursor-pointer"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key Header</option>
                  </select>
                </div>

                {activeApiRequest.auth.type === "bearer" && (
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Bearer Token</label>
                    <input
                      type="password"
                      placeholder="Paste Bearer Token or {{token}}"
                      value={activeApiRequest.auth.bearerToken || ""}
                      onChange={(e) =>
                        updateActiveApiRequest({
                          auth: { ...activeApiRequest.auth, bearerToken: e.target.value },
                        })
                      }
                      className="text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {activeApiRequest.auth.type === "basic" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Username</label>
                      <input
                        type="text"
                        placeholder="Username"
                        value={activeApiRequest.auth.basicUser || ""}
                        onChange={(e) =>
                          updateActiveApiRequest({
                            auth: { ...activeApiRequest.auth, basicUser: e.target.value },
                          })
                        }
                        className="text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Password</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={activeApiRequest.auth.basicPass || ""}
                        onChange={(e) =>
                          updateActiveApiRequest({
                            auth: { ...activeApiRequest.auth, basicPass: e.target.value },
                          })
                        }
                        className="text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeApiRequest.auth.type === "apikey" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Key Header Name</label>
                      <input
                        type="text"
                        placeholder="X-API-Key"
                        value={activeApiRequest.auth.apiKeyName || ""}
                        onChange={(e) =>
                          updateActiveApiRequest({
                            auth: { ...activeApiRequest.auth, apiKeyName: e.target.value },
                          })
                        }
                        className="text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                      <input
                        type="password"
                        placeholder="Secret key value"
                        value={activeApiRequest.auth.apiKeyValue || ""}
                        onChange={(e) =>
                          updateActiveApiRequest({
                            auth: { ...activeApiRequest.auth, apiKeyValue: e.target.value },
                          })
                        }
                        className="text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BODY TAB */}
            {activeReqTab === "body" && activeApiRequest.method !== "GET" && (
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeApiRequest.bodyType === "none"}
                        onChange={() => updateActiveApiRequest({ bodyType: "none" })}
                        className="text-primary"
                      />
                      <span>none</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeApiRequest.bodyType === "json"}
                        onChange={() => updateActiveApiRequest({ bodyType: "json" })}
                        className="text-primary"
                      />
                      <span>JSON</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeApiRequest.bodyType === "form"}
                        onChange={() => updateActiveApiRequest({ bodyType: "form" })}
                        className="text-primary"
                      />
                      <span>x-www-form-urlencoded</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeApiRequest.bodyType === "raw"}
                        onChange={() => updateActiveApiRequest({ bodyType: "raw" })}
                        className="text-primary"
                      />
                      <span>raw</span>
                    </label>
                  </div>

                  {activeApiRequest.bodyType === "json" && (
                    <button
                      onClick={handlePrettifyBody}
                      className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      Prettify JSON
                    </button>
                  )}
                </div>

                {activeApiRequest.bodyType === "json" || activeApiRequest.bodyType === "raw" ? (
                  <textarea
                    value={activeApiRequest.body}
                    onChange={(e) => updateActiveApiRequest({ body: e.target.value })}
                    placeholder="Enter JSON body content..."
                    className="w-full h-32 text-xs font-mono bg-card border border-border rounded p-2 focus:outline-none focus:border-primary resize-none"
                  />
                ) : activeApiRequest.bodyType === "form" ? (
                  <div className="space-y-1.5">
                    {activeApiRequest.formData.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={f.enabled}
                          onChange={(e) => handleUpdateFormData(idx, { enabled: e.target.checked })}
                          className="rounded border-border w-3.5 h-3.5 text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Key"
                          value={f.key}
                          onChange={(e) => handleUpdateFormData(idx, { key: e.target.value })}
                          className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => handleUpdateFormData(idx, { value: e.target.value })}
                          className="text-xs font-mono bg-card border border-border rounded p-1.5 flex-1 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveFormData(idx)}
                          className="p-1 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddFormData}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Form Field
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-4 italic">No request body attached.</div>
                )}
              </div>
            )}
          </div>

          {/* ================= RESPONSE SECTION ================= */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Response Status Bar */}
            <div className="h-10 border-b border-border bg-card/30 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Response</span>
                
                {response && (
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded ${
                        response.status >= 200 && response.status < 300
                          ? "bg-green-500/15 text-green-500"
                          : response.status >= 400
                          ? "bg-red-500/15 text-red-500"
                          : "bg-amber-500/15 text-amber-500"
                      }`}
                    >
                      Status: {response.status === 0 ? "CORS Blocked" : response.status}
                    </span>

                    <span className="text-xs text-muted-foreground font-mono">
                      Time: <strong className="text-foreground">{response.timeMs} ms</strong>
                    </span>

                    <span className="text-xs text-muted-foreground font-mono">
                      Size: <strong className="text-foreground">{(response.sizeBytes / 1024).toFixed(2)} KB</strong>
                    </span>
                  </div>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-2">
                  {/* Tabs for Response: Pretty / Raw / Headers */}
                  <div className="flex gap-1 bg-accent/30 p-0.5 rounded">
                    <button
                      onClick={() => setActiveResTab("pretty")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        activeResTab === "pretty" ? "bg-background shadow-xs text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Pretty
                    </button>
                    <button
                      onClick={() => setActiveResTab("raw")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        activeResTab === "raw" ? "bg-background shadow-xs text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Raw
                    </button>
                    <button
                      onClick={() => setActiveResTab("headers")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        activeResTab === "headers" ? "bg-background shadow-xs text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Headers ({Object.keys(response.headers).length})
                    </button>
                  </div>

                  {/* Direct Action: Save Response as JSON Blob */}
                  <button
                    onClick={handleSaveResponseAsBlob}
                    className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Save this API response payload as a new file in your workspace JSON Explorer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Save as Workspace Blob</span>
                  </button>
                </div>
              )}
            </div>

            {/* Response Content Viewer */}
            <div className="flex-1 overflow-hidden relative">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Executing API Request...</span>
                </div>
              ) : response ? (
                activeResTab === "pretty" ? (
                  <MonacoEditor
                    value={response.body}
                    onChange={() => {}}
                    language="json"
                    isDark={isDark}
                    readOnly
                  />
                ) : activeResTab === "raw" ? (
                  <textarea
                    readOnly
                    value={response.body}
                    className="w-full h-full p-4 font-mono text-xs bg-background text-foreground resize-none outline-none"
                  />
                ) : (
                  <div className="p-4 overflow-y-auto h-full space-y-1.5 font-mono text-xs">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="flex gap-2 border-b border-border/20 py-1">
                        <span className="font-bold text-primary w-48 truncate">{k}:</span>
                        <span className="text-foreground/90 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Globe className="w-12 h-12 text-muted-foreground/30" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-muted-foreground">No Response Yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Enter an API URL above and click <strong>Send</strong> to execute HTTP requests like Postman.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL 1: CREATE COLLECTION MODAL ================= */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Create New Collection</span>
              </div>
              <button
                onClick={() => setShowCreateColModal(false)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollectionSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Collection Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Analytics Services / Auth Endpoints"
                  value={newColNameInput}
                  onChange={(e) => setNewColNameInput(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded p-2.5 outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. REST API endpoints for department analytics"
                  value={newColDescInput}
                  onChange={(e) => setNewColDescInput(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded p-2.5 outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateColModal(false)}
                  className="px-4 py-2 border border-border rounded text-xs font-semibold hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-95 cursor-pointer shadow-sm"
                >
                  Create Collection Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: IMPORT MODAL (Postman / OpenAPI / Workspace / cURL) ================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Upload className="w-4 h-4 text-indigo-500" />
                <span>Import Collections & Workspaces</span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs for Import format */}
            <div className="flex border-b border-border bg-accent/20 p-1 rounded-lg gap-1">
              <button
                onClick={() => setImportTab("postman")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  importTab === "postman" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                }`}
              >
                Postman v2.1
              </button>
              <button
                onClick={() => setImportTab("openapi")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  importTab === "openapi" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                }`}
              >
                OpenAPI / Swagger
              </button>
              <button
                onClick={() => setImportTab("curl")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  importTab === "curl" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                }`}
              >
                cURL Command
              </button>
            </div>

            <div className="space-y-3">
              {/* File Upload Option */}
              <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center space-y-2 cursor-pointer relative bg-background/40">
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileCode className="w-6 h-6 text-muted-foreground mx-auto" />
                <div className="text-xs text-muted-foreground">
                  {importFileName ? (
                    <span className="font-bold text-primary">{importFileName} loaded</span>
                  ) : (
                    <span>Click or drag JSON file here (Postman Collection or OpenAPI spec)</span>
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-muted-foreground uppercase font-bold">OR PASTE TEXT</div>

              <textarea
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder={
                  importTab === "curl"
                    ? 'curl -X POST "http://localhost:5072/analytics" -H "Authorization: Bearer token"'
                    : "Paste raw JSON collection string here..."
                }
                className="w-full h-36 font-mono text-xs bg-background border border-border rounded p-3 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-border rounded text-xs font-semibold hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importRawText.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Import Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SAVE REQUEST TO COLLECTION ================= */}
      {showSaveColModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>Save Request to Collection</span>
              </div>
              <button
                onClick={() => setShowSaveColModal(false)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveToColSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POST departmentanalytics"
                  value={reqSaveTitle}
                  onChange={(e) => setReqSaveTitle(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded p-2.5 outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select Collection Folder *</label>
                <select
                  value={selectedColId}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded p-2.5 outline-none cursor-pointer focus:border-primary"
                >
                  <option value="">-- Choose a collection folder --</option>
                  {apiCollections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.requests.length} requests)
                    </option>
                  ))}
                  <option value="new">+ Create New Collection Folder</option>
                </select>
              </div>

              {selectedColId === "new" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">New Collection Folder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dashboard-analytics"
                    value={newSaveColName}
                    onChange={(e) => setNewSaveColName(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded p-2.5 outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveColModal(false)}
                  className="px-4 py-2 border border-border rounded text-xs font-semibold hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedColId}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ENVIRONMENT VARIABLES ================= */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>Environment Variables</span>
              </div>
              <button
                onClick={() => setShowEnvModal(false)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Define variables like <code>base_url</code> or <code>token</code> and use them in URLs, headers, or request bodies as <code>{"{{base_url}}"}</code>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEnvKey.trim()) return;
                addEnvVariable({ key: newEnvKey.trim(), value: newEnvValue.trim(), enabled: true });
                setNewEnvKey("");
                setNewEnvValue("");
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Variable Key e.g. base_url"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                className="text-xs bg-background border border-border rounded p-2 flex-1 outline-none"
              />
              <input
                type="text"
                placeholder="Value e.g. http://localhost:5072"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                className="text-xs bg-background border border-border rounded p-2 flex-1 outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-95 cursor-pointer shrink-0"
              >
                Add Variable
              </button>
            </form>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-border pt-3">
              {envVariables.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No environment variables defined yet.</div>
              ) : (
                envVariables.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => updateEnvVariable(v.id, { enabled: e.target.checked })}
                      className="rounded border-border w-3.5 h-3.5 text-primary"
                    />
                    <span className="text-xs font-mono font-bold text-primary min-w-[100px]">{"{{"}{v.key}{"}}"}</span>
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateEnvVariable(v.id, { value: e.target.value })}
                      className="text-xs font-mono bg-background border border-border rounded p-1 flex-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => deleteEnvVariable(v.id)}
                      className="p-1 hover:text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEnvModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiStudioView;
