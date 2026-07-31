import { AICategory, AINewsItem, TrendingKeyword } from "@/types/ai-news";

export const AI_KEYWORDS = [
  "GPT",
  "ChatGPT",
  "Claude",
  "Anthropic",
  "Gemini",
  "OpenAI",
  "Llama",
  "DeepSeek",
  "Mistral",
  "LLM",
  "Generative AI",
  "Agent",
  "AI Agent",
  "Copilot",
  "Cursor",
  "Claude Code",
  "Codex",
  "Windsurf",
  "CrewAI",
  "LangChain",
  "LlamaIndex",
  "AutoGen",
  "RAG",
  "Embedding",
  "Vector Database",
  "MCP",
  "Function Calling",
  "Prompt Engineering",
  "Open Source AI",
  "Transformer",
  "Ollama",
  "Qwen",
  "Groq",
] as const;

export function isAIArticle(title: string, summary: string): boolean {
  const combined = `${title} ${summary}`.toLowerCase();
  return AI_KEYWORDS.some((kw) => combined.includes(kw.toLowerCase()));
}

export function extractAITags(title: string, summary: string): string[] {
  const combined = `${title} ${summary}`.toLowerCase();
  const matched: string[] = [];

  for (const kw of AI_KEYWORDS) {
    const kwLower = kw.toLowerCase();
    // Word boundary regex for accurate matching
    const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(combined)) {
      matched.push(kw);
    }
  }

  // Deduplicate and prioritize primary tags
  return Array.from(new Set(matched)).slice(0, 5);
}

export function categorizeAIArticle(
  title: string,
  summary: string,
  tags: string[]
): AICategory {
  const text = `${title} ${summary}`.toLowerCase();

  if (
    text.includes("security") ||
    text.includes("vulnerability") ||
    text.includes("cve") ||
    text.includes("exploit") ||
    text.includes("npm")
  ) {
    return "security";
  }

  if (
    text.includes("cursor") ||
    text.includes("copilot") ||
    text.includes("windsurf") ||
    text.includes("claude code") ||
    text.includes("codex") ||
    text.includes("ide") ||
    text.includes("editor") ||
    text.includes("code assistant")
  ) {
    return "tools";
  }

  if (
    text.includes("langchain") ||
    text.includes("llamaindex") ||
    text.includes("crewai") ||
    text.includes("autogen") ||
    text.includes("framework") ||
    text.includes("library") ||
    text.includes("sdk")
  ) {
    return "frameworks";
  }

  if (
    text.includes("llama") ||
    text.includes("deepseek") ||
    text.includes("mistral") ||
    text.includes("open source") ||
    text.includes("ollama") ||
    text.includes("qwen") ||
    text.includes("huggingface")
  ) {
    return "opensource";
  }

  if (
    text.includes("api") ||
    text.includes("mcp") ||
    text.includes("function calling") ||
    text.includes("vector database") ||
    text.includes("embedding") ||
    text.includes("endpoint") ||
    text.includes("groq")
  ) {
    return "apis";
  }

  if (
    text.includes("paper") ||
    text.includes("research") ||
    text.includes("benchmark") ||
    text.includes("architecture") ||
    text.includes("dataset") ||
    text.includes("reasoning")
  ) {
    return "research";
  }

  if (
    text.includes("gpt") ||
    text.includes("claude") ||
    text.includes("gemini") ||
    text.includes("openai") ||
    text.includes("anthropic") ||
    text.includes("model")
  ) {
    return "models";
  }

  return "general";
}

export function assignBadges(article: Partial<AINewsItem>): string[] {
  const text = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
  const badges: string[] = ["🧠 AI"];

  if (text.includes("release") || text.includes("announce") || text.includes("launch") || text.includes("v1.") || text.includes("v2.") || text.includes("new")) {
    badges.push("🚀 New Release");
  }

  if (text.includes("code") || text.includes("coding") || text.includes("cursor") || text.includes("copilot") || text.includes("developer")) {
    badges.push("⚡ Coding");
  }

  if (text.includes("framework") || text.includes("langchain") || text.includes("sdk")) {
    badges.push("📦 Framework");
  }

  if (text.includes("cloud") || text.includes("vercel") || text.includes("aws") || text.includes("azure")) {
    badges.push("☁ Cloud");
  }

  if (text.includes("security") || text.includes("cve") || text.includes("vulnerability")) {
    badges.push("🛡 Security");
  }

  return Array.from(new Set(badges)).slice(0, 3);
}

export function calculateReadTime(summary: string): number {
  const wordCount = summary.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 40));
}

export function formatTimeAgo(publishedAt: string): string {
  try {
    const pubDate = new Date(publishedAt);
    if (isNaN(pubDate.getTime())) return "Recently";

    const diffMs = Date.now() - pubDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${Math.max(1, diffMins)}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return pubDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export function getTrendingKeywords(
  articles: AINewsItem[],
  limit: number = 5
): TrendingKeyword[] {
  const counts: Record<string, number> = {};

  const priorityKeyTerms = [
    "GPT-6",
    "Claude",
    "Gemini",
    "Cursor",
    "LangChain",
    "DeepSeek",
    "OpenAI",
    "Copilot",
    "Llama",
    "MCP",
    "Agents",
    "RAG",
  ];

  for (const article of articles) {
    const text = `${article.title} ${article.summary}`.toLowerCase();

    for (const term of priorityKeyTerms) {
      if (text.includes(term.toLowerCase())) {
        counts[term] = (counts[term] || 0) + 1;
      }
    }

    for (const tag of article.tags) {
      if (!priorityKeyTerms.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(counts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length < limit) {
    // Fill with fallback defaults if fewer than limit
    const defaults = ["GPT-6", "Claude", "Gemini", "Cursor", "LangChain"];
    for (const def of defaults) {
      if (!sorted.some(s => s.keyword.toLowerCase() === def.toLowerCase())) {
        sorted.push({ keyword: def, count: 1 });
      }
    }
  }

  return sorted.slice(0, limit);
}
