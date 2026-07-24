"use client";

import React, { useMemo } from "react";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { useAiStore } from "@/lib/store/aiStore";
import { 
  Folder, 
  Terminal, 
  Send, 
  Database, 
  Sparkles, 
  Plus, 
  Star, 
  Trash2, 
  Clock, 
  ArrowRight, 
  HardDrive, 
  Layers,
  FileJson,
  Play
} from "lucide-react";

interface DashboardViewProps {
  blobs: any[];
  onSelectBlob: (blob: any) => void;
  onDeleteBlob: (id: string) => void;
  onCreateNewBlob: () => void;
}

export function DashboardView({ blobs, onSelectBlob, onDeleteBlob, onCreateNewBlob }: DashboardViewProps) {
  const { 
    collections, 
    sqlHistory, 
    apiHistory, 
    activities, 
    favoriteBlobIds, 
    toggleFavoriteBlob,
    setActiveView 
  } = useWorkspaceStore();
  
  const { setIsOpen: setAiOpen } = useAiStore();

  // Metrics calculations
  const totalBlobs = blobs.length;
  const totalCollections = collections.length;
  const totalSqlQueries = sqlHistory.length;
  const totalApiRequests = apiHistory.length;
  
  const totalStorageKb = useMemo(() => {
    let bytes = 0;
    blobs.forEach((b) => {
      bytes += new Blob([b.content || ""]).size;
    });
    return (bytes / 1024).toFixed(2);
  }, [blobs]);

  const favoriteBlobs = useMemo(() => {
    return blobs.filter((b) => favoriteBlobIds.includes(b.id));
  }, [blobs, favoriteBlobIds]);

  const recentBlobs = useMemo(() => {
    return [...blobs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [blobs]);

  // Handle Quick Actions
  const handleOpenSql = () => setActiveView("sql");
  const handleOpenApi = () => setActiveView("api");
  const handleAskAi = () => {
    setAiOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-md">
        <div className="relative z-10 max-w-xl space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Developer Workspace</h1>
          <p className="text-violet-100 text-sm md:text-base leading-relaxed">
            Welcome to your integrated sandbox. Manage JSON blobs, run multi-dialect SQL queries, send API requests with full header/body support, and leverage the AI assistant sidebar.
          </p>
        </div>
        {/* Background visual accents */}
        <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 right-1/4 -mb-10 h-32 w-32 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Total Blobs */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">JSON Blobs</span>
            <FileJson className="w-5 h-5 text-violet-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">{totalBlobs}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Documents saved</span>
          </div>
        </div>

        {/* Collections */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Collections</span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">{totalCollections}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Logical folders</span>
          </div>
        </div>

        {/* SQL Queries */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">SQL Queries</span>
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">{totalSqlQueries}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Queries executed</span>
          </div>
        </div>

        {/* API Requests */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">API Calls</span>
            <Send className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">{totalApiRequests}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Requests triggered</span>
          </div>
        </div>

        {/* AI Requests (simulated) */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">AI Audits</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">16</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">AI assistant calls</span>
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Storage Used</span>
            <HardDrive className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">{totalStorageKb} KB</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">JSON storage</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Analytics Chart Widget */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm">Activity Analytics</h3>
              <p className="text-xs text-muted-foreground">Workspace interactions and executions</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live updates
            </span>
          </div>

          {/* SVG Custom Graph */}
          <div className="h-44 w-full relative pt-2">
            <svg viewBox="0 0 500 150" className="w-full h-full text-primary" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary, rgb(124, 58, 237))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary, rgb(124, 58, 237))" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="var(--color-border, #e5e7eb)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="var(--color-border, #e5e7eb)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="var(--color-border, #e5e7eb)" strokeWidth="0.5" strokeDasharray="3" />

              {/* Area path */}
              <path
                d="M0 150 L 0 110 L 70 85 L 140 120 L 210 50 L 280 80 L 350 40 L 420 65 L 500 25 L 500 150 Z"
                fill="url(#chartGrad)"
              />
              {/* Stroke path */}
              <path
                d="M0 110 L 70 85 L 140 120 L 210 50 L 280 80 L 350 40 L 420 65 L 500 25"
                fill="none"
                stroke="rgb(124, 58, 237)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Nodes */}
              <circle cx="70" cy="85" r="4" fill="white" stroke="rgb(124, 58, 237)" strokeWidth="2" />
              <circle cx="210" cy="50" r="4" fill="white" stroke="rgb(124, 58, 237)" strokeWidth="2" />
              <circle cx="350" cy="40" r="4" fill="white" stroke="rgb(124, 58, 237)" strokeWidth="2" />
              <circle cx="500" cy="25" r="4" fill="white" stroke="rgb(124, 58, 237)" strokeWidth="2" />
            </svg>
            
            {/* Chart X axis labels */}
            <div className="flex justify-between text-[9px] text-muted-foreground mt-2 px-1">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Quick Actions</h3>
            <p className="text-xs text-muted-foreground">Jump directly to workspace utilities</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 flex-1 justify-center content-center">
            <button
              onClick={onCreateNewBlob}
              className="flex flex-col items-center justify-center p-3 border border-border hover:border-violet-500/50 bg-accent/25 hover:bg-violet-600/5 rounded-xl transition-all group text-center cursor-pointer"
            >
              <Plus className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-semibold">New Blob</span>
            </button>

            <button
              onClick={handleOpenSql}
              className="flex flex-col items-center justify-center p-3 border border-border hover:border-emerald-500/50 bg-accent/25 hover:bg-emerald-600/5 rounded-xl transition-all group text-center cursor-pointer"
            >
              <Terminal className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-semibold">SQL Workspace</span>
            </button>

            <button
              onClick={handleOpenApi}
              className="flex flex-col items-center justify-center p-3 border border-border hover:border-blue-500/50 bg-accent/25 hover:bg-blue-600/5 rounded-xl transition-all group text-center cursor-pointer"
            >
              <Send className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-semibold">API Studio</span>
            </button>

            <button
              onClick={handleAskAi}
              className="flex flex-col items-center justify-center p-3 border border-border hover:border-amber-500/50 bg-accent/25 hover:bg-amber-600/5 rounded-xl transition-all group text-center cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform mb-1.5 animate-pulse" />
              <span className="text-xs font-semibold">Ask AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Favorites & Recent Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm">Recent Blobs</h3>
              <p className="text-xs text-muted-foreground">Quick access to your latest json documents</p>
            </div>
            <button
              onClick={() => setActiveView("workspace")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Go to Editor</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {recentBlobs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No blobs created yet. Click "New Blob" above to get started.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="pb-2">Title</th>
                    <th className="pb-2 hidden sm:table-cell">Updated At</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentBlobs.map((blob) => (
                    <tr key={blob.id} className="group hover:bg-accent/20">
                      <td
                        onClick={() => {
                          onSelectBlob(blob);
                          setActiveView("workspace");
                        }}
                        className="py-3 font-medium text-foreground hover:text-primary cursor-pointer truncate max-w-[200px]"
                      >
                        {blob.title || "Untitled Blob"}
                      </td>
                      <td className="py-3 text-muted-foreground hidden sm:table-cell">
                        {new Date(blob.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 flex items-center gap-2">
                        <button
                          onClick={() => toggleFavoriteBlob(blob.id)}
                          className="p-1 text-muted-foreground hover:text-amber-500 rounded hover:bg-accent transition-colors cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              favoriteBlobIds.includes(blob.id) ? "fill-amber-500 text-amber-500" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => onDeleteBlob(blob.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-accent transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Favorite Blobs Panel */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm">Favorites</h3>
            <p className="text-xs text-muted-foreground">Starred JSON templates</p>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[180px]">
            {favoriteBlobs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                No favorite blobs yet. Star blobs in the sidebar list or recent blobs.
              </div>
            ) : (
              favoriteBlobs.map((blob) => (
                <div
                  key={blob.id}
                  onClick={() => {
                    onSelectBlob(blob);
                    setActiveView("workspace");
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-accent/40 transition-all cursor-pointer group"
                >
                  <span className="text-xs font-semibold truncate flex-1 pr-2">
                    {blob.title || "Untitled Blob"}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Workspace Activities Section */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm">Recent Workspace Logs</h3>
            <p className="text-xs text-muted-foreground">Interactive history of code executions, requests, and blob modifications</p>
          </div>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              No recent activity. Interactions will log here.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs border-b border-border/40 pb-2.5 last:border-b-0 last:pb-0">
                <span className="mt-0.5">
                  {act.type === "blob_create" && <FileJson className="w-3.5 h-3.5 text-violet-500" />}
                  {act.type === "blob_update" && <FileJson className="w-3.5 h-3.5 text-violet-400" />}
                  {act.type === "sql_run" && <Database className="w-3.5 h-3.5 text-emerald-500" />}
                  {act.type === "api_send" && <Send className="w-3.5 h-3.5 text-blue-500" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{act.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(act.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
