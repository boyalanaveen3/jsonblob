"use client";

import React, { useState } from "react";
import { useAINews } from "@/hooks/useAINews";
import { NewsList } from "./NewsList";
import { DeveloperIntelligenceSidebar } from "./DeveloperIntelligenceSidebar";
import { AICategory, NewsTabType } from "@/types/ai-news";
import {
  Sparkles,
  Search,
  RefreshCw,
  Flame,
  Newspaper,
  ShieldAlert,
  Code2,
  Atom,
  Layers,
  Cloud,
  Terminal,
  WifiOff,
  Filter,
} from "lucide-react";

export const DeveloperIntelligenceView: React.FC = () => {
  const {
    articles,
    trendingKeywords,
    isLoading,
    error,
    activeTab,
    selectedCategory,
    selectedSource,
    selectedTag,
    searchQuery,
    isOffline,
    bookmarkedIds,
    availableSources,
    updatedAt,
    setActiveTab,
    setSelectedCategory,
    setSelectedSource,
    setSelectedTag,
    setSearchQuery,
    toggleBookmark,
    refetch,
  } = useAINews("ai-news");

  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const tabs: Array<{ id: NewsTabType; label: string; icon: React.ReactNode }> = [
    { id: "ai-news", label: "AI News", icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: "news", label: "News", icon: <Newspaper className="w-4 h-4 text-blue-400" /> },
    { id: "npm-security", label: "NPM Security", icon: <ShieldAlert className="w-4 h-4 text-red-400" /> },
    { id: "javascript", label: "JavaScript", icon: <Code2 className="w-4 h-4 text-amber-400" /> },
    { id: "react", label: "React", icon: <Atom className="w-4 h-4 text-cyan-400" /> },
    { id: "nextjs", label: "Next.js", icon: <Layers className="w-4 h-4 text-foreground" /> },
    { id: "cloud", label: "Cloud", icon: <Cloud className="w-4 h-4 text-indigo-400" /> },
    { id: "devops", label: "DevOps", icon: <Terminal className="w-4 h-4 text-emerald-400" /> },
  ];

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSelectedSource("all");
    setSelectedTag(null);
    setSearchQuery("");
    setShowBookmarkedOnly(false);
  };

  // Filter bookmarked articles if bookmarked filter is active
  const displayedArticles = showBookmarkedOnly
    ? articles.filter((a) => a.isBookmarked)
    : articles;

  // Render categorized section arrays when on AI News tab and no specific search/filter is active
  const isDefaultFeed =
    activeTab === "ai-news" &&
    selectedCategory === "all" &&
    selectedSource === "all" &&
    !selectedTag &&
    !searchQuery.trim() &&
    !showBookmarkedOnly;

  const sectionMap: Record<AICategory, { title: string; subtitle: string; icon: React.ReactNode }> = {
    models: {
      title: "Latest AI Models",
      subtitle: "Frontier LLM releases, multimodal benchmarks, and reasoning models",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    },
    tools: {
      title: "AI Coding Tools",
      subtitle: "Agentic IDEs, AI pair programmers, and developer productivity tools",
      icon: <Terminal className="w-4 h-4 text-blue-400" />,
    },
    frameworks: {
      title: "AI Frameworks",
      subtitle: "Orchestration, RAG chains, and agent state management frameworks",
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
    },
    opensource: {
      title: "Open Source AI",
      subtitle: "Local LLMs, open weights, Ollama runtime, and community models",
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
    },
    apis: {
      title: "LLM APIs & Infrastructure",
      subtitle: "Model Context Protocol (MCP), vector DBs, embeddings, and API endpoints",
      icon: <Cloud className="w-4 h-4 text-cyan-400" />,
    },
    research: {
      title: "AI Research & Papers",
      subtitle: "Breakthrough paper reviews, safety alignment, and prompt engineering",
      icon: <Atom className="w-4 h-4 text-amber-400" />,
    },
    security: {
      title: "NPM & AI Security",
      subtitle: "Supply-chain advisories, credential protection, and security patches",
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
    },
    general: {
      title: "General Tech & Ecosystem",
      subtitle: "Industry news, platform updates, and developer insights",
      icon: <Newspaper className="w-4 h-4 text-muted-foreground" />,
    },
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* ================= HEADER SECTION ================= */}
      <header className="px-4 md:px-8 pt-6 pb-4 border-b border-border/80 bg-card/40 shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Developer Intelligence
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Latest AI, Security, JavaScript, Frameworks and Developer Ecosystem
            </p>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search GPT, Claude, Cursor, Agents, Copilot, Gemini..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-colors shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={refetch}
              disabled={isLoading}
              className="p-2 border border-border hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh News Feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 border border-border hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground md:hidden transition-colors cursor-pointer"
              title="Toggle Filters Sidebar"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none border-t border-border/50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  handleResetFilters();
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                    : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ================= MAIN CONTENT & SIDEBAR CONTAINER ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Mobile Sidebar */}
        <div
          className={`${
            mobileSidebarOpen ? "block" : "hidden"
          } md:block p-4 md:p-6 overflow-y-auto border-r border-border/80 bg-card/20 shrink-0`}
        >
          <DeveloperIntelligenceSidebar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            availableSources={availableSources}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            showBookmarkedOnly={showBookmarkedOnly}
            onToggleBookmarkedOnly={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            bookmarkedCount={bookmarkedIds.length}
            isOffline={isOffline}
            onResetFilters={handleResetFilters}
          />
        </div>

        {/* Main Feed Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Offline Warning Banner */}
          {isOffline && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>You are currently offline. Showing cached developer intelligence feed.</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">Updated: {new Date(updatedAt).toLocaleTimeString()}</span>
            </div>
          )}

          {/* 🔥 TRENDING AI BANNER */}
          {trendingKeywords.length > 0 && (
            <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/15 to-accent/30 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>🔥 Trending AI Today:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {trendingKeywords.map((item) => (
                  <button
                    key={item.keyword}
                    onClick={() => setSearchQuery(item.keyword)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-2xs"
                  >
                    {item.keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Search & Filter Indicator Header */}
          {(searchQuery || selectedTag || selectedCategory !== "all" || selectedSource !== "all" || showBookmarkedOnly) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Filtered Results</span>
                <span>({displayedArticles.length} articles)</span>
                {selectedTag && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">#{selectedTag}</span>}
                {searchQuery && <span className="bg-accent text-foreground px-2 py-0.5 rounded font-mono">"{searchQuery}"</span>}
              </div>
              <button
                onClick={handleResetFilters}
                className="text-primary hover:underline font-semibold cursor-pointer text-xs"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Feed Content Rendering */}
          {isDefaultFeed ? (
            /* Categorized Sectioned View for AI News Tab */
            <div className="space-y-10">
              {(["models", "tools", "frameworks", "opensource", "apis", "research", "security"] as AICategory[]).map(
                (catKey) => {
                  const catArticles = displayedArticles.filter((a) => a.category === catKey);
                  if (catArticles.length === 0) return null;
                  const sec = sectionMap[catKey];

                  return (
                    <section key={catKey} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="space-y-0.5">
                          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                            {sec.icon}
                            <span>{sec.title}</span>
                          </h2>
                          <p className="text-xs text-muted-foreground">{sec.subtitle}</p>
                        </div>
                        <button
                          onClick={() => setSelectedCategory(catKey)}
                          className="text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          View all ({catArticles.length}) →
                        </button>
                      </div>

                      <NewsList
                        articles={catArticles.slice(0, 3)}
                        isLoading={isLoading}
                        error={error}
                        onRetry={refetch}
                        onBookmarkToggle={toggleBookmark}
                        onSelectTag={(t) => setSelectedTag(t)}
                      />
                    </section>
                  );
                }
              )}
            </div>
          ) : (
            /* Grid View for Filtered / Tabbed View */
            <NewsList
              articles={displayedArticles}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
              onBookmarkToggle={toggleBookmark}
              onSelectTag={(t) => setSelectedTag(t)}
            />
          )}
        </main>
      </div>
    </div>
  );
};
