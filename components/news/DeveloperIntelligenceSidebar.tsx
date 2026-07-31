"use client";

import React from "react";
import { AICategory } from "@/types/ai-news";
import {
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Shield,
  Cpu,
  Code,
  Box,
  Layers,
  Terminal,
  Globe,
  Radio,
  X,
  Filter,
} from "lucide-react";

interface DeveloperIntelligenceSidebarProps {
  selectedCategory: AICategory | "all";
  onSelectCategory: (category: AICategory | "all") => void;
  selectedSource: string | "all";
  onSelectSource: (source: string | "all") => void;
  availableSources: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  showBookmarkedOnly: boolean;
  onToggleBookmarkedOnly: () => void;
  bookmarkedCount: number;
  isOffline: boolean;
  onResetFilters: () => void;
}

export const DeveloperIntelligenceSidebar: React.FC<DeveloperIntelligenceSidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSource,
  onSelectSource,
  availableSources,
  selectedTag,
  onSelectTag,
  showBookmarkedOnly,
  onToggleBookmarkedOnly,
  bookmarkedCount,
  isOffline,
  onResetFilters,
}) => {
  const categories: Array<{ id: AICategory | "all"; label: string; icon: React.ReactNode }> = [
    { id: "all", label: "All Categories", icon: <SlidersHorizontal className="w-4 h-4 text-primary" /> },
    { id: "models", label: "AI Models", icon: <Cpu className="w-4 h-4 text-purple-400" /> },
    { id: "tools", label: "Coding Tools", icon: <Terminal className="w-4 h-4 text-blue-400" /> },
    { id: "frameworks", label: "AI Frameworks", icon: <Box className="w-4 h-4 text-indigo-400" /> },
    { id: "opensource", label: "Open Source AI", icon: <Code className="w-4 h-4 text-emerald-400" /> },
    { id: "apis", label: "LLM APIs", icon: <Layers className="w-4 h-4 text-cyan-400" /> },
    { id: "research", label: "AI Research", icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: "security", label: "NPM Security", icon: <Shield className="w-4 h-4 text-red-400" /> },
  ];

  const quickTags = [
    "GPT",
    "Claude",
    "Gemini",
    "Cursor",
    "Copilot",
    "LangChain",
    "DeepSeek",
    "Agents",
    "MCP",
  ];

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedSource !== "all" ||
    selectedTag !== null ||
    showBookmarkedOnly;

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 select-none">
      {/* Header & Reset */}
      <div className="bg-card border border-border/80 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground tracking-tight">Feed Controls</h2>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset all filters"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Bookmarked Filter Toggle */}
        <button
          onClick={onToggleBookmarkedOnly}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            showBookmarkedOnly
              ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
              : "bg-accent/40 hover:bg-accent border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bookmark className={`w-4 h-4 ${showBookmarkedOnly ? "fill-current" : ""}`} />
            <span>Saved Bookmarks</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-background/30 font-bold font-mono">
            {bookmarkedCount}
          </span>
        </button>

        {/* Categories Section */}
        <div className="space-y-1 pt-2">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 pb-1">
            Categories
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isActive = !showBookmarkedOnly && selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (showBookmarkedOnly) onToggleBookmarkedOnly();
                    onSelectCategory(cat.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer border ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold border-primary/30"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-transparent"
                  }`}
                >
                  {cat.icon}
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Tag Filter */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2">
            Trending Tags
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {quickTags.map((tag) => {
              const isActive = selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => onSelectTag(isActive ? null : tag)}
                  className={`text-[11px] font-bold px-2 py-1 rounded transition-all cursor-pointer border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Sources Filter */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2">
            Intelligence Sources
          </div>
          <select
            value={selectedSource}
            onChange={(e) => onSelectSource(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Sources ({availableSources.length})</option>
            {availableSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* System Feed Status Footer */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 font-mono">
            <Radio className={`w-3 h-3 ${isOffline ? "text-amber-400" : "text-emerald-400 animate-pulse"}`} />
            <span>{isOffline ? "Offline Mode" : "Edge Sync Active"}</span>
          </div>
          <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded font-mono">15m TTL</span>
        </div>
      </div>
    </aside>
  );
};
