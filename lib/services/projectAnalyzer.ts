import JSZip from "jszip";

export interface ProjectAnalysisSummary {
  framework: string;
  language: "typescript" | "javascript" | "unknown";
  routes: string[];
  apiEndpoints: string[];
  components: string[];
  dependencies: Record<string, string>;
  projectType: "web" | "mobile" | "web_mobile" | "api" | "unknown";
  testFrameworksDetected: string[];
  suggestedSuites: Array<{
    name: string;
    description: string;
    platform: "web" | "mobile";
    suggestedCases: Array<{
      name: string;
      description: string;
      testType: "ui" | "api" | "e2e" | "negative";
      priority: "low" | "medium" | "high" | "critical";
    }>;
  }>;
}

/**
 * Safely extracts and analyzes a project ZIP archive.
 * Prevents path traversal vulnerabilities (`../../` injections).
 */
export async function analyzeProjectZip(zipBuffer: ArrayBuffer | Uint8Array | Buffer): Promise<ProjectAnalysisSummary> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBuffer);

  const files: Record<string, string> = {};
  const filePaths: string[] = [];

  // Iterate over files with path traversal security check
  for (const relativePath of Object.keys(loadedZip.files)) {
    const entry = loadedZip.files[relativePath];
    if (entry.dir) continue;

    // Path traversal protection check
    const normalized = relativePath.replace(/\\/g, "/");
    if (normalized.includes("../") || normalized.includes("/..")) {
      console.warn(`[Security Alert] Skipped unsafe zip entry path: ${relativePath}`);
      continue;
    }

    filePaths.push(normalized);

    // Read key small text files for analysis (e.g. package.json, source files under 100KB)
    if (
      normalized.endsWith("package.json") ||
      normalized.endsWith("tsconfig.json") ||
      (normalized.match(/\.(js|ts|jsx|tsx|json|html|vue|svelte|yaml|yml)$/) && !normalized.includes("node_modules/"))
    ) {
      try {
        const text = await entry.async("text");
        // Only index files smaller than 100KB to avoid memory overflow
        if (text.length < 100000) {
          files[normalized] = text;
        }
      } catch (err) {
        // Skip binary or unreadable files
      }
    }
  }

  // 1. Detect dependencies & framework from package.json
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let framework = "Unknown Web App";
  let language: "typescript" | "javascript" | "unknown" = "javascript";
  let projectType: "web" | "mobile" | "web_mobile" | "api" | "unknown" = "web";
  const testFrameworksDetected: string[] = [];

  const pkgPath = filePaths.find((p) => p.endsWith("package.json"));
  if (pkgPath && files[pkgPath]) {
    try {
      const pkgJson = JSON.parse(files[pkgPath]);
      dependencies = pkgJson.dependencies || {};
      devDependencies = pkgJson.devDependencies || {};
      const allDeps = { ...dependencies, ...devDependencies };

      if (allDeps["next"]) framework = "Next.js (React Framework)";
      else if (allDeps["react-scripts"] || allDeps["react"]) framework = "React Web App";
      else if (allDeps["vue"]) framework = "Vue.js Web App";
      else if (allDeps["@angular/core"]) framework = "Angular Application";
      else if (allDeps["express"] || allDeps["@nestjs/core"] || allDeps["fastify"]) framework = "Node.js REST API";
      else if (allDeps["react-native"] || allDeps["expo"]) {
        framework = "React Native / Expo Mobile App";
        projectType = "mobile";
      }

      if (allDeps["typescript"]) language = "typescript";
      if (allDeps["playwright"] || allDeps["@playwright/test"]) testFrameworksDetected.push("Playwright");
      if (allDeps["cypress"]) testFrameworksDetected.push("Cypress");
      if (allDeps["jest"]) testFrameworksDetected.push("Jest");
      if (allDeps["vitest"]) testFrameworksDetected.push("Vitest");
    } catch (e) {
      console.warn("Could not parse package.json");
    }
  }

  // Check tsconfig
  if (filePaths.some((p) => p.endsWith("tsconfig.json"))) {
    language = "typescript";
  }

  // 2. Discover UI Routes & Pages
  const routes: string[] = [];
  const apiEndpoints: string[] = [];
  const components: string[] = [];

  for (const filePath of filePaths) {
    // Next.js App Router / Pages Router
    if (filePath.includes("app/") || filePath.includes("pages/") || filePath.includes("src/pages/") || filePath.includes("src/app/")) {
      if (filePath.endsWith("page.tsx") || filePath.endsWith("page.jsx") || filePath.endsWith("page.js") || filePath.endsWith("index.tsx") || filePath.endsWith("index.jsx")) {
        let routePath = filePath
          .replace(/.*?(app|pages)\//, "/")
          .replace(/\/page\.(tsx|jsx|js|ts)$/, "")
          .replace(/\/index\.(tsx|jsx|js|ts)$/, "");
        if (routePath === "") routePath = "/";
        if (!routes.includes(routePath)) routes.push(routePath);
      }

      // Next.js API routes
      if (filePath.includes("/api/") || filePath.endsWith("route.ts") || filePath.endsWith("route.js")) {
        let apiPath = filePath
          .replace(/.*?(app|pages)\//, "/")
          .replace(/\/route\.(ts|js)$/, "")
          .replace(/\.(ts|js)$/, "");
        if (!apiEndpoints.includes(apiPath)) apiEndpoints.push(apiPath);
      }
    }

    // Component detection
    if (filePath.includes("components/") || filePath.includes("src/components/")) {
      const compName = filePath.split("/").pop()?.replace(/\.(tsx|jsx|js|ts|vue|svelte)$/, "");
      if (compName && !components.includes(compName)) {
        components.push(compName);
      }
    }

    // React Router route detection in App.tsx / index.tsx
    if (files[filePath] && (filePath.endsWith("App.tsx") || filePath.endsWith("App.jsx") || filePath.endsWith("routes.ts") || filePath.endsWith("routes.tsx"))) {
      const content = files[filePath];
      const routeRegex = /path=["']([^"']+)["']/g;
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        if (!routes.includes(match[1])) routes.push(match[1]);
      }
    }
  }

  // Fallback defaults if no routes found
  if (routes.length === 0) {
    routes.push("/", "/login", "/dashboard", "/settings");
  }

  // 3. Generate suggested initial Test Plan structure
  const suggestedSuites: ProjectAnalysisSummary["suggestedSuites"] = [
    {
      name: "Authentication & User Session Suite",
      description: "Verifies user login, password entry, session management, and logout behavior",
      platform: "web",
      suggestedCases: [
        {
          name: "Valid User Login Verification",
          description: "Submits correct login credentials and asserts successful navigation to the dashboard",
          testType: "ui",
          priority: "critical",
        },
        {
          name: "Invalid Credentials Negative Test",
          description: "Submits incorrect password and verifies validation error toast alert message",
          testType: "negative",
          priority: "high",
        },
      ],
    },
    {
      name: "Core Navigation & UI Smoke Suite",
      description: "Smoke test suite verifying primary navigation routes and UI headers",
      platform: "web",
      suggestedCases: routes.slice(0, 4).map((r) => ({
        name: `Route Navigation (${r === "/" ? "Home" : r})`,
        description: `Navigates to ${r} and verifies page title and core content container presence`,
        testType: "ui",
        priority: "medium" as const,
      })),
    },
  ];

  if (apiEndpoints.length > 0) {
    suggestedSuites.push({
      name: "REST API Endpoint Validation Suite",
      description: "Verifies key backend API endpoints return expected HTTP status codes and valid JSON payloads",
      platform: "web",
      suggestedCases: apiEndpoints.slice(0, 3).map((ep) => ({
        name: `API Request (${ep})`,
        description: `Dispatches GET request to ${ep} and validates HTTP 200 OK status`,
        testType: "api",
        priority: "high",
      })),
    });
  }

  if ((projectType as string) === "mobile" || (projectType as string) === "web_mobile") {
    suggestedSuites.push({
      name: "Mobile App Maestro Workflow Suite",
      description: "End-to-end mobile user journey testing using Maestro automation",
      platform: "mobile",
      suggestedCases: [
        {
          name: "App Launch & Onboarding Flow",
          description: "Launches mobile app, scrolls through onboarding screens, and taps main CTA",
          testType: "e2e",
          priority: "critical",
        },
      ],
    });
  }

  return {
    framework,
    language,
    routes,
    apiEndpoints,
    components: components.slice(0, 10),
    dependencies,
    projectType,
    testFrameworksDetected,
    suggestedSuites,
  };
}
