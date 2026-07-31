"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AICategory,
  AINewsItem,
  AINewsResponse,
  NewsTabType,
  TrendingKeyword,
} from "@/types/ai-news";

const LOCAL_STORAGE_KEY = "dev_intel_ai_news_cache";
const BOOKMARKS_STORAGE_KEY = "dev_intel_bookmarks";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function useAINews(initialTab: NewsTabType = "ai-news") {
  const [articles, setArticles] = useState<AINewsItem[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NewsTabType>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<AICategory | "all">("all");
  const [selectedSource, setSelectedSource] = useState<string | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  // Load bookmarks from local storage
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (storedBookmarks) {
        setBookmarkedIds(JSON.parse(storedBookmarks));
      }
    } catch {
      // Ignore local storage error
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  // Fetch AI News with caching & offline fallback
  const loadAINews = useCallback(
    async (forceFetch: boolean = false) => {
      setIsLoading(true);
      setError(null);

      // Check local cache if not forcing refresh
      if (!forceFetch && typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${activeTab}`);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as { data: AINewsResponse; timestamp: number };
            if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
              setArticles(parsed.data.items || []);
              setTrendingKeywords(parsed.data.trendingKeywords || []);
              setUpdatedAt(parsed.data.updatedAt || new Date().toISOString());
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Ignore cache parse errors
        }
      }

      try {
        const res = await fetch(`/api/ai-news?tab=${activeTab}`);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = (await res.json()) as AINewsResponse;

        setArticles(data.items || []);
        setTrendingKeywords(data.trendingKeywords || []);
        setUpdatedAt(data.updatedAt || new Date().toISOString());

        // Cache in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${LOCAL_STORAGE_KEY}_${activeTab}`,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        }
      } catch (err: any) {
        console.error("[useAINews]: Fetch failed, loading offline fallback.", err);
        setError("Unable to connect to news feeds. Displaying cached developer intelligence.");

        // Fallback to cached items or local offline backup
        try {
          const cachedRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${activeTab}`);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as { data: AINewsResponse };
            setArticles(parsed.data.items || []);
            setTrendingKeywords(parsed.data.trendingKeywords || []);
          }
        } catch {
          // Ignore fallback error
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadAINews();
  }, [loadAINews]);

  // Toggle bookmark function
  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  // Compute filtered articles with memoization
  const filteredArticles = useMemo(() => {
    return articles
      .map((art) => ({
        ...art,
        isBookmarked: bookmarkedIds.includes(art.id),
      }))
      .filter((art) => {
        // Category filter
        if (selectedCategory !== "all" && art.category !== selectedCategory) {
          return false;
        }

        // Source filter
        if (selectedSource !== "all" && art.source !== selectedSource) {
          return false;
        }

        // Tag filter
        if (selectedTag && !art.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = art.title.toLowerCase().includes(q);
          const matchesSummary = art.summary.toLowerCase().includes(q);
          const matchesSource = art.source.toLowerCase().includes(q);
          const matchesTags = art.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesSummary && !matchesSource && !matchesTags) {
            return false;
          }
        }

        return true;
      });
  }, [articles, bookmarkedIds, selectedCategory, selectedSource, selectedTag, searchQuery]);

  // Compute unique sources for filter sidebar
  const availableSources = useMemo(() => {
    const sources = articles.map((a) => a.source);
    return Array.from(new Set(sources));
  }, [articles]);

  return {
    articles: filteredArticles,
    allArticles: articles,
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
    refetch: () => loadAINews(true),
  };
}
