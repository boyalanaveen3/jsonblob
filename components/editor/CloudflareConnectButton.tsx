"use client";

import React from "react";
import { Cloud, LogOut, ShieldCheck, RefreshCw } from "lucide-react";
import { useCloudflare } from "@/hooks/useCloudflare";

export function CloudflareConnectButton() {
  const { state, login, logout, isLoading } = useCloudflare();

  if (state.status === "connected") {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </span>
        <button
          onClick={logout}
          disabled={isLoading}
          className="px-2.5 py-1 text-xs font-semibold rounded hover:bg-red-500/10 text-red-400 border border-red-500/20 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login(false)}
      disabled={state.status === "connecting" || isLoading}
      className="px-3 py-1.5 text-xs font-bold rounded bg-violet-600 hover:bg-violet-700 text-white shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      {state.status === "connecting" ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Cloud className="w-3.5 h-3.5" />
      )}
      <span>Connect Cloudflare</span>
    </button>
  );
}
