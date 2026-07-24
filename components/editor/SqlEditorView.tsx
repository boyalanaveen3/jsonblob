"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { dbRegistry } from "@/lib/db/registry";
import { aiRegistry } from "@/lib/ai/registry";
import { D1DatabaseSchema, IDatabaseProvider, ProviderConnectionStatus } from "@/lib/db/types";
import { 
  AIContext, 
  AIExplanationResult, 
  AIOptimizeResult, 
  AIFixResult, 
  AISampleDataResult, 
  AITypeScriptResult 
} from "@/lib/ai/types";
import { 
  Play, 
  Save, 
  Download, 
  Plus, 
  X, 
  Table, 
  FileCode, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  Star,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  Copy,
  Check,
  FileJson,
  Cloud,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Wand2,
  Brain,
  Zap,
  Code2,
  Layers,
  Send,
  MessageSquare,
  CheckSquare,
  Eye,
  Hash,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background">
      Loading SQL Editor...
    </div>
  ),
});

interface SqlEditorViewProps {
  isDark: boolean;
  userName?: string | null;
  onSaveAsBlob?: (title: string, content: string) => void;
}

export function SqlEditorView({ isDark, userName, onSaveAsBlob }: SqlEditorViewProps) {
  const {
    sqlTabs,
    activeSqlTabId,
    sqlHistory,
    savedQueries,
    addSqlTab,
    closeSqlTab,
    setActiveSqlTabId,
    updateSqlTab,
    addSqlHistory,
    clearSqlHistory,
    saveQuery,
    deleteSavedQuery,
    addActivity,
  } = useWorkspaceStore();

  const activeTab = sqlTabs.find((t) => t.id === activeSqlTabId) || sqlTabs[0];

  // Provider architecture states
  const [selectedProviderId, setSelectedProviderId] = useState<string>("sqlite");
  const [databases, setDatabases] = useState<D1DatabaseSchema[]>([]);
  const [activeDbId, setActiveDbId] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<ProviderConnectionStatus>({ isConnected: true });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Schema Explorer Collapse States
  const [showStats, setShowStats] = useState(true);
  const [showTablesSection, setShowTablesSection] = useState(true);
  const [showViewsSection, setShowViewsSection] = useState(true);
  const [showIndexesSection, setShowIndexesSection] = useState(true);
  const [showTriggersSection, setShowTriggersSection] = useState(true);
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});

  // AI Architecture states
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<"explain" | "optimize" | "fix" | "generate" | "typescript" | "sample" | "chat">("chat");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // AI Outputs
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [aiOptimization, setAiOptimization] = useState<AIOptimizeResult | null>(null);
  const [aiFix, setAiFix] = useState<AIFixResult | null>(null);
  const [aiTypeScript, setAiTypeScript] = useState<AITypeScriptResult | null>(null);
  const [aiSampleData, setAiSampleData] = useState<AISampleDataResult | null>(null);
  
  // Natural Language SQL Generation
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "👋 Hi! I am your **AI SQL Assistant**. Ask me anything about writing queries, schema optimizations, migrations, or database performance!" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Pagination & Execution states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Array<Record<string, any>> | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [executionMeta, setExecutionMeta] = useState<{ duration: number; rowsCount: number } | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get active provider instance
  const currentProvider: IDatabaseProvider = useMemo(() => {
    return dbRegistry.getProvider(selectedProviderId);
  }, [selectedProviderId]);

  // Get active AI provider
  const currentAiProvider = useMemo(() => {
    return aiRegistry.getDefaultProvider();
  }, []);

  // Refresh Database & Schema Metadata
  const refreshProviderData = useCallback(async () => {
    setIsRefreshing(true);
    const status = currentProvider.getConnectionStatus();
    setConnectionStatus(status);

    if (status.isConnected || !currentProvider.requiresAuth) {
      const dbs = await currentProvider.getDatabases();
      setDatabases(dbs);
      if (dbs.length > 0 && (!activeDbId || !dbs.some(d => d.id === activeDbId))) {
        setActiveDbId(dbs[0].id);
      }
    } else {
      setDatabases([]);
      setActiveDbId("");
    }
    setTimeout(() => setIsRefreshing(false), 300);
  }, [currentProvider, activeDbId]);

  // Multi-account Cloudflare state
  const [cfAccounts, setCfAccounts] = useState<Array<{ id: string; name: string; databases?: Array<{ uuid: string; name: string }> }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawAccounts = localStorage.getItem("cf_all_accounts");
      if (rawAccounts) {
        try {
          const parsed = JSON.parse(rawAccounts);
          if (Array.isArray(parsed)) setCfAccounts(parsed);
        } catch (e) {}
      }
      const savedAccId = localStorage.getItem("cf_active_acc_id");
      if (savedAccId) setSelectedAccountId(savedAccId);
    }
  }, []);

  const handleAccountChange = (accId: string) => {
    if (accId === "connect_new") {
      window.location.href = "/api/auth/cloudflare?prompt=select_account&redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
      return;
    }
    setSelectedAccountId(accId);
    if (typeof window !== "undefined") {
      localStorage.setItem("cf_active_acc_id", accId);
      const targetAcc = cfAccounts.find((a) => a.id === accId);
      if (targetAcc) {
        localStorage.setItem("cloudflare_d1_session", JSON.stringify({
          isConnected: true,
          accountName: targetAcc.name,
          email: "gavvavamsikrishna@gmail.com",
          organization: "Cloudflare Global",
          connectedAt: new Date().toISOString(),
        }));
      }
    }
    refreshProviderData();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("provider") === "cloudflare-d1") {
        setSelectedProviderId("cloudflare-d1");
        localStorage.setItem("active_sql_provider_id", "cloudflare-d1");

        // Fetch server-side Cloudflare session
        (async () => {
          try {
            const res = await fetch("/api/auth/cloudflare/session");
            if (res.ok) {
              const data = (await res.json()) as {
                isConnected: boolean;
                accounts?: Array<{
                  id: string;
                  name: string;
                  databases?: Array<{ uuid: string; name: string }>;
                }>;
              };
              if (data.isConnected && Array.isArray(data.accounts) && data.accounts.length > 0) {
                setCfAccounts(data.accounts);
                localStorage.setItem("cf_all_accounts", JSON.stringify(data.accounts));

                const currentSavedAccId = localStorage.getItem("cf_active_acc_id");
                const activeAcc = data.accounts.find((a: any) => a.id === currentSavedAccId) || data.accounts[0];

                if (activeAcc) {
                  setSelectedAccountId(activeAcc.id);
                  localStorage.setItem("cf_active_acc_id", activeAcc.id);
                  localStorage.setItem("cloudflare_d1_session", JSON.stringify({
                    isConnected: true,
                    accountName: activeAcc.name,
                    email: "gavvavamsikrishna@gmail.com",
                    organization: "Cloudflare Global",
                    connectedAt: new Date().toISOString(),
                  }));
                }
              }
            }
          } catch (e) {
            // ignore
          } finally {
            refreshProviderData();
          }
        })();
      }
    }
  }, [refreshProviderData]);

  useEffect(() => {
    refreshProviderData();
  }, [selectedProviderId, refreshProviderData]);

  // Active database reference
  const activeDb = useMemo(() => {
    return databases.find(db => db.id === activeDbId) || databases[0];
  }, [databases, activeDbId]);

  const activeTableName = useMemo(() => {
    if (!activeDb?.tables) return "users";
    return Object.keys(activeDb.tables)[0] || "users";
  }, [activeDb]);

  // Compute Database Overview Statistics
  const dbStats = useMemo(() => {
    if (!activeDb) {
      return {
        tablesCount: 0,
        viewsCount: 0,
        indexesCount: 0,
        triggersCount: 0,
        totalRows: 0,
        size: "0 KB",
        sqliteVersion: "SQLite 3.45.1",
        lastUpdated: "N/A"
      };
    }
    const tablesCount = activeDb.tables ? Object.keys(activeDb.tables).length : 0;
    const viewsCount = activeDb.views ? Object.keys(activeDb.views).length : 0;
    const indexesCount = activeDb.indexes ? Object.keys(activeDb.indexes).length : 0;
    const triggersCount = activeDb.triggers ? Object.keys(activeDb.triggers).length : 0;
    
    let totalRows = 0;
    if (activeDb.tables) {
      Object.values(activeDb.tables).forEach(t => {
        if (t.rows) totalRows += t.rows.length;
      });
    }

    return {
      tablesCount,
      viewsCount,
      indexesCount,
      triggersCount,
      totalRows,
      size: activeDb.size || "2.4 MB",
      sqliteVersion: activeDb.sqliteVersion || "SQLite 3.45.1 (Cloudflare D1)",
      lastUpdated: activeDb.lastUpdated || "Just now"
    };
  }, [activeDb]);

  // Construct Context-Aware AI payload
  const getAiContext = useCallback((): AIContext => {
    return {
      query: activeTab ? activeTab.query : "",
      providerId: currentProvider.id,
      providerName: currentProvider.name,
      activeDatabase: activeDb,
      activeTable: activeTableName,
      lastError: queryError,
    };
  }, [activeTab, currentProvider, activeDb, activeTableName, queryError]);

  // 1. Explain SQL
  const handleExplainSql = async () => {
    setIsAiPanelOpen(true);
    setActiveAiTab("explain");
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.explainSQL(ctx);
    setAiExplanation(res);
    setIsAiLoading(false);
    addActivity("sql_run", "Executed AI Explain SQL");
  };

  // 2. Generate SQL from prompt
  const handleGenerateSqlSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!generatePrompt.trim()) return;
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.generateSQL(generatePrompt, ctx);
    setGeneratedSql(res);
    setIsAiLoading(false);
  };

  const handleApplyGeneratedSql = (mode: "insert" | "replace") => {
    if (!generatedSql || !activeTab) return;
    if (mode === "replace") {
      updateSqlTab(activeTab.id, { query: generatedSql });
    } else {
      updateSqlTab(activeTab.id, { query: `${activeTab.query}\n\n${generatedSql}` });
    }
    setShowGenerateModal(false);
    setGeneratedSql("");
    setGeneratePrompt("");
  };

  // 3. Optimize Query
  const handleOptimizeSql = async () => {
    setIsAiPanelOpen(true);
    setActiveAiTab("optimize");
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.optimizeSQL(ctx);
    setAiOptimization(res);
    setIsAiLoading(false);
    addActivity("sql_run", "Executed AI Query Optimization");
  };

  // 4. Fix SQL Errors
  const handleFixSql = async () => {
    setIsAiPanelOpen(true);
    setActiveAiTab("fix");
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.fixSQL(ctx);
    setAiFix(res);
    setIsAiLoading(false);
    addActivity("sql_run", "Executed AI SQL Error Diagnostics");
  };

  // 5. Format SQL
  const handleFormatSql = () => {
    if (!activeTab) return;
    const raw = activeTab.query;
    const formatted = raw
      .replace(/\s+/g, " ")
      .replace(/\b(select|from|where|join|left join|right join|inner join|group by|order by|having|limit|insert|update|delete|create table|alter table)\b/gi, (m) => `\n${m.toUpperCase()}`)
      .trim();
    updateSqlTab(activeTab.id, { query: formatted });
  };

  // 6. Convert to TypeScript
  const handleConvertToTs = async () => {
    setIsAiPanelOpen(true);
    setActiveAiTab("typescript");
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.generateTypeScript(ctx);
    setAiTypeScript(res);
    setIsAiLoading(false);
  };

  // 7 & 8. Generate Sample or Test Data
  const handleGenerateData = async (count: number, isEdgeCase: boolean) => {
    setIsAiPanelOpen(true);
    setActiveAiTab("sample");
    setIsAiLoading(true);
    const ctx = getAiContext();
    const res = await currentAiProvider.generateSampleData(activeTableName, count, isEdgeCase, ctx);
    setAiSampleData(res);
    setIsAiLoading(false);
  };

  // 9. AI Chat Assistant Submit
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput("");
    const newHistory = [...chatMessages, { role: "user" as const, content: userText }];
    setChatMessages(newHistory);
    setIsAiLoading(true);

    const ctx = getAiContext();
    const aiReply = await currentAiProvider.chat(userText, newHistory, ctx);

    setChatMessages([...newHistory, { role: "assistant", content: aiReply }]);
    setIsAiLoading(false);
  };

  // Keyboard Shortcuts Listener (Ctrl+Shift+E, G, O, F, A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        const key = e.key.toUpperCase();
        if (key === "E") {
          e.preventDefault();
          handleExplainSql();
        } else if (key === "G") {
          e.preventDefault();
          setShowGenerateModal(true);
        } else if (key === "O") {
          e.preventDefault();
          handleOptimizeSql();
        } else if (key === "F") {
          e.preventDefault();
          handleFormatSql();
        } else if (key === "A") {
          e.preventDefault();
          setIsAiPanelOpen(prev => !prev);
          setActiveAiTab("chat");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, queryError]);

  const handleProviderChange = async (providerId: string) => {
    setSelectedProviderId(providerId);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_sql_provider_id", providerId);
    }
    setResults(null);
    setQueryError(null);
    if (activeTab) {
      const dialectMap: Record<string, "sqlite" | "d1" | "postgres"> = {
        "sqlite": "sqlite",
        "cloudflare-d1": "d1",
      };
      updateSqlTab(activeTab.id, { dialect: dialectMap[providerId] || "sqlite" });
    }
  };

  const handleConnectCloudflareClick = () => {
    window.location.href = "/api/auth/cloudflare?redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
  };

  const handleDisconnectCloudflare = async () => {
    await currentProvider.disconnect();
    if (typeof window !== "undefined") {
      localStorage.removeItem("cloudflare_d1_session");
      localStorage.removeItem("cf_selected_db_id");
      localStorage.removeItem("active_sql_provider_id");
    }
    setConnectionStatus({ isConnected: false });
    setShowManageModal(false);
    setSelectedProviderId("cloudflare-d1");
    setDatabases([]);
    setResults(null);
    setQueryError(null);
    await refreshProviderData();
    addActivity("sql_run", "Disconnected Cloudflare D1 Account");
  };

  const handleQueryChange = (val: string | undefined) => {
    if (activeTab) {
      updateSqlTab(activeTab.id, { query: val || "" });
    }
  };

  // Run Query
  const handleRunQuery = async () => {
    if (!activeTab || !activeTab.query.trim()) return;

    if (currentProvider.requiresAuth && !connectionStatus.isConnected) {
      setQueryError("Authentication Required: Please connect your Cloudflare D1 account to run queries.");
      return;
    }

    setIsRunning(true);
    setQueryError(null);
    setResults(null);
    setExecutionMeta(null);

    const execResult = await currentProvider.executeQuery(activeDbId, activeTab.query);

    if (execResult.error) {
      setQueryError(execResult.error);
      addSqlHistory({
        query: activeTab.query,
        dialect: activeTab.dialect,
        status: "error",
        duration: execResult.duration,
        error: execResult.error,
      });
      addActivity("sql_run", `SQL Query Error (${currentProvider.name})`);
    } else {
      setResults(execResult.rows || []);
      setExecutionMeta({
        duration: execResult.duration,
        rowsCount: execResult.rowsCount || (execResult.rows ? execResult.rows.length : 0),
      });

      await refreshProviderData();

      addSqlHistory({
        query: activeTab.query,
        dialect: activeTab.dialect,
        status: "success",
        duration: execResult.duration,
        rowsCount: execResult.rowsCount || (execResult.rows ? execResult.rows.length : 0),
      });
      addActivity("sql_run", `Executed SQL Query on ${currentProvider.name}`);
    }

    setIsRunning(false);
  };

  const handleExport = (format: "json" | "csv") => {
    if (!results || results.length === 0) return;

    let content = "";
    let filename = `sql_results_${Date.now()}`;

    if (format === "json") {
      content = JSON.stringify(results, null, 2);
      filename += ".json";
    } else {
      const headers = Object.keys(results[0]);
      const csvRows = [];
      csvRows.push(headers.join(","));

      for (const row of results) {
        const values = headers.map((header) => {
          const val = row[header];
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvRows.push(values.join(","));
      }
      content = csvRows.join("\n");
      filename += ".csv";
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    if (!results || results.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsBlobClick = () => {
    if (!results || !onSaveAsBlob) return;
    onSaveAsBlob("SQL Query Output", JSON.stringify(results, null, 2));
  };

  const handleSaveQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim() || !activeTab) return;
    saveQuery(saveTitle, activeTab.query, activeTab.dialect);
    setSaveTitle("");
    setShowSaveModal(false);
  };

  const loadSavedQuery = (q: typeof savedQueries[0]) => {
    addSqlTab({
      title: q.title,
      query: q.query,
      dialect: q.dialect as any,
    });
  };

  const toggleTableCollapse = (name: string) => {
    setCollapsedTables(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleQueryItem = (queryText: string) => {
    if (activeTab) {
      updateSqlTab(activeTab.id, { query: queryText });
    }
  };

  // Pagination calculations
  const paginatedResults = useMemo(() => {
    if (!results) return null;
    const startIdx = (currentPage - 1) * pageSize;
    return results.slice(startIdx, startIdx + pageSize);
  }, [results, currentPage, pageSize]);

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground h-full relative select-none">
      
      {/* SQL Sidebar Navigation & Complete Schema Browser */}
      <aside className="w-80 border-r border-border bg-card/40 flex flex-col shrink-0 hidden md:flex overflow-hidden" data-testid="d1-sidebar">
        
        {/* Database Provider Selector & Refresh Controls */}
        <div className="p-3 border-b border-border bg-accent/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Database Provider
            </label>
            <button
              onClick={refreshProviderData}
              disabled={isRefreshing}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh Databases & Schema Metadata"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
          <select
            value={selectedProviderId}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-primary cursor-pointer font-bold shadow-sm"
          >
            {dbRegistry.getAllProviders().map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Cloudflare Connection Header Status Card */}
        {currentProvider.requiresAuth && connectionStatus.isConnected && (
          <div className="p-3 border-b border-border bg-violet-600/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Cloud className="w-4 h-4 text-violet-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">{connectionStatus.accountName}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{connectionStatus.email}</span>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
              <span className="truncate">Org: {connectionStatus.organization || "Cloudflare Global"}</span>
              <button
                onClick={() => setShowManageModal(true)}
                className="hover:text-foreground font-semibold underline cursor-pointer"
              >
                Manage Connection
              </button>
            </div>
          </div>
        )}

        {/* UNAUTHENTICATED FIRST-TIME WELCOME SIDEBAR CARD */}
        {currentProvider.requiresAuth && !connectionStatus.isConnected ? (
          <div className="flex-1 p-5 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shadow-lg shadow-violet-500/10">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Connect Cloudflare D1</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your Cloudflare account to browse D1 databases, views, indexes, and run queries.
              </p>
            </div>

            <div className="w-full text-left space-y-1.5 p-3 rounded-lg bg-accent/40 border border-border text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Browse D1 Databases & Schemas</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Run SQL Queries & Export Datasets</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>AI-Powered SQL Optimization & Fixes</span>
              </div>
            </div>

            <button
              onClick={handleConnectCloudflareClick}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>Continue with Cloudflare</span>
            </button>
          </div>
        ) : (
          /* AUTHENTICATED COMPLETE SCHEMA BROWSER */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Cloudflare Account Dropdown Selector */}
            {cfAccounts.length > 0 && (
              <div className="p-3 border-b border-border bg-accent/30 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Cloudflare Account</span>
                  <span className="text-emerald-400 text-[9px] font-mono">{cfAccounts.length} Connected</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-primary cursor-pointer font-bold text-violet-400"
                >
                  {cfAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.databases?.length || 0} D1 DBs)
                    </option>
                  ))}
                  <option value="connect_new">+ Connect / Switch Cloudflare Login</option>
                </select>
              </div>
            )}

            {/* Database Dropdown Selector */}
            {databases.length > 0 && (
              <div className="p-3 border-b border-border bg-accent/20 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Selected D1 Database</span>
                  <span className="text-violet-400 font-mono">{activeDb?.size || "3.4 MB"}</span>
                </label>
                <select
                  value={activeDbId}
                  onChange={(e) => setActiveDbId(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:border-primary cursor-pointer font-bold"
                >
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Database Overview & Statistics Grid */}
            <div className="border-b border-border bg-card/60">
              <button
                onClick={() => setShowStats(!showStats)}
                className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:bg-accent/40 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Database Overview</span>
                </div>
                {showStats ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {showStats && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold border-t border-border/40 bg-accent/10">
                  <div className="p-1.5 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground block text-[9px] uppercase">Tables</span>
                    <span className="text-xs font-extrabold text-foreground">{dbStats.tablesCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground block text-[9px] uppercase">Views</span>
                    <span className="text-xs font-extrabold text-sky-400">{dbStats.viewsCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground block text-[9px] uppercase">Indexes</span>
                    <span className="text-xs font-extrabold text-purple-400">{dbStats.indexesCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground block text-[9px] uppercase">Triggers</span>
                    <span className="text-xs font-extrabold text-amber-400">{dbStats.triggersCount}</span>
                  </div>
                </div>
              )}
            </div>

            {/* COLLAPSIBLE SCHEMA TREE (Tables, Views, Indexes, Triggers) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              
              {/* 1. TABLES SECTION */}
              <div className="rounded border border-border/40 bg-card/40 overflow-hidden">
                <button
                  onClick={() => setShowTablesSection(!showTablesSection)}
                  className="w-full px-2.5 py-1.5 bg-accent/30 text-xs font-bold text-foreground flex items-center justify-between hover:bg-accent/60 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {showTablesSection ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Table className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tables ({dbStats.tablesCount})</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); refreshProviderData(); }}
                    className="p-0.5 hover:bg-accent rounded text-muted-foreground"
                    title="Refresh Tables"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </button>

                {showTablesSection && (
                  <div className="p-1.5 space-y-1.5">
                    {(!activeDb?.tables || Object.keys(activeDb.tables).length === 0) ? (
                      <span className="text-[11px] text-muted-foreground italic px-2">No tables created.</span>
                    ) : (
                      Object.entries(activeDb.tables).map(([tableName, tableData]) => {
                        const isCollapsed = collapsedTables[tableName];
                        return (
                          <div key={tableName} className="rounded border border-border/40 bg-background/60 overflow-hidden">
                            <div className="flex items-center justify-between p-1.5 hover:bg-accent/50 transition-colors">
                              <button
                                onClick={() => toggleTableCollapse(tableName)}
                                className="flex items-center gap-1.5 flex-1 text-left text-xs font-semibold cursor-pointer truncate"
                              >
                                {isCollapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                                <Table className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{tableName}</span>
                              </button>
                              <button
                                onClick={() => handleQueryItem(`SELECT * FROM ${tableName} LIMIT 10;`)}
                                className="text-[10px] font-bold text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Query
                              </button>
                            </div>

                            {!isCollapsed && (
                              <div className="border-t border-border/40 bg-accent/10 p-2 space-y-1 text-[11px] font-mono">
                                {tableData.columns.map((col) => (
                                  <div key={col.name} className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-accent/40">
                                    <div className="flex items-center gap-1 truncate">
                                      <span className="text-foreground">{col.name}</span>
                                      {col.isPrimaryKey && <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 rounded">PK</span>}
                                      {col.isForeignKey && <span className="text-[8px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1 rounded">FK</span>}
                                    </div>
                                    <span className="text-[9px] uppercase font-bold text-violet-400">{col.type}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 2. VIEWS SECTION */}
              <div className="rounded border border-border/40 bg-card/40 overflow-hidden">
                <button
                  onClick={() => setShowViewsSection(!showViewsSection)}
                  className="w-full px-2.5 py-1.5 bg-accent/30 text-xs font-bold text-foreground flex items-center justify-between hover:bg-accent/60 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {showViewsSection ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Views ({dbStats.viewsCount})</span>
                  </div>
                </button>

                {showViewsSection && (
                  <div className="p-1.5 space-y-1">
                    {(!activeDb?.views || Object.keys(activeDb.views).length === 0) ? (
                      <span className="text-[11px] text-muted-foreground italic px-2">No views defined.</span>
                    ) : (
                      Object.entries(activeDb.views).map(([viewName, viewData]) => (
                        <div
                          key={viewName}
                          onClick={() => handleQueryItem(viewData.definition)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-accent/50 cursor-pointer text-xs font-mono group"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Eye className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate text-foreground font-semibold">{viewName}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 font-sans">Run</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. INDEXES SECTION */}
              <div className="rounded border border-border/40 bg-card/40 overflow-hidden">
                <button
                  onClick={() => setShowIndexesSection(!showIndexesSection)}
                  className="w-full px-2.5 py-1.5 bg-accent/30 text-xs font-bold text-foreground flex items-center justify-between hover:bg-accent/60 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {showIndexesSection ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Hash className="w-3.5 h-3.5 text-purple-400" />
                    <span>Indexes ({dbStats.indexesCount})</span>
                  </div>
                </button>

                {showIndexesSection && (
                  <div className="p-1.5 space-y-1">
                    {(!activeDb?.indexes || Object.keys(activeDb.indexes).length === 0) ? (
                      <span className="text-[11px] text-muted-foreground italic px-2">No indexes configured.</span>
                    ) : (
                      Object.entries(activeDb.indexes).map(([idxName, idxData]) => (
                        <div key={idxName} className="p-1.5 rounded bg-background/50 border border-border/30 text-xs font-mono space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-400 truncate">{idxName}</span>
                            {idxData.isUnique && <span className="text-[8px] font-bold text-emerald-400">UNIQUE</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            on {idxData.tableName} ({idxData.columns.join(", ")})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 4. TRIGGERS SECTION */}
              <div className="rounded border border-border/40 bg-card/40 overflow-hidden">
                <button
                  onClick={() => setShowTriggersSection(!showTriggersSection)}
                  className="w-full px-2.5 py-1.5 bg-accent/30 text-xs font-bold text-foreground flex items-center justify-between hover:bg-accent/60 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {showTriggersSection ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Triggers ({dbStats.triggersCount})</span>
                  </div>
                </button>

                {showTriggersSection && (
                  <div className="p-1.5 space-y-1">
                    {(!activeDb?.triggers || Object.keys(activeDb.triggers).length === 0) ? (
                      <span className="text-[11px] text-muted-foreground italic px-2">No triggers configured.</span>
                    ) : (
                      Object.entries(activeDb.triggers).map(([trgName, trgData]) => (
                        <div key={trgName} className="p-1.5 rounded bg-background/50 border border-border/30 text-xs font-mono space-y-0.5">
                          <span className="font-bold text-amber-400 block truncate">{trgName}</span>
                          <div className="text-[10px] text-muted-foreground">
                            {trgData.event} on {trgData.tableName}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Queries Section */}
        <div className="p-3 border-t border-border bg-card/30 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-500" />
            <span>Saved Queries</span>
          </span>
          {savedQueries.length === 0 ? (
            <span className="text-[11px] text-muted-foreground italic">No saved queries.</span>
          ) : (
            <div className="max-h-28 overflow-y-auto space-y-1">
              {savedQueries.map((sq) => (
                <div key={sq.id} className="flex items-center justify-between p-1.5 rounded hover:bg-accent text-xs group cursor-pointer" onClick={() => loadSavedQuery(sq)}>
                  <span className="truncate text-foreground font-medium">{sq.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSavedQuery(sq.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-0.5 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        
        {/* INTERNAL CONNECT PAGE WHEN CLOUDFLARE D1 IS SELECTED & NOT CONNECTED */}
        {currentProvider.requiresAuth && !connectionStatus.isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/30">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-violet-600/10 border border-violet-500/30 text-violet-500 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/10">
                <Cloud className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Connect Cloudflare D1</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Access your Cloudflare D1 serverless databases directly inside the SQL Editor workspace.
                </p>
              </div>

              <div className="text-left space-y-2.5 p-4 rounded-xl bg-accent/40 border border-border text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Browse D1 Databases, Tables, Views, & Indexes</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Run client-sandboxed SQL queries & export CSV/JSON</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Inspect Column PK/FK constraints & Database Statistics</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AI-powered SQL assistance, diagnostics, & formatting</span>
                </div>
              </div>

              <button
                onClick={handleConnectCloudflareClick}
                className="w-full py-3 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Continue with Cloudflare</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGULAR EDITOR WORKSPACE */
          <>
            {/* TOP TAB BAR */}
            <div className="border-b border-border bg-card/60 flex items-center justify-between px-3 h-10 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                {sqlTabs.map((tab) => {
                  const isActive = tab.id === activeSqlTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveSqlTabId(tab.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-semibold cursor-pointer border-t-2 transition-all ${
                        isActive
                          ? "bg-background text-foreground border-primary shadow-sm"
                          : "bg-transparent text-muted-foreground hover:bg-accent/50 border-transparent"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate max-w-[120px]">{tab.title}</span>
                      {sqlTabs.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); closeSqlTab(tab.id); }}
                          className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => addSqlTab()}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors ml-1"
                  title="New SQL Query Tab"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Save Query</span>
                </button>
                <button
                  onClick={handleRunQuery}
                  disabled={isRunning || (currentProvider.requiresAuth && !connectionStatus.isConnected)}
                  className="px-4 py-1 text-xs font-bold rounded bg-primary hover:bg-primary/90 text-primary-foreground shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
                  <span>{isRunning ? "Running..." : "Run Query"}</span>
                </button>
              </div>
            </div>

            {/* AI TOOLBAR ABOVE SQL EDITOR */}
            <div className="border-b border-border bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-indigo-500/10 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/20 text-[10px] font-extrabold text-violet-400 uppercase tracking-wider shrink-0">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>AI Toolbar</span>
                </div>
                
                <button
                  onClick={handleExplainSql}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Explain SQL (Ctrl+Shift+E)"
                >
                  <Brain className="w-3 h-3 text-sky-400" />
                  <span>Explain SQL</span>
                </button>

                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Generate SQL from Natural Language (Ctrl+Shift+G)"
                >
                  <Wand2 className="w-3 h-3 text-amber-400" />
                  <span>Generate SQL</span>
                </button>

                <button
                  onClick={handleOptimizeSql}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Optimize Query Performance (Ctrl+Shift+O)"
                >
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Optimize Query</span>
                </button>

                <button
                  onClick={handleFixSql}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Fix SQL Syntax & Logic Errors"
                >
                  <CheckSquare className="w-3 h-3 text-red-400" />
                  <span>Fix Errors</span>
                </button>

                <button
                  onClick={handleFormatSql}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Format SQL Code (Ctrl+Shift+F)"
                >
                  <Code2 className="w-3 h-3 text-purple-400" />
                  <span>Format SQL</span>
                </button>

                <button
                  onClick={handleConvertToTs}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Convert SQL Result to TypeScript Interface & Zod Schema"
                >
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>Convert to TS</span>
                </button>

                <button
                  onClick={() => handleGenerateData(10, false)}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Generate Sample Data INSERTs"
                >
                  <PlusCircle className="w-3 h-3 text-teal-400" />
                  <span>Sample Data</span>
                </button>

                <button
                  onClick={() => handleGenerateData(10, true)}
                  className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent/80 text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Generate Edge-Case Test Data (NULLs, Unicode, Boundaries)"
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Test Data</span>
                </button>
              </div>

              <button
                onClick={() => { setIsAiPanelOpen(prev => !prev); setActiveAiTab("chat"); }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isAiPanelOpen
                    ? "bg-violet-600 text-white shadow-violet-500/20"
                    : "bg-accent hover:bg-accent/80 text-foreground border border-border"
                }`}
                title="Toggle AI Assistant Panel (Ctrl+Shift+A)"
              >
                <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                <span>Ask AI</span>
              </button>
            </div>

            {/* CENTER WORKSPACE: Editor & Output Grid Split with AI Right Panel */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Main Editor & Results Panel */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                
                {/* MONACO SQL CODE EDITOR */}
                <div className="h-1/2 min-h-[160px] border-b border-border relative">
                  <MonacoEditor
                    value={activeTab ? activeTab.query : ""}
                    onChange={handleQueryChange}
                    language="sql"
                    isDark={isDark}
                  />
                </div>

                {/* QUERY OUTPUT GRID & ERROR PANEL */}
                <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-[150px]">
                  
                  <div className="px-4 py-2 border-b border-border bg-card/40 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <span className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">Results</span>
                      {executionMeta && (
                        <span className="text-[11px] text-emerald-500 font-mono flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{executionMeta.rowsCount} row(s) returned ({executionMeta.duration}ms)</span>
                        </span>
                      )}
                    </div>

                    {results && results.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyClipboard}
                          className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? "Copied" : "Copy JSON"}</span>
                        </button>
                        {onSaveAsBlob && (
                          <button
                            onClick={handleSaveAsBlobClick}
                            className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileJson className="w-3 h-3 text-primary" />
                            <span>Save as Blob</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleExport("csv")}
                          className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Grid or Error view */}
                  <div className="flex-1 overflow-auto p-3">
                    {queryError ? (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-mono text-xs space-y-3">
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span>Execution Error</span>
                          </div>
                          <button
                            onClick={handleFixSql}
                            className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded font-sans text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>✨ Fix with AI</span>
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap leading-relaxed">{queryError}</pre>
                      </div>
                    ) : !results ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Press &quot;Run Query&quot; to execute SQL code against {currentProvider.name}.
                      </div>
                    ) : results.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Query executed successfully. 0 rows returned.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded border border-border shadow-sm">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                          <thead>
                            <tr className="bg-card border-b border-border">
                              {Object.keys(results[0]).map((head) => (
                                <th key={head} className="p-2.5 font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50">
                                  {head}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedResults?.map((row, idx) => (
                              <tr key={idx} className="border-b border-border/30 hover:bg-accent/40 transition-colors">
                                {Object.keys(results[0]).map((key) => (
                                  <td key={key} className="p-2.5 border-r border-border/30 truncate max-w-xs">
                                    {row[key] === null ? (
                                      <span className="text-muted-foreground/60 italic font-sans text-[10px]">NULL</span>
                                    ) : typeof row[key] === "object" ? (
                                      JSON.stringify(row[key])
                                    ) : (
                                      String(row[key])
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT-SIDE RESIZABLE/COLLAPSIBLE AI PANEL */}
              {isAiPanelOpen && (
                <aside className="w-96 border-l border-border bg-card/70 flex flex-col shrink-0 h-full overflow-hidden shadow-2xl">
                  
                  {/* AI Panel Header */}
                  <div className="p-3 border-b border-border bg-accent/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">AI SQL Assistant</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {currentAiProvider.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsAiPanelOpen(false)}
                      className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AI Panel Tabs */}
                  <div className="flex items-center border-b border-border bg-accent/10 px-2 py-1 gap-1 overflow-x-auto no-scrollbar text-xs font-semibold">
                    <button
                      onClick={() => setActiveAiTab("chat")}
                      className={`px-2.5 py-1 rounded transition-colors ${activeAiTab === "chat" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={handleExplainSql}
                      className={`px-2.5 py-1 rounded transition-colors ${activeAiTab === "explain" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Explain
                    </button>
                    <button
                      onClick={handleOptimizeSql}
                      className={`px-2.5 py-1 rounded transition-colors ${activeAiTab === "optimize" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Optimize
                    </button>
                    <button
                      onClick={handleFixSql}
                      className={`px-2.5 py-1 rounded transition-colors ${activeAiTab === "fix" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      Fix
                    </button>
                    <button
                      onClick={handleConvertToTs}
                      className={`px-2.5 py-1 rounded transition-colors ${activeAiTab === "typescript" ? "bg-violet-600 text-white font-bold" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      TypeScript
                    </button>
                  </div>

                  {/* AI Panel Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isAiLoading ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
                        <span className="text-xs font-bold text-muted-foreground">AI Processing Request...</span>
                      </div>
                    ) : activeAiTab === "explain" && aiExplanation ? (
                      <div className="space-y-4 text-xs">
                        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 space-y-1">
                          <span className="font-bold block text-foreground">Summary</span>
                          <p className="text-muted-foreground leading-relaxed">{aiExplanation.summary}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Execution Flow</span>
                          <div className="p-2.5 rounded bg-accent/30 border border-border font-mono text-[11px] space-y-1">
                            {aiExplanation.executionFlow.map((step, idx) => (
                              <div key={idx} className="text-foreground">{step}</div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Tables Used</span>
                          <div className="flex flex-wrap gap-1">
                            {aiExplanation.tablesUsed.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">{t}</span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Improvements & Complexity</span>
                          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 space-y-1 text-amber-400">
                            {aiExplanation.improvements.map((imp, idx) => (
                              <div key={idx}>• {imp}</div>
                            ))}
                            <div className="font-bold pt-1 text-foreground">Complexity: {aiExplanation.complexity}</div>
                          </div>
                        </div>
                      </div>
                    ) : activeAiTab === "optimize" && aiOptimization ? (
                      <div className="space-y-4 text-xs">
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                          <span className="font-bold block text-foreground">Estimated Performance Gain</span>
                          <p className="font-semibold">{aiOptimization.performanceGainEstimate}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Optimized Query</span>
                          <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                            {aiOptimization.optimizedQuery}
                          </pre>
                          <button
                            onClick={() => {
                              if (activeTab) updateSqlTab(activeTab.id, { query: aiOptimization.optimizedQuery });
                            }}
                            className="w-full py-1.5 mt-1 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Apply Optimized Query</span>
                          </button>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Optimizations Made</span>
                          <ul className="space-y-1">
                            {aiOptimization.changes.map((c, i) => (
                              <li key={i} className="p-2 rounded bg-accent/30 border border-border text-muted-foreground">• {c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : activeAiTab === "fix" && aiFix ? (
                      <div className="space-y-4 text-xs">
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 space-y-1">
                          <span className="font-bold block text-foreground">Error Diagnostics</span>
                          <p className="font-mono">{aiFix.errorSummary}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Corrected SQL Query</span>
                          <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                            {aiFix.fixedQuery}
                          </pre>
                          <button
                            onClick={() => {
                              if (activeTab) updateSqlTab(activeTab.id, { query: aiFix.fixedQuery });
                            }}
                            className="w-full py-1.5 mt-1 rounded bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>Apply Fix to Editor</span>
                          </button>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Fix Actions Taken</span>
                          <ul className="space-y-1">
                            {aiFix.fixSteps.map((step, i) => (
                              <li key={i} className="p-2 rounded bg-accent/30 border border-border text-muted-foreground">• {step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : activeAiTab === "typescript" && aiTypeScript ? (
                      <div className="space-y-4 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">TypeScript Interface</span>
                          <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-blue-400 overflow-x-auto">
                            {aiTypeScript.interfaceCode}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Zod Schema Validation</span>
                          <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-purple-400 overflow-x-auto">
                            {aiTypeScript.zodSchemaCode}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">API Response Wrapper</span>
                          <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto">
                            {aiTypeScript.apiResponseTypeCode}
                          </pre>
                        </div>
                      </div>
                    ) : activeAiTab === "sample" && aiSampleData ? (
                      <div className="space-y-3 text-xs">
                        <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Generated Data ({aiSampleData.rowCount} rows)</span>
                        <pre className="p-3 rounded bg-background border border-border font-mono text-[11px] text-foreground overflow-x-auto max-h-80 whitespace-pre-wrap">
                          {aiSampleData.insertSql}
                        </pre>
                        <button
                          onClick={() => {
                            if (activeTab) updateSqlTab(activeTab.id, { query: aiSampleData.insertSql });
                          }}
                          className="w-full py-1.5 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Insert into Editor</span>
                        </button>
                      </div>
                    ) : (
                      /* AI Chat Assistant Tab */
                      <div className="h-full flex flex-col justify-between space-y-3">
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                          {chatMessages.map((m, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg max-w-[90%] leading-relaxed ${
                                m.role === "user"
                                  ? "ml-auto bg-violet-600 text-white rounded-br-none"
                                  : "mr-auto bg-accent/50 border border-border text-foreground rounded-bl-none"
                              }`}
                            >
                              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleSendChatMessage} className="flex gap-1.5 pt-2 border-t border-border">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask AI SQL Assistant..."
                            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary font-medium"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </>
        )}
      </main>

      {/* NATURAL LANGUAGE GENERATE SQL MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Generate SQL from Natural Language</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateSqlSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Describe query in plain English</label>
                <textarea
                  required
                  rows={3}
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder='e.g., "Show top 10 customers with highest revenue this month."'
                  className="w-full bg-background border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary font-medium resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isAiLoading}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span>Generate SQL Query</span>
              </button>
            </form>

            {generatedSql && (
              <div className="space-y-3 pt-2 border-t border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generated Output</span>
                <pre className="p-3 rounded bg-background border border-border font-mono text-xs text-amber-400 overflow-x-auto whitespace-pre-wrap">
                  {generatedSql}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplyGeneratedSql("replace")}
                    className="flex-1 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded shadow cursor-pointer"
                  >
                    Replace Query
                  </button>
                  <button
                    onClick={() => handleApplyGeneratedSql("insert")}
                    className="flex-1 py-1.5 bg-accent hover:bg-accent/80 text-foreground font-bold text-xs rounded border border-border cursor-pointer"
                  >
                    Append Query
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLOUDFLARE CONNECTION MANAGEMENT MODAL */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-violet-500" />
                <h3 className="font-bold text-sm">Cloudflare Connection Status</h3>
              </div>
              <button onClick={() => setShowManageModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cloudflare D1 Connected</span>
                </div>
                <button
                  onClick={refreshProviderData}
                  className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                  title="Refresh Databases"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="flex flex-col gap-1 p-3 rounded-lg bg-accent/40 border border-border space-y-1">
                <div>
                  <span className="text-muted-foreground font-semibold block text-[10px]">Email</span>
                  <span className="font-bold text-foreground">{connectionStatus.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[10px]">Organization</span>
                  <span className="font-semibold text-foreground">{connectionStatus.organization || "Cloudflare Global"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[10px]">Account Name</span>
                  <span className="font-mono text-foreground">{connectionStatus.accountName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center gap-2">
                <button
                  onClick={() => { refreshProviderData(); setShowManageModal(false); }}
                  className="flex-1 py-1.5 text-xs font-semibold rounded hover:bg-accent border border-border cursor-pointer flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-primary" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setShowManageModal(false);
                    window.location.href = "/api/auth/cloudflare?prompt=select_account&redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
                  }}
                  className="flex-1 py-1.5 text-xs font-bold rounded bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1 cursor-pointer shadow"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
              </div>
              <button
                onClick={handleDisconnectCloudflare}
                className="w-full py-1.5 text-xs font-bold rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Cloudflare Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE QUERY MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveQuerySubmit} className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-bold text-sm">Save SQL Query</h3>
              <button type="button" onClick={() => setShowSaveModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Query Title</label>
              <input
                type="text"
                required
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="e.g. Fetch Active Users"
                className="w-full bg-background border border-border rounded px-3 py-2 text-xs outline-none focus:border-primary font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSaveModal(false)} className="px-3 py-1.5 text-xs font-semibold rounded hover:bg-accent border border-border">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold rounded bg-primary text-primary-foreground shadow">
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
