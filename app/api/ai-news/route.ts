import { NextRequest, NextResponse } from "next/server";
import { fetchAINewsFromSources } from "@/lib/tech-news/fetchAINews";
import { NewsTabType } from "@/types/ai-news";

export const runtime = "edge";

// Simple in-memory cache for edge instances
let cachedData: { data: any; timestamp: number; tab: string } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") as NewsTabType) || "ai-news";

    const now = Date.now();
    if (cachedData && cachedData.tab === tab && now - cachedData.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        { ...cachedData.data, cached: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
          },
        }
      );
    }

    const newsData = await fetchAINewsFromSources(tab);

    cachedData = {
      data: newsData,
      timestamp: now,
      tab,
    };

    return NextResponse.json(newsData, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("[API ai-news error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI news feed" },
      { status: 500 }
    );
  }
}
