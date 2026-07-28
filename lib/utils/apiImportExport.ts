import { ApiCollection, ApiRequestItem } from "@/lib/store/workspaceStore";

/**
 * Parse Postman Collection v2.0 / v2.1 JSON into ApiCollection array
 */
export function parsePostmanCollection(jsonString: string): ApiCollection[] {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== "object") return [];

    const collectionName = data.info?.name || "Imported Postman Collection";
    const collectionDesc = data.info?.description || "";
    const requests: ApiRequestItem[] = [];

    // Helper to recursively parse items
    const extractItems = (items: any[]) => {
      if (!Array.isArray(items)) return;

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        // If item has nested items (folder)
        if (Array.isArray(item.item)) {
          extractItems(item.item);
          continue;
        }

        // It's a request item
        if (item.request) {
          const req = item.request;
          const method = (typeof req.method === "string" ? req.method.toUpperCase() : "GET") as ApiRequestItem["method"];

          // Parse URL
          let url = "";
          if (typeof req.url === "string") {
            url = req.url;
          } else if (req.url && typeof req.url === "object") {
            url = req.url.raw || "";
            if (!url && req.url.host) {
              const host = Array.isArray(req.url.host) ? req.url.host.join(".") : req.url.host;
              const path = Array.isArray(req.url.path) ? req.url.path.join("/") : req.url.path || "";
              const protocol = req.url.protocol || "http";
              url = `${protocol}://${host}/${path}`;
            }
          }

          if (!url) url = "https://api.example.com";

          // Parse Headers
          const headers: ApiRequestItem["headers"] = [];
          if (Array.isArray(req.header)) {
            for (const h of req.header) {
              if (h.key) {
                headers.push({
                  key: h.key,
                  value: h.value || "",
                  enabled: h.disabled !== true,
                });
              }
            }
          }

          // Parse Auth
          let auth: ApiRequestItem["auth"] = { type: "none" };
          if (req.auth) {
            if (req.auth.type === "bearer" && Array.isArray(req.auth.bearer)) {
              const tokenObj = req.auth.bearer.find((b: any) => b.key === "token");
              if (tokenObj) {
                auth = { type: "bearer", bearerToken: tokenObj.value || "" };
              }
            } else if (req.auth.type === "basic" && Array.isArray(req.auth.basic)) {
              const userObj = req.auth.basic.find((b: any) => b.key === "username");
              const passObj = req.auth.basic.find((b: any) => b.key === "password");
              auth = {
                type: "basic",
                basicUser: userObj?.value || "",
                basicPass: passObj?.value || "",
              };
            } else if (req.auth.type === "apikey" && Array.isArray(req.auth.apikey)) {
              const keyObj = req.auth.apikey.find((b: any) => b.key === "key");
              const valObj = req.auth.apikey.find((b: any) => b.key === "value");
              auth = {
                type: "apikey",
                apiKeyName: keyObj?.value || "X-API-Key",
                apiKeyValue: valObj?.value || "",
              };
            }
          }

          // Parse Body
          let bodyType: ApiRequestItem["bodyType"] = "none";
          let body = "{\n  \n}";
          const formData: ApiRequestItem["formData"] = [];

          if (req.body) {
            if (req.body.mode === "raw") {
              bodyType = "json";
              body = req.body.raw || "";
            } else if (req.body.mode === "urlencoded" || req.body.mode === "formdata") {
              bodyType = "form";
              const itemsList = req.body.urlencoded || req.body.formdata || [];
              if (Array.isArray(itemsList)) {
                for (const f of itemsList) {
                  if (f.key) {
                    formData.push({
                      key: f.key,
                      value: f.value || "",
                      enabled: f.disabled !== true,
                    });
                  }
                }
              }
            }
          }

          requests.push({
            id: crypto.randomUUID(),
            name: item.name || `${method} ${url}`,
            method,
            url,
            headers,
            auth,
            bodyType,
            body,
            formData,
          });
        }
      }
    };

    if (Array.isArray(data.item)) {
      extractItems(data.item);
    }

    const mainCol: ApiCollection = {
      id: crypto.randomUUID(),
      name: collectionName,
      description: collectionDesc,
      requests,
    };

    return [mainCol];
  } catch (err) {
    console.error("Failed to parse Postman collection:", err);
    return [];
  }
}

/**
 * Parse OpenAPI / Swagger JSON specification into ApiCollection array
 */
export function parseOpenApiSpec(jsonString: string): ApiCollection[] {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== "object" || !data.paths) return [];

    const title = data.info?.title || "OpenAPI Imported Collection";
    const baseUrl = data.servers && data.servers[0]?.url ? data.servers[0].url : "https://api.example.com";
    const requests: ApiRequestItem[] = [];

    const validMethods = ["get", "post", "put", "patch", "delete"];

    for (const [pathStr, pathItem] of Object.entries(data.paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      for (const methodKey of validMethods) {
        const op = (pathItem as any)[methodKey];
        if (!op) continue;

        const method = methodKey.toUpperCase() as ApiRequestItem["method"];
        const fullUrl = baseUrl.endsWith("/") || pathStr.startsWith("/") ? `${baseUrl.replace(/\/$/, "")}${pathStr}` : `${baseUrl}/${pathStr}`;
        const name = op.summary || op.operationId || `${method} ${pathStr}`;

        requests.push({
          id: crypto.randomUUID(),
          name,
          method,
          url: fullUrl,
          headers: [{ key: "Accept", value: "application/json", enabled: true }],
          auth: { type: "none" },
          bodyType: method === "GET" ? "none" : "json",
          body: "{\n  \n}",
          formData: [],
        });
      }
    }

    return [
      {
        id: crypto.randomUUID(),
        name: title,
        description: data.info?.description || "Imported OpenAPI Specification",
        requests,
      },
    ];
  } catch (err) {
    console.error("Failed to parse OpenAPI spec:", err);
    return [];
  }
}

/**
 * Export collections as Postman v2.1 JSON format
 */
export function exportAsPostmanCollection(collection: ApiCollection): string {
  const postmanFormat = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description || "",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: collection.requests.map((req) => ({
      name: req.name || `${req.method} ${req.url}`,
      request: {
        method: req.method,
        header: req.headers.map((h) => ({
          key: h.key,
          value: h.value,
          disabled: !h.enabled,
        })),
        url: {
          raw: req.url,
        },
        body: req.bodyType === "json" ? {
          mode: "raw",
          raw: req.body,
          options: {
            raw: {
              language: "json",
            },
          },
        } : undefined,
      },
    })),
  };

  return JSON.stringify(postmanFormat, null, 2);
}

/**
 * Parse a cURL command into an ApiCollection
 */
export function parseCurlCommand(curlStr: string): ApiCollection[] {
  try {
    let method: ApiRequestItem["method"] = "GET";
    let url = "https://api.example.com";
    const headers: ApiRequestItem["headers"] = [];
    let body = "{\n  \n}";
    let bodyType: ApiRequestItem["bodyType"] = "none";

    // Extract method
    const methodMatch = curlStr.match(/-X\s+([A-Z]+)/i) || curlStr.match(/--request\s+([A-Z]+)/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase() as ApiRequestItem["method"];
    }

    // Extract URL
    const urlMatch = curlStr.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
    if (urlMatch) {
      url = urlMatch[1];
    }

    // Extract headers
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = headerRegex.exec(curlStr)) !== null) {
      const parts = match[1].split(":");
      if (parts.length >= 2) {
        headers.push({
          key: parts[0].trim(),
          value: parts.slice(1).join(":").trim(),
          enabled: true,
        });
      }
    }

    // Extract body data
    const dataMatch = curlStr.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/s);
    if (dataMatch) {
      body = dataMatch[1];
      bodyType = "json";
      if (method === "GET") method = "POST";
    }

    const req: ApiRequestItem = {
      id: crypto.randomUUID(),
      name: `${method} ${url.replace(/^https?:\/\//, "")}`,
      method,
      url,
      headers,
      auth: { type: "none" },
      bodyType,
      body,
      formData: [],
    };

    return [
      {
        id: crypto.randomUUID(),
        name: "cURL Import",
        description: "Imported from cURL command",
        requests: [req],
      },
    ];
  } catch (err) {
    console.error("Failed to parse cURL command:", err);
    return [];
  }
}

/**
 * Parse HAR (HTTP Archive) JSON into ApiCollection
 */
export function parseHarSpec(jsonString: string): ApiCollection[] {
  try {
    const data = JSON.parse(jsonString);
    if (!data?.log?.entries || !Array.isArray(data.log.entries)) return [];

    const requests: ApiRequestItem[] = [];

    for (const entry of data.log.entries) {
      if (!entry.request) continue;
      const req = entry.request;
      const method = (req.method || "GET").toUpperCase() as ApiRequestItem["method"];
      const url = req.url || "https://api.example.com";

      const headers: ApiRequestItem["headers"] = (req.headers || []).map((h: any) => ({
        key: h.name,
        value: h.value,
        enabled: true,
      }));

      let bodyType: ApiRequestItem["bodyType"] = "none";
      let body = "{\n  \n}";
      if (req.postData?.text) {
        bodyType = "json";
        body = req.postData.text;
      }

      requests.push({
        id: crypto.randomUUID(),
        name: `${method} ${url.split("?")[0].split("/").pop() || url}`,
        method,
        url,
        headers,
        auth: { type: "none" },
        bodyType,
        body,
        formData: [],
      });
    }

    return [
      {
        id: crypto.randomUUID(),
        name: "HAR Imported Collection",
        description: "Imported from HTTP Archive (HAR)",
        requests,
      },
    ];
  } catch (err) {
    console.error("Failed to parse HAR spec:", err);
    return [];
  }
}

/**
 * Export collection as OpenAPI 3.0 JSON specification
 */
export function exportAsOpenApiSpec(collection: ApiCollection): string {
  const openApiDoc: any = {
    openapi: "3.0.0",
    info: {
      title: collection.name,
      description: collection.description || "Exported OpenAPI specification",
      version: "1.0.0",
    },
    paths: {},
  };

  for (const req of collection.requests) {
    try {
      const urlObj = new URL(req.url);
      const path = urlObj.pathname || "/";
      if (!openApiDoc.paths[path]) {
        openApiDoc.paths[path] = {};
      }

      const methodKey = req.method.toLowerCase();
      openApiDoc.paths[path][methodKey] = {
        summary: req.name,
        responses: {
          "200": {
            description: "Successful response",
          },
        },
      };

      if (req.bodyType === "json" && req.body) {
        openApiDoc.paths[path][methodKey].requestBody = {
          content: {
            "application/json": {
              example: JSON.parse(req.body || "{}"),
            },
          },
        };
      }
    } catch {
      // Ignore URL parsing errors for template variables
    }
  }

  return JSON.stringify(openApiDoc, null, 2);
}

/**
 * Export request as cURL command
 */
export function exportAsCurlCommand(req: ApiRequestItem): string {
  const parts = [`curl -X ${req.method} "${req.url}"`];

  for (const h of req.headers || []) {
    if (h.enabled && h.key) {
      parts.push(`-H "${h.key}: ${h.value}"`);
    }
  }

  if (req.auth?.type === "bearer" && req.auth.bearerToken) {
    parts.push(`-H "Authorization: Bearer ${req.auth.bearerToken}"`);
  }

  if (req.bodyType === "json" && req.body) {
    const minified = JSON.stringify(JSON.parse(req.body || "{}"));
    parts.push(`-d '${minified}'`);
  }

  return parts.join(" \\\n  ");
}

