"use client";

import Link from "next/link";
import { usePlaygroundStore } from "@/lib/store/playgroundStore";
import { getSupportedLanguages } from "@/lib/runtime/registry";
import {
  Play,
  Save,
  FileCode,
  Copy,
  Download,
  Sun,
  Moon,
  ArrowLeft,
  Sparkles,
  Share2,
} from "lucide-react";
import { useState } from "react";

export function Toolbar() {
  const {
    tabs,
    activeTabId,
    theme,
    isAutosaving,
    runActiveTabCode,
    formatActiveTabCode,
    saveActiveTab,
    updateActiveTabLanguage,
    setTheme,
  } = usePlaygroundStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const languages = getSupportedLanguages();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!activeTab) return;
    try {
      await navigator.clipboard.writeText(activeTab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab.title.includes(".")
      ? activeTab.title
      : `${activeTab.title}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (!activeTab) return;
    const shareUrl = `${window.location.origin}/playground?code=${encodeURIComponent(activeTab.content)}&lang=${activeTab.language}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Shareable workspace link copied to clipboard!");
  };

  return (
    <header className="h-14 border-b border-border bg-card/65 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {/* Back to JSON Blob Workspace */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md border border-border bg-background/50 hover:bg-background"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>JSON Blob Workspace</span>
        </Link>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/10">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent hidden sm:inline-block">
            CodePlayground
          </span>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="flex items-center gap-2">
        {/* Language Selection */}
        {activeTab && (
          <div className="relative">
            <select
              value={activeTab.language}
              onChange={(e) => updateActiveTabLanguage(e.target.value)}
              className="bg-background border border-border text-xs rounded-md pl-3 pr-8 py-1.5 font-medium outline-none cursor-pointer hover:border-muted-foreground focus:ring-1 focus:ring-ring appearance-none min-w-[100px]"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
              ▼
            </div>
          </div>
        )}

        <div className="h-4 w-px bg-border" />

        {/* Action: Format */}
        <button
          onClick={formatActiveTabCode}
          title="Format Code"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          <FileCode className="w-4 h-4" />
        </button>

        {/* Action: Copy */}
        <button
          onClick={handleCopy}
          title="Copy Code"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors relative"
        >
          <Copy className={`w-4 h-4 transition-transform ${copied ? "scale-110 text-emerald-500" : ""}`} />
          {copied && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded shadow">
              Copied
            </span>
          )}
        </button>

        {/* Action: Download */}
        <button
          onClick={handleDownload}
          title="Download Code"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Action: Share */}
        <button
          onClick={handleShare}
          title="Share Workspace Link"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Theme Selector */}
        <button
          onClick={() => setTheme(theme === "vs-dark" ? "light" : "vs-dark")}
          title="Toggle Editor Theme"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          {theme === "vs-dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Save Button */}
        <button
          onClick={saveActiveTab}
          disabled={isAutosaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-muted border border-border rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer text-foreground"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        {/* Run Button */}
        <button
          onClick={runActiveTabCode}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-md text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>
      </div>
    </header>
  );
}
