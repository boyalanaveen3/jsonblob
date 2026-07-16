"use client";

import { useEffect, useState } from "react";
import { usePlaygroundStore, Tab } from "@/lib/store/playgroundStore";
import {
  FolderOpen,
  Plus,
  Search,
  FileCode,
  Edit2,
  Trash2,
  Copy,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react";

export function Sidebar() {
  const {
    snippets,
    isLoadingSnippets,
    activeTabId,
    fetchSnippets,
    addTab,
    deleteSnippet,
    duplicateSnippet,
    saveActiveTab,
  } = usePlaygroundStore();

  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(true);
  const [showSnippets, setShowSnippets] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingVal, setRenamingVal] = useState("");

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  // Default code template presets
  const templates = [
    {
      id: "template-arrays",
      title: "array-manipulation.js",
      content: `// Preset: Array Operations (map, filter, reduce)\nconst products = [\n  { name: "Laptop", price: 1200, category: "Electronics" },\n  { name: "Phone", price: 800, category: "Electronics" },\n  { name: "Book", price: 15, category: "Books" },\n  { name: "Desk", price: 150, category: "Furniture" }\n];\n\nconsole.log("Original products:", products);\n\n// 1. Filter expensive electronics\nconst premiumElectronics = products\n  .filter(p => p.price > 500 && p.category === "Electronics");\nconsole.log("Premium Electronics:", premiumElectronics);\n\n// 2. Compute total inventory value\nconst totalValue = products.reduce((sum, p) => sum + p.price, 0);\nconsole.log("Total Shop Value: $" + totalValue);\n`,
      language: "javascript",
    },
    {
      id: "template-async",
      title: "async-fetch.js",
      content: `// Preset: Async/Await Promises\nconsole.log("Starting network request simulation...");\n\nfunction delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\n\nasync function simulateFetch() {\n  await delay(1000);\n  console.log("1. Connected to mock service");\n  await delay(800);\n  console.log("2. Data headers retrieved");\n  await delay(500);\n  return { success: true, payload: { id: 101, status: "Active" } };\n}\n\nsimulateFetch().then(res => {\n  console.log("Finished! Results:", res);\n});\n`,
      language: "javascript",
    },
    {
      id: "template-json",
      title: "json-parsing.js",
      content: `// Preset: JSON Parser Sandbox\nconst rawJson = '{"platform":"JSONBlob","tier":"SaaS","active":true,"limits":{"maxSize":5000000}}';\nconsole.log("Raw JSON String:", rawJson);\n\ntry {\n  const parsed = JSON.parse(rawJson);\n  console.log("Parsed JSON Object:", parsed);\n  console.log("Limits Max Size:", parsed.limits.maxSize);\n\n  // Convert back with formatting\n  const formatted = JSON.stringify(parsed, null, 2);\n  console.log("Beautified JSON:\\n" + formatted);\n} catch (err) {\n  console.error("JSON parsing error:", err.message);\n}\n`,
      language: "javascript",
    },
    {
      id: "template-python",
      title: "sum-range.py",
      content: `# Preset: Python Sum & List Operations\nprint("Python Sandbox Running...")\nnumbers = [1, 2, 3, 4, 5]\ndoubled = []\nfor n in numbers:\n    doubled.append(n * 2)\nprint("Original list:", numbers)\nprint("Doubled list:", doubled)\n\ntotal = 0\nfor x in range(1, 10):\n    total += x\nprint("Sum of range(1, 10) is:", total)\n`,
      language: "python",
    },
    {
      id: "template-java",
      title: "HelloWorld.java",
      content: `// Preset: Java Class and Methods\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Java Sandbox Running...");\n        int result = add(10, 20);\n        System.out.println("Result of 10 + 20 is: " + result);\n    }\n\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}\n`,
      language: "java",
    },
  ];

  const handleCreateNew = () => {
    const scratchId = `scratch-${Date.now()}`;
    addTab({
      id: scratchId,
      title: "untitled.js",
      content: `// New script file\nconsole.log("Hello, Playground!");\n`,
      language: "javascript",
    });
  };

  const handleSnippetClick = (s: typeof snippets[number]) => {
    addTab({
      id: s.id,
      title: s.title,
      content: s.content,
      language: s.language,
    });
  };

  const handleStartRename = (s: typeof snippets[number], e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(s.id);
    setRenamingVal(s.title);
  };

  const handleSaveRename = async (s: typeof snippets[number]) => {
    if (!renamingVal.trim()) return;
    try {
      await fetch(`/api/snippets/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: renamingVal.trim(),
          language: s.language,
          content: s.content,
        }),
      });
      setRenamingId(null);
      fetchSnippets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this snippet?")) {
      await deleteSnippet(id);
    }
  };

  const handleDuplicateClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateSnippet(id);
  };

  const filteredSnippets = snippets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header and Add Button */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
          Explorer
        </span>
        <button
          onClick={handleCreateNew}
          title="New Script Snippet"
          className="flex items-center justify-center p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Snippet Search */}
      <div className="p-3 shrink-0 border-b border-border">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.25 bg-background border border-border rounded-md text-xs outline-none focus:border-muted-foreground transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Saved Snippets List */}
        <div>
          <button
            onClick={() => setShowSnippets(!showSnippets)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground py-1 px-1 transition-colors uppercase tracking-wider"
          >
            <div className="flex items-center gap-1">
              {showSnippets ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved Snippets</span>
            </div>
            <span className="text-[10px] bg-muted px-1.5 py-0.25 rounded-full font-mono">
              {filteredSnippets.length}
            </span>
          </button>

          {showSnippets && (
            <div className="mt-1 space-y-0.5 pl-1">
              {isLoadingSnippets ? (
                <div className="text-[11px] text-muted-foreground p-2 italic">Loading...</div>
              ) : filteredSnippets.length === 0 ? (
                <div className="text-[11px] text-muted-foreground p-2 italic">No snippets found</div>
              ) : (
                filteredSnippets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSnippetClick(s)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                      activeTabId === s.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileCode className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      {renamingId === s.id ? (
                        <input
                          type="text"
                          value={renamingVal}
                          onChange={(e) => setRenamingVal(e.target.value)}
                          onBlur={() => handleSaveRename(s)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(s);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                          className="bg-background border border-border rounded px-1 py-0.5 text-xs w-full outline-none focus:border-violet-500"
                        />
                      ) : (
                        <span className="truncate">{s.title}</span>
                      )}
                    </div>

                    {renamingId !== s.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartRename(s, e)}
                          title="Rename"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDuplicateClick(s.id, e)}
                          title="Duplicate"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(s.id, e)}
                          title="Delete"
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Preset Templates List */}
        <div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground py-1 px-1 transition-colors uppercase tracking-wider"
          >
            {showTemplates ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <BookOpen className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>

          {showTemplates && (
            <div className="mt-1 space-y-0.5 pl-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => addTab({ id: t.id, title: t.title, content: t.content, language: t.language })}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                    activeTabId === t.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
