"use client";

import React, { useState } from "react";
import { Sliders, Save, Plus, Globe, Check } from "lucide-react";

export function EnvironmentsTab() {
  const [envs, setEnvs] = useState([
    {
      id: "env-1",
      name: "Development (Local)",
      baseUrl: "http://localhost:3000",
      apiUrl: "http://localhost:3000/api",
      variables: `{\n  "AUTH_TOKEN": "dev_test_token_123",\n  "TIMEOUT_MS": "5000"\n}`,
    },
    {
      id: "env-2",
      name: "Staging / QA",
      baseUrl: "https://staging.app.example.com",
      apiUrl: "https://staging.app.example.com/api",
      variables: `{\n  "AUTH_TOKEN": "staging_secret_key",\n  "TIMEOUT_MS": "10000"\n}`,
    },
  ]);

  const [selectedEnvId, setSelectedEnvId] = useState(envs[0].id);
  const [saveSaved, setSaveSaved] = useState(false);

  const selectedEnv = envs.find((e) => e.id === selectedEnvId) || envs[0];

  const handleUpdateEnv = (field: string, val: string) => {
    setEnvs(envs.map((e) => (e.id === selectedEnvId ? { ...e, [field]: val } : e)));
  };

  const handleSave = () => {
    setSaveSaved(true);
    setTimeout(() => setSaveSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            Test Automation Environments
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure application URLs, API endpoints, and environment variables for Playwright & Maestro test runs
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md flex items-center gap-2 cursor-pointer"
        >
          {saveSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {saveSaved ? "Saved!" : "Save Environment"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Environment List Sidebar */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase">Environments</label>
          <div className="space-y-2">
            {envs.map((e) => (
              <div
                key={e.id}
                onClick={() => setSelectedEnvId(e.id)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedEnvId === e.id
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                    : "bg-card border-border hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-bold text-sm">{e.name}</div>
                <div className="text-muted-foreground font-mono text-[11px] truncate mt-1">{e.baseUrl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Configuration Details */}
        <div className="md:col-span-2 rounded-xl bg-card border border-border p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Environment Settings: {selectedEnv.name}</h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Environment Name</label>
              <input
                type="text"
                value={selectedEnv.name}
                onChange={(e) => handleUpdateEnv("name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Application Base URL</label>
                <input
                  type="text"
                  value={selectedEnv.baseUrl}
                  onChange={(e) => handleUpdateEnv("baseUrl", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">API Base URL</label>
                <input
                  type="text"
                  value={selectedEnv.apiUrl}
                  onChange={(e) => handleUpdateEnv("apiUrl", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Environment Variables (JSON)</label>
              <textarea
                value={selectedEnv.variables}
                onChange={(e) => handleUpdateEnv("variables", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border font-mono text-xs text-foreground h-36 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
