"use client";

import React, { useState, useEffect } from "react";
import { useWorkspaceStore, type ApiRequestItem, type ApiHistoryItem } from "@/lib/store/workspaceStore";
import { 
  Send, 
  Plus, 
  Trash2, 
  Copy, 
  History, 
  FolderPlus, 
  Terminal, 
  Sliders, 
  Globe, 
  Clock, 
  Layers, 
  Check, 
  AlertCircle,
  Download,
  Info,
  Code
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
    deleteApiCollection,
    saveRequestToCollection,
    addEnvVariable,
    updateEnvVariable,
    deleteEnvVariable,
    addActivity,
  } = useWorkspaceStore();

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

  // Curl Modal & Collections Modal states
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);
  const [curlString, setCurlString] = useState("");
  const [showSaveColModal, setShowSaveColModal] = useState(false);
  const [selectedColId, setSelectedColId] = useState("");
  const [newColName, setNewColName] = useState("");
  const [reqSaveTitle, setReqSaveTitle] = useState("");

  // Environment variables modal
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  // Helpers for building Key-Value items
  const handleAddParam = () => {
    // Append a query param to URL
    const urlObj = parseUrl(activeApiRequest.url);
    urlObj.searchParams.append("key", "value");
    updateActiveApiRequest({ url: urlObj.toString() });
  };

  const handleAddHeader = () => {
    const headers = [...activeApiRequest.headers, { key: "", value: "", enabled: true }];
    updateActiveApiRequest({ headers });
  };

  const handleUpdateHeader = (index: number, updates: Partial<typeof activeApiRequest.headers[0]>) => {
    const headers = activeApiRequest.headers.map((h, i) => i === index ? { ...h, ...updates } : h);
    updateActiveApiRequest({ headers });
  };

  const handleRemoveHeader = (index: number) => {
    const headers = activeApiRequest.headers.filter((_, i) => i !== index);
    updateActiveApiRequest({ headers });
  };

  const handleAddFormData = () => {
    const formData = [...activeApiRequest.formData, { key: "", value: "", enabled: true }];
    updateActiveApiRequest({ formData });
  };

  const handleUpdateFormData = (index: number, updates: Partial<typeof activeApiRequest.formData[0]>) => {
    const formData = activeApiRequest.formData.map((f, i) => i === index ? { ...f, ...updates } : f);
    updateActiveApiRequest({ formData });
  };

  const handleRemoveFormData = (index: number) => {
    const formData = activeApiRequest.formData.filter((_, i) => i !== index);
    updateActiveApiRequest({ formData });
  };

  // URL Parsing helper
  const parseUrl = (urlStr: string): URL => {
    try {
      return new URL(urlStr);
    } catch {
      // Fallback relative or invalid
      if (urlStr.startsWith("http")) return new URL("https://api.github.com");
      return new URL("http://localhost:3000" + (urlStr.startsWith("/") ? "" : "/") + urlStr);
    }
  };

  // Replace environment variables in a string e.g. {{base_url}}/users
  const replaceEnvVars = (str: string): string => {
    let replaced = str;
    envVariables.forEach((variable) => {
      if (variable.enabled) {
        replaced = replaced.replaceAll(`{{${variable.key}}}`, variable.value);
      }
    });
    return replaced;
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

      // Extract response headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setResponse({
        status: res.status,
        timeMs,
        sizeBytes,
        body: text,
        headers: resHeaders,
      });

      addApiHistory({
        ...activeApiRequest,
        statusCode: res.status,
        duration: timeMs,
        responseBody: text,
        responseHeaders: resHeaders,
      });
      addActivity("api_send", `Dispatched API ${method} to ${parseUrl(finalUrl).hostname}`);
    } catch (err: any) {
      const end = performance.now();
      const timeMs = Math.round(end - start);

      // CORS fallback emulation
      console.warn("Client side fetch error, applying mock fallback for user convenience:", err);
      const isCors = err.message?.includes("Failed to fetch") || err.message?.includes("CORS");
      
      const fallbackBody = JSON.stringify({
        error: "Network / CORS block",
        message: err.message || "Failed to fetch response.",
        hint: isCors 
          ? "This is likely a browser Cross-Origin Resource Sharing (CORS) restriction. The server at the target URL did not return Access-Control-Allow-Origin headers. Try calling a public API like https://api.github.com or https://httpbin.org/get."
          : "Verify the URL protocol and spelling.",
        echo: {
          url: finalUrl,
          method,
          headers: headersInit
        }
      }, null, 2);

      setErrorInfo(isCors ? "CORS Policy Blocked" : "Connection Failure");
      setResponse({
        status: isCors ? 0 : 503,
        timeMs,
        sizeBytes: fallbackBody.length,
        body: fallbackBody,
        headers: { "content-type": "application/json; charset=utf-8", "x-powered-by": "JSONBlob Sandbox" },
      });

      addApiHistory({
        ...activeApiRequest,
        statusCode: isCors ? 0 : 503,
        duration: timeMs,
        responseBody: fallbackBody,
        responseHeaders: { "content-type": "application/json" },
      });
      addActivity("api_send", `Failed API ${method} to ${finalUrl}`);
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

  // cURL Import parser
  const handleCurlImport = () => {
    if (!curlString.trim()) return;

    try {
      // Simple parse of curl
      const methodMatch = curlString.match(/-X\s+([A-Z]+)/i) || curlString.match(/--request\s+([A-Z]+)/i);
      const method = methodMatch ? (methodMatch[1].toUpperCase() as any) : "GET";

      const urlMatch = curlString.match(/"(https?:\/\/[^"]+)"/) || curlString.match(/'(https?:\/\/[^']+)'/) || curlString.match(/(https?:\/\/\S+)/);
      const url = urlMatch ? urlMatch[1] : "https://api.github.com";

      // Headers
      const headers: typeof activeApiRequest.headers = [];
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

      // Body
      const bodyMatch = curlString.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]+?)['"]/);
      const body = bodyMatch ? bodyMatch[1] : "";
      const bodyType = body ? "json" : "none";

      setActiveApiRequest({
        id: "current-req",
        method,
        url,
        headers,
        auth: { type: "none" },
        bodyType,
        body,
        formData: [],
      });

      setCurlString("");
      setShowCurlImportModal(false);
      addActivity("api_send", "Imported Request from cURL command");
    } catch (e) {
      alert("Failed to parse cURL command. Check layout formatting.");
    }
  };

  // Save Response Body directly as JSON Blob in SaaS
  const handleSaveResponseAsBlob = () => {
    if (!response || !response.body) return;
    try {
      const parsed = JSON.parse(response.body);
      const formatted = JSON.stringify(parsed, null, 2);
      onSaveAsBlob(`API Response [${activeApiRequest.method}]`, formatted);
    } catch {
      // Plain text fallback
      onSaveAsBlob(`API Response [${activeApiRequest.method}]`, response.body);
    }
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
  };

  const handleSaveToColSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let colId = selectedColId;

    if (colId === "new" && newColName.trim()) {
      addApiCollection(newColName);
      // Wait for next tick to lookup the new col ID or create it inline
      const newColId = crypto.randomUUID();
      colId = newColId;
    }

    if (!colId || !reqSaveTitle.trim()) return;

    saveRequestToCollection(colId, {
      ...activeApiRequest,
      title: reqSaveTitle,
    });

    setNewColName("");
    setReqSaveTitle("");
    setShowSaveColModal(false);
  };

  const handleEnvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvKey.trim()) return;
    addEnvVariable({
      key: newEnvKey.trim(),
      value: newEnvValue.trim(),
      enabled: true,
    });
    setNewEnvKey("");
    setNewEnvValue("");
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground h-full relative">
      
      {/* API Studio Sidebar */}
      <aside className="w-64 border-r border-border bg-card/40 flex flex-col shrink-0 hidden md:flex">
        {/* Header Actions */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-xs uppercase tracking-wider">API Explorer</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowCurlImportModal(true)}
              className="p-1 border border-border rounded hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Import cURL"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowEnvModal(true)}
              className="p-1 border border-border rounded hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Environments"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collections list */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
          <div className="px-4 py-2 bg-accent/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
            <span>Collections</span>
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {apiCollections.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6 px-3">
                No collections. Click Save Request inside the query toolbar to create folders.
              </div>
            ) : (
              apiCollections.map((col) => (
                <div key={col.id} className="space-y-1">
                  <div className="flex items-center justify-between p-1.5 font-semibold text-xs text-muted-foreground bg-accent/15 rounded">
                    <span>{col.name}</span>
                    <button
                      onClick={() => deleteApiCollection(col.id)}
                      className="p-0.5 hover:text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="pl-3 space-y-1">
                    {col.requests.length === 0 && (
                      <div className="text-[10px] text-muted-foreground py-1">Empty collection</div>
                    )}
                    {col.requests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setActiveApiRequest(req)}
                        className="flex items-center gap-1.5 p-1 rounded hover:bg-accent text-xs cursor-pointer truncate"
                      >
                        <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                          req.method === "GET" ? "text-green-600 bg-green-500/10" :
                          req.method === "POST" ? "text-blue-600 bg-blue-500/10" : "text-amber-600 bg-amber-500/10"
                        }`}>
                          {req.method}
                        </span>
                        <span className="truncate text-foreground/80 font-medium">{req.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History list */}
        <div className="h-60 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-accent/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
            <span>API History</span>
            <button 
              onClick={clearApiHistory}
              className="text-[9px] text-primary hover:underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {apiHistory.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No request logs.
              </div>
            ) : (
              apiHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveApiRequest(item)}
                  className="p-1.5 rounded hover:bg-accent text-[10px] font-mono cursor-pointer flex items-center justify-between gap-1 border border-border/20"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`text-[8px] font-extrabold px-1 rounded ${
                      item.method === "GET" ? "text-green-500 bg-green-500/5" : "text-blue-500 bg-blue-500/5"
                    }`}>
                      {item.method}
                    </span>
                    <span className="truncate text-foreground/90">{item.url}</span>
                  </div>
                  <span className={`text-[9px] font-bold ${item.statusCode >= 200 && item.statusCode < 300 ? "text-green-500" : "text-red-500"}`}>
                    {item.statusCode || "CORS"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Request Dispatcher Panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* URL Bar */}
        <div className="p-4 border-b border-border bg-card/20 flex gap-2 shrink-0 flex-wrap">
          {/* Method Select */}
          <select
            value={activeApiRequest.method}
            onChange={(e) => updateActiveApiRequest({ method: e.target.value as any })}
            className="px-3 py-2 bg-background border border-border rounded text-xs font-bold uppercase cursor-pointer"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* URL Input */}
          <input
            type="text"
            value={activeApiRequest.url}
            onChange={(e) => updateActiveApiRequest({ url: e.target.value })}
            placeholder="https://api.github.com/users/google"
            className="flex-1 min-w-[200px] text-xs bg-background border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
          />

          {/* Actions */}
          <button
            onClick={handleSendRequest}
            disabled={isLoading || !activeApiRequest.url.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:opacity-95 text-primary-foreground font-bold rounded text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send</span>
          </button>

          <button
            onClick={() => setShowSaveColModal(true)}
            className="px-3 py-2 border border-border hover:bg-accent rounded text-xs font-semibold cursor-pointer"
          >
            Save Request
          </button>

          <button
            onClick={handleCopyCurl}
            className="px-2 py-2 border border-border hover:bg-accent rounded text-xs font-semibold cursor-pointer"
            title="Copy cURL command"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Request Tabs Selection (Params, Headers, Auth, Body) */}
        <div className="h-9 border-b border-border bg-card/45 flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setActiveReqTab("params")}
            className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
              activeReqTab === "params" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Params
          </button>
          <button
            onClick={() => setActiveReqTab("headers")}
            className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
              activeReqTab === "headers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Headers ({activeApiRequest.headers.length})
          </button>
          <button
            onClick={() => setActiveReqTab("auth")}
            className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
              activeReqTab === "auth" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Authorization
          </button>
          {activeApiRequest.method !== "GET" && (
            <button
              onClick={() => setActiveReqTab("body")}
              className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                activeReqTab === "body" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Body
            </button>
          )}
        </div>

        {/* Request Tab Contents */}
        <div className="h-44 border-b border-border p-4 overflow-y-auto shrink-0 bg-background">
          {activeReqTab === "params" && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Query Parameters (Appended directly in URL)</span>
                <button
                  onClick={handleAddParam}
                  className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Param
                </button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Edit the query parameters directly in the URL bar above.
              </p>
            </div>
          )}

          {activeReqTab === "headers" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                <span>Request Headers</span>
                <button
                  onClick={handleAddHeader}
                  className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Header
                </button>
              </div>

              {activeApiRequest.headers.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2 italic">No custom headers.</div>
              ) : (
                <div className="space-y-1.5">
                  {activeApiRequest.headers.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => handleUpdateHeader(idx, { enabled: e.target.checked })}
                        className="rounded border-border w-3.5 h-3.5 text-primary"
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        value={h.key}
                        onChange={(e) => handleUpdateHeader(idx, { key: e.target.value })}
                        className="text-xs bg-card border border-border rounded p-1 flex-1 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => handleUpdateHeader(idx, { value: e.target.value })}
                        className="text-xs bg-card border border-border rounded p-1 flex-1 focus:outline-none"
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
              )}
            </div>
          )}

          {activeReqTab === "auth" && (
            <div className="space-y-3 max-w-md">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Auth Type</label>
                <select
                  value={activeApiRequest.auth.type}
                  onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, type: e.target.value as any } })}
                  className="text-xs bg-card border border-border rounded p-2 focus:outline-none cursor-pointer"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>

              {activeApiRequest.auth.type === "bearer" && (
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Token</label>
                  <input
                    type="password"
                    placeholder="Bearer token value"
                    value={activeApiRequest.auth.bearerToken || ""}
                    onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, bearerToken: e.target.value } })}
                    className="text-xs bg-card border border-border rounded p-2 focus:outline-none"
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
                      onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, basicUser: e.target.value } })}
                      className="text-xs bg-card border border-border rounded p-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Password</label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={activeApiRequest.auth.basicPass || ""}
                      onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, basicPass: e.target.value } })}
                      className="text-xs bg-card border border-border rounded p-2 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeApiRequest.auth.type === "apikey" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Header Key</label>
                    <input
                      type="text"
                      placeholder="X-API-Key"
                      value={activeApiRequest.auth.apiKeyName || ""}
                      onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, apiKeyName: e.target.value } })}
                      className="text-xs bg-card border border-border rounded p-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Key Value</label>
                    <input
                      type="password"
                      placeholder="Secret key"
                      value={activeApiRequest.auth.apiKeyValue || ""}
                      onChange={(e) => updateActiveApiRequest({ auth: { ...activeApiRequest.auth, apiKeyValue: e.target.value } })}
                      className="text-xs bg-card border border-border rounded p-2 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeReqTab === "body" && activeApiRequest.method !== "GET" && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={activeApiRequest.bodyType === "none"}
                    onChange={() => updateActiveApiRequest({ bodyType: "none" })}
                    className="text-primary w-3.5 h-3.5"
                  />
                  <span>None</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={activeApiRequest.bodyType === "json"}
                    onChange={() => updateActiveApiRequest({ bodyType: "json" })}
                    className="text-primary w-3.5 h-3.5"
                  />
                  <span>JSON</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={activeApiRequest.bodyType === "form"}
                    onChange={() => updateActiveApiRequest({ bodyType: "form" })}
                    className="text-primary w-3.5 h-3.5"
                  />
                  <span>Form URL Encoded</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={activeApiRequest.bodyType === "raw"}
                    onChange={() => updateActiveApiRequest({ bodyType: "raw" })}
                    className="text-primary w-3.5 h-3.5"
                  />
                  <span>Raw Text</span>
                </label>
              </div>

              {activeApiRequest.bodyType === "json" && (
                <textarea
                  value={activeApiRequest.body}
                  onChange={(e) => updateActiveApiRequest({ body: e.target.value })}
                  className="flex-1 w-full p-2 bg-card border border-border rounded font-mono text-xs focus:outline-none focus:border-primary min-h-[80px]"
                />
              )}

              {activeApiRequest.bodyType === "raw" && (
                <textarea
                  value={activeApiRequest.body}
                  onChange={(e) => updateActiveApiRequest({ body: e.target.value })}
                  placeholder="Raw payload content"
                  className="flex-1 w-full p-2 bg-card border border-border rounded font-mono text-xs focus:outline-none focus:border-primary min-h-[80px]"
                />
              )}

              {activeApiRequest.bodyType === "form" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Form Fields</span>
                    <button
                      onClick={handleAddFormData}
                      className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>
                  {activeApiRequest.formData.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-1">No form parameters.</div>
                  ) : (
                    activeApiRequest.formData.map((f, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="checkbox"
                          checked={f.enabled}
                          onChange={(e) => handleUpdateFormData(idx, { enabled: e.target.checked })}
                          className="rounded border-border w-3.5 h-3.5 text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Field Key"
                          value={f.key}
                          onChange={(e) => handleUpdateFormData(idx, { key: e.target.value })}
                          className="text-xs bg-card border border-border rounded p-1 flex-1 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Field Value"
                          value={f.value}
                          onChange={(e) => handleUpdateFormData(idx, { value: e.target.value })}
                          className="text-xs bg-card border border-border rounded p-1 flex-1 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveFormData(idx)}
                          className="p-1 hover:text-red-500 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response Panel Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-background/50">
          
          {/* Response status bar */}
          <div className="px-4 py-2 border-b border-border bg-accent/25 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-muted-foreground">Response Panel</span>
              {response && (
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    response.status >= 200 && response.status < 300 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                    response.status >= 400 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                  }`}>
                    Status: {response.status === 0 ? "CORS Blocked" : response.status}
                  </span>

                  <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3" /> {response.timeMs} ms
                  </span>

                  <span className="text-muted-foreground text-[10px]">
                    {(response.sizeBytes / 1024).toFixed(2)} KB
                  </span>
                </div>
              )}
            </div>

            {response && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveResponseAsBlob}
                  className="px-2.5 py-1 text-xs border border-border hover:bg-accent rounded font-bold flex items-center gap-1 cursor-pointer"
                  title="Import response payload as editable JSON blob in workspace"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Save as Blob</span>
                </button>
              </div>
            )}
          </div>

          {/* Response Tabs (Pretty, Raw, Headers) */}
          {response && (
            <div className="h-8 border-b border-border bg-card/25 flex items-center px-4 gap-4 shrink-0">
              <button
                onClick={() => setActiveResTab("pretty")}
                className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                  activeResTab === "pretty" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Pretty Body
              </button>
              <button
                onClick={() => setActiveResTab("raw")}
                className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                  activeResTab === "raw" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Raw Body
              </button>
              <button
                onClick={() => setActiveResTab("headers")}
                className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                  activeResTab === "headers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Headers ({Object.keys(response.headers).length})
              </button>
            </div>
          )}

          {/* Response Payload Rendering */}
          <div className="flex-1 overflow-auto p-4 bg-background">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-semibold">Sending API request...</span>
              </div>
            ) : errorInfo && response && response.status === 0 ? (
              <div className="flex flex-col space-y-4 max-w-xl">
                <div className="flex gap-2.5 p-3.5 text-xs font-mono rounded border border-orange-500/25 bg-orange-50/50 dark:bg-orange-950/10 text-orange-500">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">CORS Restriction Warning</span>
                    <span>{JSON.parse(response.body).hint}</span>
                  </div>
                </div>
                
                {/* Visual JSON response output for CORS mock fallback */}
                <div className="border border-border rounded-lg p-3 bg-card h-40 overflow-y-auto">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{response.body}</pre>
                </div>
              </div>
            ) : response ? (
              activeResTab === "pretty" ? (
                <div className="h-full border border-border rounded overflow-hidden">
                  <MonacoEditor
                    value={(() => {
                      try {
                        return JSON.stringify(JSON.parse(response.body), null, 2);
                      } catch {
                        return response.body;
                      }
                    })()}
                    onChange={() => {}}
                    isDark={isDark}
                    language="json"
                  />
                </div>
              ) : activeResTab === "raw" ? (
                <pre className="text-xs font-mono bg-card p-3 rounded-lg border border-border overflow-auto max-h-full whitespace-pre-wrap text-foreground/90">
                  {response.body}
                </pre>
              ) : (
                // Response Headers
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <table className="w-full text-xs text-left font-mono">
                    <thead>
                      <tr className="bg-accent/40 border-b border-border text-muted-foreground select-none font-bold">
                        <th className="p-2 border-r border-border/60">Header</th>
                        <th className="p-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <tr key={k} className="hover:bg-accent/15">
                          <td className="p-2 border-r border-border/40 font-semibold text-muted-foreground">{k}</td>
                          <td className="p-2 text-foreground/90">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="text-xs text-muted-foreground flex items-center justify-center h-full gap-1">
                <Info className="w-4 h-4" />
                <span>Fill in URL and click Send to request API content. Supports standard methods.</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================= cURL IMPORT MODAL ================= */}
      {showCurlImportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-5 shadow-lg space-y-4 animate-in fade-in zoom-in duration-150 text-foreground">
            <div>
              <h3 className="text-sm font-bold">Import cURL Command</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste a raw cURL command from your network inspector to auto-populate request headers, method, URL, and JSON payload body.
              </p>
            </div>

            <textarea
              value={curlString}
              onChange={(e) => setCurlString(e.target.value)}
              placeholder="curl -X POST 'https://api.example.com' -H 'Content-Type: application/json' -d '{\&quot;key\&quot;:\&quot;val\&quot;}'"
              className="w-full h-32 text-xs bg-background border border-border rounded p-2 font-mono focus:outline-none focus:border-primary"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCurlImportModal(false)}
                className="px-3 py-1.5 border border-border hover:bg-accent rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCurlImport}
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded font-semibold cursor-pointer"
              >
                Import cURL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SAVE TO COLLECTION MODAL ================= */}
      {showSaveColModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveToColSubmit}
            className="bg-card border border-border rounded-lg max-w-sm w-full p-5 shadow-lg space-y-4 animate-in fade-in zoom-in duration-150 text-foreground"
          >
            <div>
              <h3 className="text-sm font-bold">Save Request</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Persist this request configuration in an API Collection folder.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Request Name</label>
                <input
                  type="text"
                  required
                  value={reqSaveTitle}
                  onChange={(e) => setReqSaveTitle(e.target.value)}
                  placeholder="e.g. Fetch Google User details"
                  className="w-full text-xs bg-background border border-border rounded p-2 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Collection</label>
                <select
                  value={selectedColId}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  required
                  className="w-full text-xs bg-background border border-border rounded p-2 focus:outline-none cursor-pointer"
                >
                  <option value="">Select collection folder...</option>
                  {apiCollections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="new">+ Create New Collection Folder</option>
                </select>
              </div>

              {selectedColId === "new" && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">New Collection Name</label>
                  <input
                    type="text"
                    required
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="e.g. Authentication APIs"
                    className="w-full text-xs bg-background border border-border rounded p-2 focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setShowSaveColModal(false)}
                className="px-3 py-1.5 border border-border hover:bg-accent rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded font-semibold cursor-pointer"
              >
                Save request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= ENVIRONMENTS VARIABLES MODAL ================= */}
      {showEnvModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-5 shadow-lg space-y-4 animate-in fade-in zoom-in duration-150 text-foreground flex flex-col max-h-[85vh]">
            <div>
              <h3 className="text-sm font-bold">Environment Variables</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define key/value variables and reference them in inputs using double curly braces: e.g. <span className="font-mono text-primary font-bold">{"{{base_url}}"}</span>.
              </p>
            </div>

            {/* Existing env variables table */}
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[250px] border border-border rounded p-2 bg-background/50">
              {envVariables.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 italic">No variables defined yet.</div>
              ) : (
                envVariables.map((v) => (
                  <div key={v.id} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => updateEnvVariable(v.id, { enabled: e.target.checked })}
                      className="rounded border-border w-3.5 h-3.5 text-primary"
                    />
                    <span className="text-xs font-mono font-bold text-muted-foreground flex-1 truncate pr-1">
                      {v.key}
                    </span>
                    <span className="text-xs font-mono text-foreground/80 flex-1 truncate pr-1">
                      {v.value}
                    </span>
                    <button
                      onClick={() => deleteEnvVariable(v.id)}
                      className="p-1 hover:text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add variable form */}
            <form onSubmit={handleEnvSubmit} className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-4 items-end">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase">Key</label>
                <input
                  type="text"
                  required
                  placeholder="base_url"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  className="w-full p-1.5 bg-background border border-border rounded focus:outline-none"
                />
              </div>
              <div className="space-y-1 flex gap-2 items-center">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Value</label>
                  <input
                    type="text"
                    required
                    placeholder="https://api.github.com"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    className="w-full p-1.5 bg-background border border-border rounded focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded flex items-center justify-center cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEnvModal(false)}
                className="px-4 py-1.5 bg-accent hover:bg-accent/80 border border-border rounded text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiStudioView;
