"use client";

import React from "react";
import { Database, UserCheck, PlusCircle, RefreshCw } from "lucide-react";
import { useCloudflare } from "@/hooks/useCloudflare";

export function DatabaseSelector() {
  const { state, activeAccount, currentDatabases, selectDatabase, switchAccount, login, refreshDatabases, isLoading } = useCloudflare();

  if (state.status !== "connected") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Cloudflare Account Switcher */}
      {state.accounts.length > 0 && (
        <div className="flex items-center gap-1.5 bg-violet-600/10 border border-violet-500/20 rounded px-2.5 py-1 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <select
            value={state.activeAccountId || ""}
            onChange={(e) => {
              if (e.target.value === "ADD_NEW") {
                login(true);
              } else {
                switchAccount(e.target.value);
              }
            }}
            className="bg-transparent text-foreground outline-none font-bold cursor-pointer text-xs"
          >
            {state.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.email})
              </option>
            ))}
            <option value="ADD_NEW">+ Connect Another Cloudflare Account...</option>
          </select>
        </div>
      )}

      {/* Selected D1 Database Selector */}
      {currentDatabases.length > 0 && (
        <div className="flex items-center gap-1.5 bg-background border border-border rounded px-2.5 py-1 text-xs">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <select
            value={state.selectedDatabaseId || ""}
            onChange={(e) => selectDatabase(e.target.value)}
            className="bg-transparent text-foreground outline-none font-bold cursor-pointer text-xs"
          >
            {currentDatabases.map((db) => (
              <option key={db.uuid} value={db.uuid}>
                {db.name} ({db.num_tables || 5} tables)
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={refreshDatabases}
        disabled={isLoading}
        className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Refresh Databases"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
      </button>
    </div>
  );
}
