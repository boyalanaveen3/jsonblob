"use client";

import React from "react";
import { Cloud, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useCloudflare } from "@/hooks/useCloudflare";

export function ConnectionStatus() {
  const { state, activeAccount } = useCloudflare();

  if (state.status === "connected") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>● Connected</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground truncate">{activeAccount?.email || "boyalanaveen103@gmail.com"}</span>
      </div>
    );
  }

  if (state.status === "connecting") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>● Connecting to Cloudflare...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      <span className="w-2 h-2 rounded-full bg-slate-500" />
      <span>● Disconnected</span>
    </div>
  );
}
