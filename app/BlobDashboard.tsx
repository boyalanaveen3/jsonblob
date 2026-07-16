"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  Copy,
  Download,
  Check,
  FileJson,
  Moon,
  Sun,
  Loader2,
  RefreshCw,
  CheckSquare,
  AlertCircle,
  X,
  RotateCcw,
  Terminal,
  BookOpen,
  Edit2,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JsonTreeView } from "@/components/editor/JsonTreeView";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@/components/editor/MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-background">
      Loading Editor...
    </div>
  ),
});

const MonacoDiffEditor = dynamic(() => import("@/components/editor/MonacoDiffEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-background">
      Loading Diff Editor...
    </div>
  ),
});
import { type Blob } from "@/lib/db/schema";
import { signOutAction } from "@/actions/auth";

interface BlobDashboardProps {
  initialBlobs: Blob[];
  initialSelectedBlob?: Blob | null;
  initialUserName?: string | null;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

const TEMPLATES = [
  {
    id: "template-simple",
    title: "Simple Key-Value",
    content: JSON.stringify({ hello: "world", active: true, count: 1 }, null, 2),
  },
  {
    id: "template-config",
    title: "API Gateway Config",
    content: JSON.stringify({
      gateway: {
        version: "2.4.1",
        environment: "production",
        routes: [
          { path: "/users", service: "user-service", rateLimit: 100 },
          { path: "/billing", service: "billing-service", rateLimit: 50 }
        ]
      }
    }, null, 2),
  }
];

export default function BlobDashboard({
  initialBlobs,
  initialSelectedBlob,
  initialUserName,
}: BlobDashboardProps) {
  const router = useRouter();
  // --- States ---
  const [blobsList, setBlobsList] = useState<Blob[]>(initialBlobs);
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(initialSelectedBlob || null);

  // Editor values
  const [title, setTitle] = useState(initialSelectedBlob ? initialSelectedBlob.title : "Untitled Blob");
  const [content, setContent] = useState(
    initialSelectedBlob
      ? initialSelectedBlob.content
      : "{\n  \"welcome\": \"JSON Blob MVP\",\n  \"status\": \"ready\"\n}"
  );

  // UI states
  const [search, setSearch] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<"tree" | "diff">("tree");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingVal, setRenamingVal] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "viewer">("editor");

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auth User Session
  const [userName, setUserName] = useState<string | null>(initialUserName || null);

  useEffect(() => {
    const stored = localStorage.getItem("user_name");
    if (stored && !userName) {
      setUserName(stored);
    }
  }, [userName]);

  // Transitions for async operations
  const [isPending, startTransition] = useTransition();

  // --- Sync State with URL Route changes ---
  useEffect(() => {
    if (initialSelectedBlob) {
      setSelectedBlob(initialSelectedBlob);
      setTitle(initialSelectedBlob.title);
      setContent(initialSelectedBlob.content);
    }
  }, [initialSelectedBlob]);

  // --- Initial Theme Sync ---
  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  // --- Helper: Add Toast ---
  const showToast = (type: "success" | "error" | "info", message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- Parse & Live Validate JSON ---
  const isValidJson = useMemo(() => {
    if (!content.trim()) {
      return false;
    }
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }, [content]);

  // Update validation message
  useEffect(() => {
    if (!content.trim()) {
      setValidationError("Content is empty");
      return;
    }
    try {
      JSON.parse(content);
      setValidationError(null);
    } catch (e: any) {
      setValidationError(e.message);
    }
  }, [content]);

  // --- Autosave Effect ---
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (!title.trim() || !isValidJson) return;

    // Check if the content is actually different from the current saved state
    if (selectedBlob && content === selectedBlob.content && title === selectedBlob.title) return;

    const delayDebounce = setTimeout(() => {
      setIsAutosaving(true);
      startTransition(async () => {
        try {
          if (selectedBlob) {
            // Update existing blob
            const fetchRes = await fetch(`/api/blobs/${selectedBlob.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, content }),
            });
            if (fetchRes.ok) {
              const updatedBlob = (await fetchRes.json()) as Blob;
              const listRes = await fetch("/api/blobs");
              if (listRes.ok) {
                const updatedList = (await listRes.json()) as Blob[];
                setBlobsList(updatedList);
              }
              setSelectedBlob(updatedBlob);
            } else {
              const errData = await fetchRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
              console.error("Autosave failed:", errData.error);
              showToast("error", `Autosave failed: ${errData.error || "Unknown error"}`);
            }
          } else {
            // Create new blob (Register & Redirect)
            const fetchRes = await fetch("/api/blobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, content }),
            });
            if (fetchRes.ok) {
              const newBlob = (await fetchRes.json()) as Blob;
              showToast("success", "Autosaved & registered workspace");
              const listRes = await fetch("/api/blobs");
              if (listRes.ok) {
                const updatedList = (await listRes.json()) as Blob[];
                setBlobsList(updatedList);
              }
              setSelectedBlob(newBlob);
              router.push(`/${newBlob.id}`);
            } else {
              const errData = await fetchRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
              console.error("Autosave creation failed:", errData.error);
              showToast("error", `Autosave failed: ${errData.error || "Unknown error"}`);
            }
          }
        } catch (err: any) {
          console.error("Autosave error:", err);
          showToast("error", `Autosave error: ${err.message}`);
        } finally {
          setIsAutosaving(false);
        }
      });
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [content, title, autosaveEnabled, selectedBlob, isValidJson, router]);

  const handleSignOut = async () => {
    try {
      await signOutAction();
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_email");
      setUserName(null);
      setBlobsList([]);
      setSelectedBlob(null);
      setContent(JSON.stringify({ welcome: "JSON Blob MVP", status: "ready" }, null, 2));
      setTitle("Untitled Blob");
      router.push("/");
      showToast("success", "Signed out successfully");
    } catch (err: any) {
      showToast("error", `Failed to sign out: ${err.message}`);
    }
  };

  // --- Filtered Blobs ---
  const filteredBlobs = useMemo(() => {
    if (!search.trim()) return blobsList;
    return blobsList.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.content.toLowerCase().includes(search.toLowerCase())
    );
  }, [blobsList, search]);

  // --- Handle Select Blob ---
  const handleSelectBlob = (blob: Blob) => {
    setSelectedBlob(blob);
    setTitle(blob.title);
    setContent(blob.content);
    router.push(`/${blob.id}`);
  };

  // --- Handle New Blob ---
  const handleNewBlob = () => {
    setSelectedBlob(null);
    setTitle("Untitled Blob");
    setContent(JSON.stringify({ hello: "world", count: 1, active: true }, null, 2));
    router.push("/");
    showToast("info", "Created new blank workspace");
  };

  // --- Handle Clear Workspace ---
  const handleClear = () => {
    setContent("{\n  \n}");
    showToast("info", "Workspace cleared");
  };

  // --- Handle Reset Workspace ---
  const handleReset = () => {
    if (selectedBlob) {
      setContent(selectedBlob.content);
      setTitle(selectedBlob.title);
      showToast("info", "Workspace reset to saved database state");
    } else {
      setContent(JSON.stringify({ hello: "world", count: 1, active: true }, null, 2));
      setTitle("Untitled Blob");
      showToast("info", "Workspace reset to template");
    }
  };

  // --- Action: Format/Beautify ---
  const handleBeautify = () => {
    try {
      const parsed = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      showToast("success", "Formatted successfully");
    } catch (e: any) {
      showToast("error", `Format failed: ${e.message}`);
    }
  };

  // --- Action: Validate ---
  const handleValidate = () => {
    try {
      JSON.parse(content);
      showToast("success", "Valid JSON syntax");
    } catch (e: any) {
      showToast("error", `JSON invalid: ${e.message}`);
    }
  };

  // --- Action: Copy ---
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast("success", "Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Action: Download ---
  const handleDownload = () => {
    try {
      const blob = new window.Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.trim().replace(/\s+/g, "_") || "blob"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", "Downloaded JSON file");
    } catch (error: any) {
      showToast("error", "Download failed");
    }
  };

  // --- Action: Save/Create/Update ---
  const handleSave = () => {
    if (!title.trim()) {
      showToast("error", "Title cannot be empty");
      return;
    }
    if (!isValidJson) {
      showToast("error", "Cannot save: Invalid JSON");
      return;
    }

    startTransition(async () => {
      if (selectedBlob) {
        // Update
        try {
          const fetchRes = await fetch(`/api/blobs/${selectedBlob.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          });
          if (fetchRes.ok) {
            const updatedBlob = (await fetchRes.json()) as Blob;
            showToast("success", "Blob updated successfully");
            const listRes = await fetch("/api/blobs");
            if (listRes.ok) {
              const updatedList = (await listRes.json()) as Blob[];
              setBlobsList(updatedList);
            }
            setSelectedBlob(updatedBlob);
            router.push(`/${updatedBlob.id}`);
          } else {
            const errData = await fetchRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
            showToast("error", errData.error || "Failed to update blob");
          }
        } catch (err: any) {
          showToast("error", err.message || "Failed to update blob");
        }
      } else {
        // Create
        try {
          const fetchRes = await fetch("/api/blobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          });
          if (fetchRes.ok) {
            const newBlob = (await fetchRes.json()) as Blob;
            showToast("success", "Blob created successfully");
            const listRes = await fetch("/api/blobs");
            if (listRes.ok) {
              const updatedList = (await listRes.json()) as Blob[];
              setBlobsList(updatedList);
            }
            setSelectedBlob(newBlob);
            router.push(`/${newBlob.id}`);
          } else {
            const errData = await fetchRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
            showToast("error", errData.error || "Failed to create blob");
          }
        } catch (err: any) {
          showToast("error", err.message || "Failed to create blob");
        }
      }
    });
  };

  // --- Action: Delete ---
  const handleDelete = () => {
    if (!selectedBlob) return;
    startTransition(async () => {
      try {
        const fetchRes = await fetch(`/api/blobs/${selectedBlob.id}`, {
          method: "DELETE",
        });
        if (fetchRes.ok) {
          showToast("success", "Blob deleted successfully");
          setShowDeleteConfirm(false);
          const listRes = await fetch("/api/blobs");
          let updatedList: Blob[] = [];
          if (listRes.ok) {
            updatedList = (await listRes.json()) as Blob[];
            setBlobsList(updatedList);
          }
          // Reset to new workspace or first blob
          if (updatedList.length > 0) {
            handleSelectBlob(updatedList[0]);
          } else {
            handleNewBlob();
          }
        } else {
          const errData = await fetchRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
          showToast("error", errData.error || "Failed to delete blob");
        }
      } catch (err: any) {
        showToast("error", err.message || "Failed to delete blob");
      }
    });
  };

  // --- Inline Sidebar Actions: Rename & Delete (like CodePlayground) ---
  const handleStartRename = (blob: Blob, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(blob.id);
    setRenamingVal(blob.title);
  };

  const handleSaveRename = async (blob: Blob) => {
    if (!renamingVal.trim()) return;
    try {
      const fetchRes = await fetch(`/api/blobs/${blob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: renamingVal.trim(),
          content: blob.content,
        }),
      });
      if (fetchRes.ok) {
        showToast("success", "Blob renamed successfully");
        setRenamingId(null);
        // Refresh list
        const listRes = await fetch("/api/blobs");
        if (listRes.ok) {
          const updatedList = (await listRes.json()) as Blob[];
          setBlobsList(updatedList);
        }
        // If it's the currently selected blob, update selectedBlob and title states
        if (selectedBlob?.id === blob.id) {
          setSelectedBlob({ ...blob, title: renamingVal.trim() });
          setTitle(renamingVal.trim());
        }
      } else {
        showToast("error", "Failed to rename blob");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to rename blob");
    }
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this blob?")) {
      startTransition(async () => {
        try {
          const fetchRes = await fetch(`/api/blobs/${id}`, {
            method: "DELETE",
          });
          if (fetchRes.ok) {
            showToast("success", "Blob deleted successfully");
            const listRes = await fetch("/api/blobs");
            let updatedList: Blob[] = [];
            if (listRes.ok) {
              updatedList = (await listRes.json()) as Blob[];
              setBlobsList(updatedList);
            }
            // If the deleted blob was the active one, redirect to first or new
            if (selectedBlob?.id === id) {
              if (updatedList.length > 0) {
                handleSelectBlob(updatedList[0]);
              } else {
                handleNewBlob();
              }
            }
          } else {
            showToast("error", "Failed to delete blob");
          }
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete blob");
        }
      });
    }
  };

  // Compute lines & size stats
  const stats = useMemo(() => {
    const lines = content.split("\n").length;
    const bytes = new TextEncoder().encode(content).length;
    const kb = (bytes / 1024).toFixed(2);
    return { lines, kb };
  }, [content]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Backdrop Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-80 flex flex-col border-r border-border bg-card transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 select-none">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 shadow-md shadow-primary/20 text-primary-foreground font-extrabold text-sm tracking-tighter">
              {"{"}
              <span className="text-[8.5px] text-primary-foreground/90 absolute mt-0.5 font-semibold">JS</span>
              {"}"}
            </div>
            <span className="font-bold text-sm tracking-tight">
              JSON<span className="text-primary/95">Blob</span>
              <span className="text-[9px] font-semibold text-primary/85 ml-1 border border-primary/25 px-1 rounded-sm bg-primary/5">SaaS</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {userName ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] flex items-center justify-center cursor-default uppercase"
                  title={`Logged in as ${userName}`}
                >
                  {userName.charAt(0)}
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-2 py-1 text-[9px] font-bold border border-red-500/20 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href="/auth"
                className="px-2 py-1 text-[10px] font-bold border border-border hover:bg-accent rounded-md transition-colors"
                title="Sign In / Sign Up"
              >
                Sign In
              </a>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/playground"
              className="p-2 border border-border hover:bg-accent rounded-md transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              title="Go to Code Playground"
            >
              <Terminal className="w-4 h-4" />
            </Link>
            <button
              onClick={handleNewBlob}
              className="p-2 bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-opacity flex items-center justify-center"
              title="New Blob"
            >
              <Plus className="w-4 h-4" />
            </button>
            {/* Close button for mobile menu */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md md:hidden transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search blobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:border-muted-foreground transition-colors"
            />
          </div>
        </div>

        {/* Templates Section */}
        <div className="p-3 border-b border-border bg-accent/5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase mb-2">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Templates</span>
          </div>
          <div className="space-y-1">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedBlob(null);
                  setTitle(tmpl.title);
                  setContent(tmpl.content);
                  router.push("/");
                  showToast("info", `Loaded template: ${tmpl.title}`);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent hover:text-foreground transition-all truncate block text-muted-foreground border border-transparent hover:border-border cursor-pointer"
              >
                {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* My Blobs Title Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase">My Blobs</span>
          {userName && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              {filteredBlobs.length} saved
            </span>
          )}
        </div>

        {/* List of Blobs */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!userName ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground my-auto h-64">
              <FileJson className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs font-medium mb-3">Sign in to save and sync your JSON blobs</p>
              <a
                href="/auth"
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-opacity"
              >
                Sign In
              </a>
            </div>
          ) : filteredBlobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground my-auto h-64">
              <FileJson className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs font-medium mb-3">No blobs yet</p>
              <button
                onClick={handleNewBlob}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-opacity cursor-pointer"
              >
                Create Blob
              </button>
            </div>
          ) : (
            filteredBlobs.map((blob) => {
              const isActive = selectedBlob?.id === blob.id;
              const formattedDate = new Date(blob.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <div
                  key={blob.id}
                  onClick={() => handleSelectBlob(blob)}
                  className={`group w-full text-left p-3 rounded-md transition-all border flex flex-col gap-1.5 cursor-pointer relative ${isActive
                      ? "bg-accent border-muted-foreground"
                      : "bg-transparent border-transparent hover:bg-accent/50"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    {renamingId === blob.id ? (
                      <input
                        type="text"
                        value={renamingVal}
                        onChange={(e) => setRenamingVal(e.target.value)}
                        onBlur={() => handleSaveRename(blob)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(blob);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="bg-background border border-border rounded px-1.5 py-0.5 text-xs w-full outline-none focus:border-primary"
                      />
                    ) : (
                      <span className="font-medium text-sm truncate flex-1 min-w-0">{blob.title}</span>
                    )}
                    
                    {renamingId !== blob.id && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Hover Actions */}
                        <div className="group-hover:flex hidden items-center gap-0.5">
                          <button
                            onClick={(e) => handleStartRename(blob, e)}
                            title="Rename"
                            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(blob.id, e)}
                            title="Delete"
                            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap group-hover:hidden self-center">
                          {formattedDate}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate opacity-70">
                    {blob.content.substring(0, 100).replace(/\s+/g, " ")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ================= EDITOR WORKSPACE ================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header Action Bar */}
        <header className="h-16 px-4 md:px-6 border-b border-border flex items-center justify-between gap-3 bg-card shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md md:hidden shrink-0 text-muted-foreground hover:text-foreground"
              title="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base md:text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 w-full truncate"
              placeholder="Untitled Blob"
            />
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Code Playground Navigation */}
            <Link
              href="/playground"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-all shadow-sm shadow-violet-500/10 hover:shadow-violet-500/20 cursor-pointer"
              title="Open Developer Code Playground"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Playground</span>
            </Link>
            <div className="w-[1px] h-5 bg-border mx-0.5" />

            {/* Format */}
            <button
              onClick={handleBeautify}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent rounded-md transition-colors"
              title="Format JSON"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Format</span>
            </button>

            {/* Autosave Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none border border-border px-2.5 py-1.5 rounded-md hover:bg-accent text-xs font-medium transition-all duration-200">
              <input
                type="checkbox"
                checked={autosaveEnabled}
                onChange={(e) => setAutosaveEnabled(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${autosaveEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                <span className="text-muted-foreground hidden md:inline">Autosave</span>
              </div>
              {isAutosaving && (
                <Loader2 className="w-3 h-3 animate-spin text-primary ml-0.5" />
              )}
            </label>

            {/* Clear */}
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
              title="Clear Editor"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clear</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
              title="Reset Editor to Saved State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            {/* Validate */}
            <button
              onClick={handleValidate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent rounded-md transition-colors"
              title="Validate JSON syntax"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Validate</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent rounded-md transition-colors"
              title="Copy to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Copy</span>
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 border border-border hover:bg-accent rounded-md transition-colors"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-5 bg-border mx-0.5" />

            {/* Delete */}
            {selectedBlob && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                title="Delete Blob"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-md transition-all shadow-sm"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">Save</span>
            </button>
          </div>
        </header>

        {/* Mobile Editor/Viewer Tab Switcher */}
        <div className="flex md:hidden border-b border-border bg-card p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveEditorTab("editor")}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-md transition-all ${
              activeEditorTab === "editor"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setActiveEditorTab("viewer")}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-md transition-all ${
              activeEditorTab === "viewer"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Tree & Diff Preview
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Raw Code Editor */}
          <div className={`flex-1 p-3 md:p-4 h-full min-w-[280px] ${activeEditorTab === "editor" ? "block" : "hidden md:block"}`}>
            <MonacoEditor value={content} onChange={(val) => setContent(val || "")} isDark={isDark} />
          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-[1px] h-full bg-border" />

          {/* Right Panel: Interactive Helper Tools */}
          <div className={`w-full md:w-1/2 p-3 md:p-4 h-full flex flex-col min-w-[280px] bg-accent/5 ${activeEditorTab === "viewer" ? "flex" : "hidden md:flex"}`}>
            {/* Tabs selector */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={() => setActiveRightTab("tree")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeRightTab === "tree"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                Tree View
              </button>
              <button
                onClick={() => setActiveRightTab("diff")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeRightTab === "diff"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                JSON Diff (Saved)
              </button>
            </div>

            {/* Tab content panel */}
            <div className="flex-1 overflow-hidden relative">
              {activeRightTab === "tree" ? (
                <JsonTreeView data={content} />
              ) : (
                <MonacoDiffEditor
                  originalValue={selectedBlob?.content || "{\n}"}
                  modifiedValue={content}
                  isDark={isDark}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <footer className="h-10 px-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-card">
          <div className="flex items-center gap-4">
            <span>{stats.lines} lines</span>
            <span>{stats.kb} KB</span>
          </div>

          <div className="flex items-center gap-2">
            {validationError ? (
              <div className="flex items-center gap-1.5 text-red-500 font-medium max-w-xs truncate" title={validationError}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="truncate">{validationError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Valid JSON</span>
              </div>
            )}
          </div>
        </footer>
      </main>

      {/* ================= CUSTOM CONFIRM DELETE MODAL ================= */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-lg animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold mb-2">Delete Blob</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong className="text-foreground">"{title}"</strong>? This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-border hover:bg-accent rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION CONTAINER ================= */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-md border shadow-md flex items-center gap-3 min-w-[280px] max-w-sm transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === "success"
                ? "bg-card border-green-500/30 text-foreground"
                : toast.type === "error"
                  ? "bg-card border-red-500/30 text-foreground"
                  : "bg-card border-border text-foreground"
              }`}
          >
            {toast.type === "success" && <Check className="w-4 h-4 text-green-500 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
            <span className="text-sm flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
