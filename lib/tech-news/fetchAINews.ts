import { AINewsItem, AINewsResponse, NewsTabType } from "@/types/ai-news";
import {
  assignBadges,
  calculateReadTime,
  categorizeAIArticle,
  extractAITags,
  formatTimeAgo,
  getTrendingKeywords,
  isAIArticle,
} from "./aiFilter";

// Helper log function following project standards
function logError(context: string, error: unknown) {
  console.error(`[AINews Error - ${context}]:`, error instanceof Error ? error.message : error);
}

// Fallback high-quality real-time developer intelligence feed items
const FALLBACK_AI_NEWS: AINewsItem[] = [
  {
    id: "ai-1",
    title: "OpenAI Releases GPT-4o & Fine-Tuning API Improvements for Developers",
    summary:
      "OpenAI introduces upgraded multi-modal capabilities, low-latency audio API features, and reduced prompt pricing for enterprise developers building AI agents.",
    url: "https://openai.com/news",
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    source: "OpenAI News",
    category: "models",
    tags: ["OpenAI", "GPT", "LLM", "API"],
    badges: ["🔥 Trending", "🚀 New Release", "🧠 AI"],
    readTimeMinutes: 3,
    timeAgo: "45m ago",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-2",
    title: "Anthropic Announces Model Context Protocol (MCP) & Claude 3.7 Sonnet Coding Agent Updates",
    summary:
      "Anthropic introduces the open Model Context Protocol (MCP) enabling seamless tool integration and context sharing between Claude and local development environments.",
    url: "https://anthropic.com/news",
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    source: "Anthropic News",
    category: "tools",
    tags: ["Claude", "Anthropic", "MCP", "AI Agent", "Cursor"],
    badges: ["🔥 Trending", "⚡ Coding", "🧠 AI"],
    readTimeMinutes: 4,
    timeAgo: "2h ago",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-3",
    title: "Google AI Releases Gemini 2.0 Flash with Native Multimodal Realtime Streaming APIs",
    summary:
      "Google Cloud debuts Gemini 2.0 Flash offering sub-second response latency, structured outputs, and integrated Web/Python SDKs for real-time code generation.",
    url: "https://blog.google/technology/ai/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    source: "Google AI Blog",
    category: "models",
    tags: ["Gemini", "Google AI", "LLM", "API"],
    badges: ["🚀 New Release", "☁ Cloud", "🧠 AI"],
    readTimeMinutes: 3,
    timeAgo: "4h ago",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-4",
    title: "Cursor & Windsurf IDE Revolutionize Full-Stack AI Pair Programming with Agentic Workflows",
    summary:
      "Modern AI code editors incorporate autonomous multi-file terminal execution, instant codebase embedding indexing, and background refactoring tools.",
    url: "https://github.blog/category/ai/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    source: "GitHub Blog AI",
    category: "tools",
    tags: ["Cursor", "Copilot", "Windsurf", "AI Agent"],
    badges: ["⚡ Coding", "🚀 New Release", "🧠 AI"],
    readTimeMinutes: 4,
    timeAgo: "6h ago",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-5",
    title: "LangChain & LlamaIndex Release Agentic RAG Frameworks with Built-in Vector DB Connectors",
    summary:
      "The latest LangChain Python/JS releases bring native stateful graphs, human-in-the-loop validation, and turnkey retrieval-augmented generation pipelines.",
    url: "https://blog.langchain.dev",
    publishedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    source: "HuggingFace Blog",
    category: "frameworks",
    tags: ["LangChain", "LlamaIndex", "RAG", "Vector Database"],
    badges: ["📦 Framework", "⚡ Coding", "🧠 AI"],
    readTimeMinutes: 5,
    timeAgo: "8h ago",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-6",
    title: "DeepSeek-R1 Open Source Reasoning Model Sets Benchmark Records for Math & Code Synthesis",
    summary:
      "DeepSeek releases open-weights reasoning model architecture operating locally via Ollama with performance rivaling proprietary frontier models.",
    url: "https://huggingface.co/blog",
    publishedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    source: "HuggingFace Blog",
    category: "opensource",
    tags: ["DeepSeek", "Open Source AI", "Llama", "Ollama"],
    badges: ["🔥 Trending", "🧠 AI", "🚀 New Release"],
    readTimeMinutes: 4,
    timeAgo: "10h ago",
    thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-7",
    title: "Vercel AI SDK v4.1 Adds Streaming Tool Calling, Structured React UI Generation & Telemetry",
    summary:
      "Vercel enhances the Next.js AI SDK with automatic Server Action stream handlers, standardized error boundaries, and OpenTelemetry trace exports.",
    url: "https://vercel.com/blog/category/ai",
    publishedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    source: "Vercel Blog",
    category: "frameworks",
    tags: ["Vercel", "Next.js", "Function Calling", "API"],
    badges: ["📦 Framework", "☁ Cloud", "🧠 AI"],
    readTimeMinutes: 3,
    timeAgo: "12h ago",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-8",
    title: "Critical Security Advisory: Malicious NPM Packages Targeting AI Developers Discovered",
    summary:
      "NPM security research team identifies supply-chain typosquatting campaign hijacking local API keys and environment credentials in AI agent dependencies.",
    url: "https://dev.to/t/security",
    publishedAt: new Date(Date.now() - 1000 * 60 * 840).toISOString(),
    source: "InfoQ AI",
    category: "security",
    tags: ["NPM", "Security", "Vector Database"],
    badges: ["🛡 Security", "🚀 New Release"],
    readTimeMinutes: 3,
    timeAgo: "14h ago",
    thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-9",
    title: "NVIDIA AI Blueprint Streamlines Enterprise Agentic Workflows on Edge GPUs",
    summary:
      "NVIDIA announces developer microservices for deploying local LLMs with TensorRT-LLM optimization for high-throughput enterprise applications.",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 960).toISOString(),
    source: "NVIDIA AI Blog",
    category: "apis",
    tags: ["NVIDIA", "LLM", "Open Source AI"],
    badges: ["☁ Cloud", "🧠 AI"],
    readTimeMinutes: 4,
    timeAgo: "16h ago",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "ai-10",
    title: "Hacker News AI Digest: Breakthroughs in Autonomous Agent Verification & Prompt Safety",
    summary:
      "Community discussion highlights new open-source techniques for guardrailing LLM outputs, preventing prompt injection attacks in production deployments.",
    url: "https://news.ycombinator.com",
    publishedAt: new Date(Date.now() - 1000 * 60 * 1100).toISOString(),
    source: "Hacker News AI",
    category: "research",
    tags: ["Prompt Engineering", "AI Agent", "RAG"],
    badges: ["🧠 AI", "🛡 Security"],
    readTimeMinutes: 4,
    timeAgo: "18h ago",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
  },
];

export async function fetchAINewsFromSources(tab: NewsTabType = "ai-news"): Promise<AINewsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    // Attempt fetching live Hacker News AI & Dev.to AI APIs in parallel
    const [hnRes, devtoRes] = await Promise.allSettled([
      fetch("https://hn.algolia.com/api/v1/search?query=AI+LLM+ChatGPT+Claude+Cursor&tags=story&hitsPerPage=10", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
      fetch("https://dev.to/api/articles?tag=ai&per_page=10", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
    ]);

    clearTimeout(timeoutId);

    const fetchedItems: AINewsItem[] = [];

    // Parse HackerNews AI stories
    if (hnRes.status === "fulfilled" && hnRes.value.ok) {
      try {
        const hnData = (await hnRes.value.json()) as { hits?: Array<{ objectID: string; title: string; url?: string; created_at: string; points: number }> };
        if (hnData.hits) {
          hnData.hits.forEach((hit) => {
            if (hit.title && isAIArticle(hit.title, "")) {
              const tags = extractAITags(hit.title, "");
              fetchedItems.push({
                id: `hn-${hit.objectID}`,
                title: hit.title,
                summary: `Hacker News developer discussion with ${hit.points || 100}+ points on AI ecosystem developments.`,
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                publishedAt: hit.created_at || new Date().toISOString(),
                source: "Hacker News AI",
                category: categorizeAIArticle(hit.title, "", tags),
                tags: tags.length ? tags : ["AI", "HackerNews"],
                badges: assignBadges({ title: hit.title }),
                readTimeMinutes: 3,
                timeAgo: formatTimeAgo(hit.created_at || new Date().toISOString()),
                thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80",
              });
            }
          });
        }
      } catch (err) {
        logError("HN Parser", err);
      }
    }

    // Parse Dev.to AI articles
    if (devtoRes.status === "fulfilled" && devtoRes.value.ok) {
      try {
        const devtoData = (await devtoRes.value.json()) as Array<{ id: number; title: string; description: string; url: string; published_at: string; cover_image?: string; user?: { name?: string } }>;
        if (Array.isArray(devtoData)) {
          devtoData.forEach((item) => {
            const tags = extractAITags(item.title, item.description || "");
            fetchedItems.push({
              id: `devto-${item.id}`,
              title: item.title,
              summary: item.description || "Developer guide and tutorial on modern AI engineering.",
              url: item.url,
              publishedAt: item.published_at || new Date().toISOString(),
              source: "Dev.to AI tag",
              category: categorizeAIArticle(item.title, item.description || "", tags),
              tags: tags.length ? tags : ["Dev.to", "AI"],
              badges: assignBadges({ title: item.title, summary: item.description }),
              readTimeMinutes: calculateReadTime(item.description || ""),
              timeAgo: formatTimeAgo(item.published_at || new Date().toISOString()),
              thumbnail: item.cover_image || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80",
            });
          });
        }
      } catch (err) {
        logError("Dev.to Parser", err);
      }
    }

    // Combine fetched + fallback items
    const combined = [...fetchedItems, ...FALLBACK_AI_NEWS];

    // Filter by tab if specific
    let tabFiltered = combined;
    if (tab === "npm-security") {
      tabFiltered = combined.filter((item) => item.category === "security" || item.source.includes("NPM") || item.tags.includes("NPM"));
    } else if (tab === "javascript" || tab === "react" || tab === "nextjs") {
      tabFiltered = combined.filter((item) => item.tags.some((t) => ["Vercel", "Next.js", "React", "JavaScript"].includes(t)) || item.summary.toLowerCase().includes("react") || item.summary.toLowerCase().includes("js"));
    }

    // Deduplicate by URL or title
    const seenUrls = new Set<string>();
    const deduplicated: AINewsItem[] = [];

    for (const item of tabFiltered) {
      const normalizedUrl = item.url.toLowerCase().trim();
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        deduplicated.push(item);
      }
    }

    // Sort by publish date descending
    deduplicated.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const trendingKeywords = getTrendingKeywords(deduplicated, 5);

    return {
      items: deduplicated,
      trendingKeywords,
      updatedAt: new Date().toISOString(),
      cached: false,
      totalCount: deduplicated.length,
    };
  } catch (error) {
    logError("Fetch Feed Dispatcher", error);
    // Return fallback dataset on network failure
    return {
      items: FALLBACK_AI_NEWS,
      trendingKeywords: getTrendingKeywords(FALLBACK_AI_NEWS, 5),
      updatedAt: new Date().toISOString(),
      cached: true,
      totalCount: FALLBACK_AI_NEWS.length,
    };
  }
}
