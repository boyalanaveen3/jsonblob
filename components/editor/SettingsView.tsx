"use client";

import React from "react";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { 
  Settings, 
  User, 
  Monitor, 
  Sliders, 
  Terminal, 
  HelpCircle, 
  Check, 
  Info,
  SlidersHorizontal,
  LogOut
} from "lucide-react";

interface SettingsViewProps {
  userName: string | null;
  isDark: boolean;
  onThemeToggle: () => void;
  autosaveEnabled: boolean;
  onAutosaveToggle: (enabled: boolean) => void;
  onSignOut?: () => void;
}

export function SettingsView({
  userName,
  isDark,
  onThemeToggle,
  autosaveEnabled,
  onAutosaveToggle,
  onSignOut,
}: SettingsViewProps) {
  const { activities, clearActivities } = useWorkspaceStore();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">Workspace Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar inside Settings */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Categories</span>
          </div>
          <button className="w-full flex items-center gap-2 p-2 rounded-lg bg-accent text-xs font-semibold text-foreground text-left cursor-pointer">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Configurations Forms Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* User Account Details */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>User Profile & Session</span>
            </h3>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Session Status</span>
                {userName ? (
                  <span className="font-semibold text-emerald-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Logged In
                  </span>
                ) : (
                  <span className="font-semibold text-amber-500">Anonymous / Guest</span>
                )}
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Username / Email</span>
                <span className="font-semibold">{userName || "Anonymous Developer"}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Tenant Isolation</span>
                <span className="font-semibold">Per-user Sandbox Enabled</span>
              </div>

              {userName ? (
                <div className="pt-2 border-t border-border/50">
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-border/50">
                  <a
                    href="/auth"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-sm"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In / Register</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Theme & Display preferences */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <span>Appearance & Theme</span>
            </h3>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold block">Dark Mode</span>
                  <span className="text-muted-foreground">Toggle between high-contrast dark and light modes</span>
                </div>
                <button
                  onClick={onThemeToggle}
                  className="px-3 py-1.5 border border-border hover:bg-accent rounded font-bold cursor-pointer"
                >
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
              </div>
            </div>
          </div>

          {/* Editor Preferences */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Workspace Preferences</span>
            </h3>

            <div className="space-y-4 pt-2">
              {/* Autosave */}
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold block">JSON Editor Autosave</span>
                  <span className="text-muted-foreground">Auto-commits changes to local server storage</span>
                </div>
                <input
                  type="checkbox"
                  checked={autosaveEnabled}
                  onChange={(e) => onAutosaveToggle(e.target.checked)}
                  className="rounded border-border w-4 h-4 text-primary cursor-pointer"
                />
              </div>

              {/* Clear activities log */}
              <div className="flex items-center justify-between text-xs border-t border-border/50 pt-4">
                <div className="space-y-0.5">
                  <span className="font-semibold block">Clear Workspace History</span>
                  <span className="text-muted-foreground">Remove all log entries from the activity database</span>
                </div>
                <button
                  onClick={clearActivities}
                  disabled={activities.length === 0}
                  className="px-3 py-1.5 border border-border text-red-500 hover:bg-red-500/5 rounded font-bold disabled:opacity-50 cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </div>

          {/* Platform Info */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span>Platform Specifications</span>
            </h3>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex gap-2 p-3 rounded border border-border bg-accent/25">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground block">Workspace Runtime Specs</span>
                  <span>Dialect parsers compile and evaluate natively in client side workers. API requests leverage fetch dispatchers. SQLite databases resolve in Cloudflare D1 key value stores.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
