export type AICategory =
  | "models"
  | "tools"
  | "frameworks"
  | "opensource"
  | "apis"
  | "research"
  | "security"
  | "general";

export type NewsTabType =
  | "ai-news"
  | "news"
  | "npm-security"
  | "javascript"
  | "react"
  | "nextjs"
  | "cloud"
  | "devops";

export interface AINewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  category: AICategory;
  thumbnail?: string;
  tags: string[];
  badges: string[];
  readTimeMinutes: number;
  timeAgo: string;
  isBookmarked?: boolean;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
}

export interface AINewsResponse {
  items: AINewsItem[];
  trendingKeywords: TrendingKeyword[];
  updatedAt: string;
  cached: boolean;
  totalCount: number;
}

export interface AINewsFilterOptions {
  query?: string;
  category?: AICategory | "all";
  source?: string | "all";
  tag?: string | null;
  tab?: NewsTabType;
}
