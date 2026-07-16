import { create } from "zustand";
import { getAdapter } from "@/lib/runtime/registry";
import { runtimeManager } from "@/lib/runtime/runtimeManager";
import { Snippet } from "@/lib/db/schema";

export interface Tab {
  id: string; // "new-scratch" or Snippet ID
  title: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface PlaygroundState {
  // Tabs State
  tabs: Tab[];
  activeTabId: string;
  
  // Database snippets list
  snippets: Snippet[];
  isLoadingSnippets: boolean;
  
  // Console Outputs
  consoleLogs: string[];
  consoleStatus: "idle" | "running" | "success" | "error";
  executionTimeMs: number;
  compilationError?: string;
  runtimeError?: string;
  warnings: string[];
  consoleOutput: string[];
  
  // Configuration
  autosaveEnabled: boolean;
  isAutosaving: boolean;
  theme: "vs-dark" | "light";

  // Actions
  fetchSnippets: () => Promise<void>;
  addTab: (tab: Omit<Tab, "isDirty">) => void;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  updateActiveTabContent: (content: string) => void;
  updateActiveTabTitle: (title: string) => void;
  updateActiveTabLanguage: (language: string) => void;
  
  // Execution & Formatting
  runActiveTabCode: () => Promise<void>;
  formatActiveTabCode: () => Promise<void>;
  validateActiveTabCode: () => { valid: boolean; error?: string };
  
  // CRUD
  saveActiveTab: () => Promise<string | null>;
  deleteSnippet: (snippetId: string) => Promise<void>;
  duplicateSnippet: (snippetId: string) => Promise<void>;
  
  setAutosaveEnabled: (enabled: boolean) => void;
  setTheme: (theme: "vs-dark" | "light") => void;
  clearConsole: () => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
  tabs: [
    {
      id: "scratch-js",
      title: "scratchpad.js",
      content: `// Code Playground - JavaScript Sandbox\n// Press "Run" or (Ctrl+Enter) to execute code\n\nconsole.log("Hello, World!");\n\n// Try creating loops or complex arrays\nconst numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconsole.log("Doubled numbers:", doubled);\n`,
      language: "javascript",
      isDirty: false,
    },
  ],
  activeTabId: "scratch-js",
  snippets: [],
  isLoadingSnippets: false,
  consoleLogs: [],
  consoleStatus: "idle",
  executionTimeMs: 0,
  compilationError: undefined,
  runtimeError: undefined,
  warnings: [],
  consoleOutput: [],
  autosaveEnabled: false,
  isAutosaving: false,
  theme: "vs-dark",

  fetchSnippets: async () => {
    set({ isLoadingSnippets: true });
    try {
      const res = await fetch("/api/snippets");
      if (res.ok) {
        const list = (await res.json()) as Snippet[];
        set({ snippets: list });
      }
    } catch (err) {
      console.error("Failed to fetch snippets:", err);
    } finally {
      set({ isLoadingSnippets: false });
    }
  },

  addTab: (newTab) => {
    const { tabs } = get();
    // If tab is already open, focus it
    if (tabs.some((t) => t.id === newTab.id)) {
      set({ activeTabId: newTab.id });
      return;
    }
    set({
      tabs: [...tabs, { ...newTab, isDirty: false }],
      activeTabId: newTab.id,
    });
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // Keep at least one tab open

    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    
    let newActiveId = activeTabId;
    if (activeTabId === tabId) {
      // Focus adjacent tab
      const nextActiveIndex = tabIndex === 0 ? 0 : tabIndex - 1;
      newActiveId = newTabs[nextActiveIndex].id;
    }

    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  updateActiveTabContent: (content) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId ? { ...t, content, isDirty: true } : t
      ),
    });
  },

  updateActiveTabTitle: (title) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId ? { ...t, title, isDirty: true } : t
      ),
    });
  },

  updateActiveTabLanguage: (language) => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    let title = activeTab.title;
    let content = activeTab.content;

    const lowerLang = language.toLowerCase();
    if (lowerLang === "javascript") {
      title = "scratchpad.js";
      content = `// Code Playground - JavaScript Sandbox\n// Press "Run" or (Ctrl+Enter) to execute code\n\nconsole.log("Hello, World!");\n\n// Try creating loops or complex arrays\nconst numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconsole.log("Doubled numbers:", doubled);\n`;
    } else if (lowerLang === "typescript") {
      title = "scratchpad.ts";
      content = `// TypeScript Sandbox\ninterface Employee {\n  id: number;\n  name: string;\n  role: string;\n}\n\nconst employees: Employee[] = [\n  { id: 1, name: "Naveen", role: "Frontend" },\n  { id: 2, name: "John", role: "Backend" },\n  { id: 3, name: "Alice", role: "QA" }\n];\n\nconsole.log("=== Employee List ===");\nfor (const emp of employees) {\n  console.log(\`\${emp.id} - \${emp.name} (\${emp.role})\`);\n}\n\nconst frontend: Employee[] = employees.filter(emp => emp.role === "Frontend");\nconsole.log("Frontend Team:", frontend);\n`;
    } else if (lowerLang === "python") {
      title = "scratchpad.py";
      content = `from datetime import datetime\n\nemployees = [\n  { "id": 1, "name": "Naveen", "role": "Frontend" },\n  { "id": 2, "name": "John", "role": "Backend" },\n  { "id": 3, "name": "Alice", "role": "QA" }\n]\n\nprint("=== Employee List ===")\nfor emp in employees:\n  print(f"{emp['id']} - {emp['name']} ({emp['role']})")\n\nprint()\nfrontend = list(filter(lambda x: x["role"] == "Frontend", employees))\nprint("Frontend Team")\nprint(frontend)\n\nprint()\nprint("Current Time:")\nprint(datetime.now())\n`;
    } else if (lowerLang === "java") {
      title = "Main.java";
      content = `import java.util.Arrays;\nimport java.util.List;\n\npublic class Main {\n  public static void main(String[] args) {\n    List<Employee> employees = Arrays.asList(\n      new Employee(1, "Naveen", "Frontend"),\n      new Employee(2, "John", "Backend"),\n      new Employee(3, "Alice", "QA")\n    );\n\n    System.out.println("Employee List");\n    for (Employee emp : employees) {\n      System.out.println(\n        emp.id + " | " + \n        emp.name + " | " + \n        emp.department\n      );\n    }\n\n    System.out.println();\n    System.out.println("Total Employees : " + employees.size());\n    System.out.println();\n    System.out.println("Application Finished");\n  } \n}\n\nclass Employee {\n  int id;\n  String name;\n  String department;\n\n  Employee(int id, String name, String department) {\n    this.id = id; \n    this.name = name;\n    this.department = department;\n  }\n}\n`;
    }

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId ? { ...t, language, title, content, isDirty: true } : t
      ),
    });
  },

  runActiveTabCode: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    set({ 
      consoleStatus: "running", 
      consoleLogs: ["Executing script..."],
      compilationError: undefined,
      runtimeError: undefined,
      warnings: [],
      consoleOutput: [],
    });

    // Check if there are any TS/JS compiler diagnostics (errors/warnings) inside Monaco editor model
    if (typeof window !== "undefined" && (window as any).monaco && (window as any).currentEditor) {
      const monaco = (window as any).monaco;
      const editor = (window as any).currentEditor;
      const model = editor.getModel();
      if (model && (activeTab.language === "javascript" || activeTab.language === "typescript")) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const errors = markers.filter((m: any) => m.severity === 8 || m.severity === 4);
        if (errors.length > 0) {
          const compilerErrors = errors.map((m: any) => {
            const lines = activeTab.content.split("\n");
            const errorLine = lines[m.startLineNumber - 1] || "";
            const underline = " ".repeat(Math.max(0, m.startColumn - 1)) + "~".repeat(Math.max(1, m.endColumn - m.startColumn));
            const filename = activeTab.language === "typescript" ? "main.ts" : "main.js";
            return `${filename}:${m.startLineNumber}:${m.startColumn} - error TS${m.code || "2304"}: ${m.message}\n\n${m.startLineNumber} | ${errorLine}\n  ${" ".repeat(String(m.startLineNumber).length)}| ${underline}`;
          });
          set({
            consoleLogs: compilerErrors.map((e: any) => `[ERROR] ${e}`),
            consoleStatus: "error",
            executionTimeMs: 0,
            compilationError: compilerErrors.join("\n"),
          });
          return;
        }
      }
    }

    const runtime = runtimeManager.getRuntime(activeTab.language);
    if (!runtime) {
      set({
        consoleStatus: "error",
        consoleLogs: [`[ERROR] Pluggable runtime for language "${activeTab.language}" not registered.`],
      });
      return;
    }

    try {
      const result = await runtime.execute(activeTab.content);
      const outputLogs = [...result.logs];
      if (result.error && !outputLogs.some(l => l.includes(result.error!))) {
        outputLogs.push(`[ERROR] ${result.error}`);
      }

      // Categorize logs
      const compilationError = result.compilationError;
      const runtimeError = result.error;
      const warnings = result.warnings || result.logs.filter(l => l.startsWith("[WARN]")).map(l => l.replace(/^\[WARN\]\s*/, ""));
      const consoleOutput = result.logs.filter(l => !l.startsWith("[ERROR]") && !l.startsWith("[WARN]"));

      set({
        consoleLogs: outputLogs.length > 0 ? outputLogs : ["Script executed successfully with no output."],
        consoleStatus: (result.error || result.compilationError) ? "error" : "success",
        executionTimeMs: result.timeMs,
        compilationError,
        runtimeError,
        warnings,
        consoleOutput,
      });
    } catch (err: any) {
      set({
        consoleStatus: "error",
        consoleLogs: [`[ERROR] Runtime exception: ${err.message}`],
        runtimeError: err.message,
      });
    }
  },

  formatActiveTabCode: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const adapter = getAdapter(activeTab.language);
    if (!adapter) return;

    try {
      const formatted = await adapter.format(activeTab.content);
      set({
        tabs: tabs.map((t) =>
          t.id === activeTabId ? { ...t, content: formatted, isDirty: true } : t
        ),
      });
    } catch (err) {
      console.error("Format failed:", err);
    }
  },

  validateActiveTabCode: () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return { valid: false, error: "No active tab" };

    // Try Monaco editor diagnostics first
    if (typeof window !== "undefined" && (window as any).monaco && (window as any).currentEditor) {
      const monaco = (window as any).monaco;
      const editor = (window as any).currentEditor;
      const model = editor.getModel();
      if (model && (activeTab.language === "javascript" || activeTab.language === "typescript")) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const errors = markers.filter((m: any) => m.severity === 8 || m.severity === 4);
        if (errors.length > 0) {
          return { valid: false, error: `${errors[0].message} (at Line ${errors[0].startLineNumber}:${errors[0].startColumn})` };
        }
      }
    }

    const adapter = getAdapter(activeTab.language);
    if (!adapter) return { valid: false, error: "Adapter not found" };

    const validation = adapter.validate(activeTab.content);
    return { valid: validation.valid, error: validation.error };
  },

  saveActiveTab: async () => {
    const { tabs, activeTabId, fetchSnippets } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const exists = get().snippets.some((s) => s.id === activeTab.id);
    const isNew = !exists;
    const method = isNew ? "POST" : "PUT";
    const endpoint = isNew ? "/api/snippets" : `/api/snippets/${activeTab.id}`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeTab.title,
          language: activeTab.language,
          content: activeTab.content,
        }),
      });

      if (res.ok) {
        const saved: Snippet = await res.json();
        
        // Update tab ID if it was newly created
        set({
          tabs: tabs.map((t) =>
            t.id === activeTabId
              ? { ...t, id: saved.id, isDirty: false }
              : t
          ),
          activeTabId: saved.id,
        });

        await fetchSnippets();
        return saved.id;
      }
    } catch (err) {
      console.error("Save snippet failed:", err);
    }
    return null;
  },

  deleteSnippet: async (snippetId) => {
    const { tabs, activeTabId, closeTab, fetchSnippets } = get();
    try {
      const res = await fetch(`/api/snippets/${snippetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // If the deleted snippet is open in any tab, close it
        if (tabs.some((t) => t.id === snippetId)) {
          closeTab(snippetId);
        }
        await fetchSnippets();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  },

  duplicateSnippet: async (snippetId) => {
    const { snippets, fetchSnippets } = get();
    const original = snippets.find((s) => s.id === snippetId);
    if (!original) return;

    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${original.title} (Copy)`,
          language: original.language,
          content: original.content,
        }),
      });

      if (res.ok) {
        await fetchSnippets();
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  },

  setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
  setTheme: (theme) => set({ theme }),
  clearConsole: () => set({ consoleLogs: [], consoleStatus: "idle", executionTimeMs: 0, compilationError: undefined, runtimeError: undefined, warnings: [], consoleOutput: [] }),
}));
