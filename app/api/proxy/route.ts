import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { url, method, headers, body } = (await req.json()) as any;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
    }

    // Filter & sanitize restricted or host headers that edge fetch might reject
    const cleanHeaders: Record<string, string> = {};
    if (headers && typeof headers === "object") {
      Object.entries(headers).forEach(([k, v]) => {
        if (!k || typeof v !== "string") return;
        const lowerK = k.toLowerCase().trim();
        const restricted = ["host", "content-length", "connection", "accept-encoding", "transfer-encoding", "cf-ray", "cf-connecting-ip"];
        if (!restricted.includes(lowerK)) {
          cleanHeaders[k.trim()] = v.replace(/[\r\n]+/g, "").trim();
        }
      });
    }

    const fetchOptions: RequestInit = {
      method: (method || "GET").toUpperCase(),
      headers: cleanHeaders,
    };

    if (fetchOptions.method !== "GET" && fetchOptions.method !== "HEAD" && body !== undefined && body !== null) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const startTime = performance.now();
    let proxyRes: Response;
    try {
      proxyRes = await fetch(url, fetchOptions);
    } catch (fetchErr: any) {
      return NextResponse.json(
        {
          error: "Proxy Network Error",
          message: fetchErr.message || "Failed to reach target server.",
          suggestion: "Please verify endpoint server availability, DNS, or SSL certificates.",
        },
        { status: 502 }
      );
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const responseText = await proxyRes.text();
    const responseHeaders: Record<string, string> = {};
    proxyRes.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });

    return NextResponse.json({
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      durationMs,
      headers: responseHeaders,
      body: responseText,
    });
  } catch (error: any) {
    console.error("API Studio Proxy Error:", error);
    return NextResponse.json(
      {
        error: "Proxy Request Failed",
        message: error.message || "Failed to execute proxied HTTP request.",
      },
      { status: 502 }
    );
  }
}

