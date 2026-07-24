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
  Sparkles,
  Code,
  Layout,
  Layers,
  Database,
  Send,
  Settings as SettingsIcon,
  User,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JsonTreeView } from "@/components/editor/JsonTreeView";
import { JsonSchemaValidator } from "@/components/editor/JsonSchemaValidator";
import { useAiStore } from "@/lib/store/aiStore";
import { AiAssistantPanel } from "@/components/editor/AiAssistantPanel";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { DashboardView } from "@/components/editor/DashboardView";
import { SqlEditorView } from "@/components/editor/SqlEditorView";
import { ApiStudioView } from "@/components/editor/ApiStudioView";
import { CollectionsView } from "@/components/editor/CollectionsView";
import { SettingsView } from "@/components/editor/SettingsView";
import { ConversionView } from "@/components/editor/ConversionView";
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
  // --- Workspace Store States ---
  const { activeView, setActiveView, isSidebarCollapsed, setSidebarCollapsed, addActivity } = useWorkspaceStore();

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
  const [isDark, setIsDark] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<"tree" | "diff" | "schema">("tree");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingVal, setRenamingVal] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "viewer">("editor");
  const { isOpen: isAiOpen, setIsOpen: setAiOpen } = useAiStore();

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      if (viewParam === "sql") {
        setActiveView("sql");
        return;
      }
    }
    if (initialSelectedBlob) {
      setSelectedBlob(initialSelectedBlob);
      setTitle(initialSelectedBlob.title);
      setContent(initialSelectedBlob.content);
      setActiveView("workspace");
    }
  }, [initialSelectedBlob, setActiveView]);

  // --- Initial Theme Sync ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
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
              if (fetchRes.status !== 401) {
                showToast("error", `Autosave failed: ${errData.error || "Unknown error"}`);
              }
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
              if (fetchRes.status !== 401) {
                showToast("error", `Autosave failed: ${errData.error || "Unknown error"}`);
              }
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
      await Promise.allSettled([
        fetch("/api/auth/logout", { method: "POST" }),
        signOutAction(),
      ]);
    } catch (err: any) {
      console.warn("Sign out request error:", err);
    }
    // Clear client side cookies & storage unconditionally
    document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
    document.cookie = "userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    sessionStorage.clear();
    setUserName(null);
    setBlobsList([]);
    setSelectedBlob(null);
    setContent(JSON.stringify({ welcome: "JSON Blob MVP", status: "ready" }, null, 2));
    setTitle("Untitled Blob");
    showToast("success", "Signed out successfully");
    // Force a full clean page reload to refresh server components and clear router cache
    setTimeout(() => {
      window.location.href = "/";
    }, 150);
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
    setActiveView("workspace");
    router.push(`/${blob.id}`);
  };

  // --- Handle New Blob ---
  const handleNewBlob = () => {
    setSelectedBlob(null);
    setTitle("Untitled Blob");
    setContent(JSON.stringify({ hello: "world", count: 1, active: true }, null, 2));
    setActiveView("workspace");
    router.push("/");
    showToast("info", "Created new blank workspace");
  };

  // --- Handle Create Blob From Content (API / SQL / Conversion) ---
  const handleCreateBlobFromContent = async (titleVal: string, contentVal: string) => {
    try {
      showToast("info", "Saving response as workspace blob...");
      const fetchRes = await fetch("/api/blobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleVal, content: contentVal }),
      });

      if (fetchRes.ok) {
        const newBlob = (await fetchRes.json()) as Blob;
        showToast("success", `Saved workspace blob: "${newBlob.title}"`);
        addActivity("blob_create", `Created Blob: ${newBlob.title}`);

        const listRes = await fetch("/api/blobs");
        if (listRes.ok) {
          const updatedList = (await listRes.json()) as Blob[];
          setBlobsList(updatedList);
        }

        setSelectedBlob(newBlob);
        setTitle(newBlob.title);
        setContent(newBlob.content);
        setActiveView("workspace");
        router.push(`/${newBlob.id}`);
      } else {
        // Fallback: set in editor directly
        setSelectedBlob(null);
        setTitle(titleVal);
        setContent(contentVal);
        setActiveView("workspace");
        router.push("/");
        showToast("success", `Loaded into workspace: "${titleVal}"`);
      }
    } catch (err) {
      setSelectedBlob(null);
      setTitle(titleVal);
      setContent(contentVal);
      setActiveView("workspace");
      router.push("/");
    }
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
            addActivity("blob_update", `Updated JSON Blob: ${title}`);
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
            addActivity("blob_create", `Created JSON Blob: ${title}`);
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
          addActivity("blob_update", `Deleted JSON Blob: ${selectedBlob.title}`);
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

      {/* ================= THIN ACTIVITY BAR (IDE SIDEBAR) ================= */}
      {/* Outer wrapper that transitions width on hover on desktop to push adjacent content to the right */}
      <div className="w-16 md:hover:w-[240px] h-full shrink-0 z-50 select-none relative group/sidebar transition-[width] duration-300 ease-in-out">
        <aside className="w-full h-full bg-card border-r border-border flex flex-col justify-between items-stretch py-4 overflow-hidden">
          {/* Top Part: Logo & Navigation */}
          <div className="flex flex-col items-stretch gap-6 w-full">
            {/* Logo Container - Placed at pl-[14px] to perfectly center the w-9 (36px) logo button within 64px collapsed width */}
            <div className="w-full pl-[14px] flex items-center justify-start gap-3">
              {/* Logo */}
              <button
                onClick={() => {
                  setSelectedBlob(null);
                  router.push("/");
                  setActiveView("dashboard");
                }}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 shadow-md shadow-primary/20 text-primary-foreground font-extrabold text-xs tracking-tighter cursor-pointer hover:scale-105 transition-transform shrink-0"
                title="JSONBlob Dashboard"
              >
                {"{"}
                <span className="text-[9px] text-primary-foreground/90 absolute mt-0.5 font-semibold">JS</span>
                {"}"}
              </button>
              {/* App Title - Fades in smoothly after the sidebar begins expanding */}
              <span className="font-bold text-sm tracking-tight text-foreground hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                JSON<span className="text-primary">Blob</span>
              </span>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col items-stretch gap-1 w-full">
              {/* Dashboard Link - pl-[20px] centers the w-5 (20px) icon with the border-l-2 (2px) in 64px collapsed width */}
              <button
                onClick={() => setActiveView("dashboard")}
                title="Dashboard"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "dashboard"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <Layout className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Dashboard
                </span>
              </button>

              {/* Workspace Link */}
              <button
                onClick={() => {
                  setActiveView("workspace");
                  // If clicked while already in workspace view, toggle collapse of explorer sidebar
                  if (activeView === "workspace") {
                    setSidebarCollapsed(!isSidebarCollapsed);
                  } else {
                    setSidebarCollapsed(false);
                  }
                }}
                title="Workspace (JSON Editor)"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "workspace"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <FileJson className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  JSON Editor
                </span>
              </button>

              {/* SQL Workspace Link */}
              <button
                onClick={() => setActiveView("sql")}
                title="SQL Workspace"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "sql"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <Database className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  SQL Workspace
                </span>
              </button>

              {/* API Studio Link */}
              <button
                onClick={() => setActiveView("api")}
                title="API Studio"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "api"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <Send className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  API Studio
                </span>
              </button>

              {/* Collections Link */}
              <button
                onClick={() => setActiveView("collections")}
                title="Collections"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "collections"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <Layers className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Collections
                </span>
              </button>

              {/* Format Converter Link */}
              <button
                onClick={() => setActiveView("conversion")}
                title="Format Converter"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "conversion"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <ArrowLeftRight className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Format Converter
                </span>
              </button>

              {/* Settings Link */}
              <button
                onClick={() => setActiveView("settings")}
                title="Settings"
                className={`w-full py-3 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer relative border-l-2 ${
                  activeView === "settings"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                }`}
              >
                <SettingsIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Settings
                </span>
              </button>
            </nav>
          </div>

          {/* Bottom Part: Direct Logout & Theme toggle */}
          <div className="flex flex-col items-stretch gap-2 w-full">
            {/* Theme Switch */}
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className="w-full py-3 hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer border-l-2 border-transparent"
            >
              {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            {/* User Sign Out / Sign In direct button */}
            {userName ? (
              <button
                onClick={handleSignOut}
                title={`Sign Out (${userName})`}
                className="w-full py-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer border-l-2 border-transparent"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Sign Out
                </span>
              </button>
            ) : (
              <a
                href="/auth"
                title="Sign In / Register"
                className="w-full py-3 text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-start pl-[20px] gap-3 transition-all cursor-pointer border-l-2 border-transparent"
              >
                <User className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium hidden md:inline-block whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none select-none">
                  Sign In
                </span>
              </a>
            )}
          </div>
        </aside>
      </div>

      {/* ================= SECONDARY FILE EXPLORER SIDE PANEL ================= */}
      {activeView === "workspace" && !isSidebarCollapsed && (
        <aside
          className={`fixed inset-y-0 left-16 z-40 w-72 md:w-80 flex flex-col border-r border-border bg-card transition-transform duration-300 md:static md:translate-x-0 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 select-none">
              <span className="font-bold text-sm tracking-tight">
                JSON<span className="text-primary/95">Explorer</span>
              </span>
            </div>

            {/* Close button for mobile menu */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md md:hidden transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase">My Blobs</span>
              {userName && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                  {filteredBlobs.length}
                </span>
              )}
            </div>
            <button
              onClick={handleNewBlob}
              title="Create New JSON Blob"
              className="flex items-center justify-center p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
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
      )}

      {/* ================= MAIN PANEL VIEW PORT ================= */}
      {activeView === "workspace" ? (
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Header Action Bar */}
          <header className="h-16 px-4 md:px-6 border-b border-border flex items-center justify-between gap-3 bg-card shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-md md:hidden transition-colors"
                title="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileJson className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">{title}</span>
                {isAutosaving && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded font-mono shrink-0 select-none">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Autosaving</span>
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Save / Sync */}
              <button
                onClick={handleSave}
                disabled={isPending || !title.trim() || !isValidJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 text-xs font-bold rounded-md transition-all shadow-sm shadow-primary/10 cursor-pointer"
                title="Save updates"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>

              {/* Clear */}
              <button
                onClick={handleClear}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Clear Editor"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Clear</span>
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Reset Editor to Saved State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>

              {/* Format */}
              <button
                onClick={handleBeautify}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent rounded-md transition-colors"
                title="Format JSON"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Format</span>
              </button>

              {/* Validate */}
              <button
                onClick={handleValidate}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border hover:bg-accent rounded-md transition-colors"
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
                className="hidden sm:flex p-2 border border-border hover:bg-accent rounded-md transition-colors"
                title="Download File"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* AI Assistant Toggle */}
              <button
                onClick={() => setAiOpen(!isAiOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                  isAiOpen
                    ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/10"
                    : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
                title="Toggle AI Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden md:inline">AI Assistant</span>
              </button>
            </div>
          </header>

          {/* Editor Area */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Workspace (Split 50/50 between Editor and Helper Tools) */}
            <div className="flex-1 flex overflow-hidden min-w-0">
              {/* Left Monaco text editor */}
              <div className="flex-1 flex flex-col min-w-0 border-r border-border">
                {/* Tab Selector inside editor */}
                <div className="h-9 px-4 border-b border-border bg-card/50 flex items-center justify-between text-xs text-muted-foreground shrink-0">
                  <div className="flex gap-4 h-full">
                    <button
                      onClick={() => setActiveEditorTab("editor")}
                      className={`font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                        activeEditorTab === "editor" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
                      }`}
                    >
                      Source Editor
                    </button>
                    <button
                      onClick={() => setActiveEditorTab("viewer")}
                      className={`font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                        activeEditorTab === "viewer" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
                      }`}
                    >
                      Visual Schema Tree
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative bg-background">
                  {activeEditorTab === "editor" ? (
                    <MonacoEditor
                      value={content}
                      onChange={(val) => setContent(val || "")}
                      isDark={isDark}
                      language="json"
                    />
                  ) : (
                    <JsonTreeView data={content} />
                  )}
                </div>
              </div>

              {/* Right side analytics/diff tabs panel */}
              <div className="hidden md:flex flex-1 flex-col bg-card/30 border-r border-border overflow-hidden">
                {/* Right Tab Bar */}
                <div className="h-9 border-b border-border bg-card/60 flex items-center px-4 gap-4 shrink-0">
                  <button
                    onClick={() => setActiveRightTab("tree")}
                    className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                      activeRightTab === "tree" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Interactive Tree
                  </button>
                  <button
                    onClick={() => setActiveRightTab("diff")}
                    className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                      activeRightTab === "diff" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Workspace Diff
                  </button>
                  <button
                    onClick={() => setActiveRightTab("schema")}
                    className={`text-xs font-semibold h-full border-b-2 px-1 transition-all cursor-pointer ${
                      activeRightTab === "schema" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Schema Validation
                  </button>
                </div>

                {/* Tab content panel */}
                <div className="flex-1 overflow-hidden relative">
                  {activeRightTab === "tree" ? (
                    <div className="absolute inset-0 overflow-y-auto p-4">
                      <JsonTreeView data={content} />
                    </div>
                  ) : activeRightTab === "diff" ? (
                    <div className="absolute inset-0">
                      <MonacoDiffEditor
                        originalValue={selectedBlob ? selectedBlob.content : "{\n}"}
                        modifiedValue={content}
                        isDark={isDark}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <JsonSchemaValidator
                        data={content}
                        isDark={isDark}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Assistant panel */}
            <AiAssistantPanel
              module="json"
              content={content}
              error={validationError || undefined}
              activeFileName={title || "document.json"}
              onInsertCode={(code) => setContent(code)}
            />
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
      ) : activeView === "dashboard" ? (
        <div className="flex-1 flex overflow-hidden">
          <DashboardView
            blobs={blobsList}
            onSelectBlob={handleSelectBlob}
            onDeleteBlob={(id) => {
              const b = blobsList.find((x) => x.id === id);
              if (b) {
                setSelectedBlob(b);
                setTitle(b.title);
                setShowDeleteConfirm(true);
              }
            }}
            onCreateNewBlob={handleNewBlob}
          />
          <AiAssistantPanel
            module="playground"
            content=""
            onInsertCode={() => {}}
          />
        </div>
      ) : activeView === "sql" ? (
        <div className="flex-1 flex overflow-hidden">
          <SqlEditorView
            isDark={isDark}
            userName={userName}
            onSaveAsBlob={(titleVal, contentVal) => {
              handleCreateBlobFromContent(titleVal, contentVal);
            }}
          />
          <AiAssistantPanel
            module="playground"
            content={(() => {
              if (typeof window !== "undefined") {
                const tabs = useWorkspaceStore.getState().sqlTabs;
                const activeId = useWorkspaceStore.getState().activeSqlTabId;
                const activeTab = tabs.find(t => t.id === activeId) || tabs[0];
                return activeTab ? activeTab.query : "";
              }
              return "";
            })()}
            language="sql"
            onInsertCode={(code) => {
              const tabs = useWorkspaceStore.getState().sqlTabs;
              const activeId = useWorkspaceStore.getState().activeSqlTabId;
              const activeTab = tabs.find(t => t.id === activeId) || tabs[0];
              if (activeTab) {
                useWorkspaceStore.getState().updateSqlTab(activeTab.id, { query: code });
              }
            }}
          />
        </div>
      ) : activeView === "api" ? (
        <div className="flex-1 flex overflow-hidden">
          <ApiStudioView
            isDark={isDark}
            onSaveAsBlob={(titleVal, contentVal) => {
              handleCreateBlobFromContent(titleVal, contentVal);
            }}
          />
          <AiAssistantPanel
            module="json"
            content={(() => {
              if (typeof window !== "undefined") {
                return useWorkspaceStore.getState().activeApiRequest.body || "";
              }
              return "";
            })()}
            language="json"
            onInsertCode={(code) => {
              useWorkspaceStore.getState().updateActiveApiRequest({ body: code });
            }}
          />
        </div>
      ) : activeView === "collections" ? (
        <div className="flex-1 flex overflow-hidden">
          <CollectionsView blobs={blobsList} onSelectBlob={handleSelectBlob} />
          <AiAssistantPanel
            module="playground"
            content=""
            onInsertCode={() => {}}
          />
        </div>
      ) : activeView === "conversion" ? (
        <div className="flex-1 flex overflow-hidden">
          <ConversionView
            isDark={isDark}
            onLoadIntoEditor={(convertedText) => {
              handleCreateBlobFromContent("Converted Workspace Blob", convertedText);
            }}
            onSaveAsBlob={(titleVal, contentVal) => {
              handleCreateBlobFromContent(titleVal, contentVal);
            }}
          />
          <AiAssistantPanel
            module="playground"
            content=""
            onInsertCode={() => {}}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <SettingsView
            userName={userName}
            isDark={isDark}
            onThemeToggle={toggleTheme}
            autosaveEnabled={autosaveEnabled}
            onAutosaveToggle={setAutosaveEnabled}
            onSignOut={handleSignOut}
          />
          <AiAssistantPanel
            module="playground"
            content=""
            onInsertCode={() => {}}
          />
        </div>
      )}

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
