"use client";

import React from "react";
import { AINewsItem } from "@/types/ai-news";
import { NewsCard } from "./NewsCard";
import { AlertTriangle, RefreshCw, Newspaper } from "lucide-react";

interface NewsListProps {
  articles: AINewsItem[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onBookmarkToggle?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const NewsList: React.FC<NewsListProps> = ({
  articles,
  isLoading,
  error,
  onRetry,
  onBookmarkToggle,
  onSelectTag,
}) => {
  // Loading skeleton placeholder cards
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={`sk-${idx}`}
            className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3 animate-pulse"
          >
            <div className="h-40 w-full rounded-lg bg-accent/60" />
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-accent/80" />
              <div className="h-3 w-16 rounded bg-accent/80" />
            </div>
            <div className="h-5 w-3/4 rounded bg-accent/80" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full rounded bg-accent/60" />
              <div className="h-3 w-5/6 rounded bg-accent/60" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-4 w-12 rounded bg-accent/80" />
              <div className="h-4 w-16 rounded bg-accent/80" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state view with retry
  if (error && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-red-500/20 bg-red-500/5 space-y-4 my-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Failed to Load Developer Feeds</h3>
          <p className="text-xs text-muted-foreground max-w-md">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-sm shadow-primary/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    );
  }

  // Empty state view
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-border/80 bg-card/30 space-y-3 my-6">
        <Newspaper className="w-10 h-10 text-muted-foreground/50" />
        <h3 className="text-base font-bold text-foreground">No Matching Intelligence Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Try clearing your search query or adjusting your category and source filters.
        </p>
      </div>
    );
  }

  // Render active articles grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="feed">
      {articles.map((article) => (
        <NewsCard
          key={article.id}
          article={article}
          onBookmarkToggle={onBookmarkToggle}
          onSelectTag={onSelectTag}
        />
      ))}
    </div>
  );
};
