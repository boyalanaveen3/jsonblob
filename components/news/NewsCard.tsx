"use client";

import React, { useState } from "react";
import { AINewsItem } from "@/types/ai-news";
import {
  ExternalLink,
  Clock,
  Bookmark,
  Share2,
  Sparkles,
  Shield,
  Cpu,
  Code,
  Box,
  Layers,
  Terminal,
} from "lucide-react";

interface NewsCardProps {
  article: AINewsItem;
  onBookmarkToggle?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onBookmarkToggle,
  onSelectTag,
}) => {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "models":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case "tools":
        return <Terminal className="w-3.5 h-3.5 text-blue-400" />;
      case "frameworks":
        return <Box className="w-3.5 h-3.5 text-indigo-400" />;
      case "opensource":
        return <Code className="w-3.5 h-3.5 text-emerald-400" />;
      case "apis":
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case "security":
        return <Shield className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(article.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article
      className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
      aria-label={article.title}
    >
      {/* Top Media / Thumbnail Section */}
      <div className="space-y-3">
        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-accent/40">
          {!imageError && article.thumbnail ? (
            <img
              src={article.thumbnail}
              alt={article.title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/30 to-indigo-900/20">
              {getCategoryIcon(article.category)}
            </div>
          )}

          {/* Category Badge Overlay */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground shadow-sm border border-border/50">
            {getCategoryIcon(article.category)}
            <span className="capitalize">{article.category}</span>
          </div>

          {/* Bookmark Button Overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmarkToggle?.(article.id);
            }}
            aria-label={article.isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
              article.isBookmarked
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${article.isBookmarked ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Source & Time Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="font-semibold text-primary/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {article.source}
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {article.timeAgo}
            </span>
            <span>•</span>
            <span>{article.readTimeMinutes} min read</span>
          </div>
        </div>

        {/* Article Title */}
        <h3 className="font-bold text-base tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus:outline-none focus:underline"
          >
            {article.title}
          </a>
        </h3>

        {/* Article Summary */}
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {article.summary}
        </p>

        {/* Tags / Keywords Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {article.badges.map((badge, idx) => (
            <span
              key={`b-${idx}`}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
            >
              {badge}
            </span>
          ))}

          {article.tags.map((tag, idx) => (
            <button
              key={`t-${idx}`}
              onClick={() => onSelectTag?.(tag)}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer border border-border/50"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer text-[11px] font-medium"
          title="Copy Link to Clipboard"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? "Copied Link!" : "Share"}</span>
        </button>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-bold text-xs text-primary hover:text-primary/80 transition-colors group/link cursor-pointer"
          aria-label={`Open ${article.title} in new tab`}
        >
          <span>Open in new tab</span>
          <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </article>
  );
};
