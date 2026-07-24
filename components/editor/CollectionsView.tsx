"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspaceStore";
import { Folder, FolderPlus, Trash2, FileJson, Layers, Plus, ChevronRight, Layout } from "lucide-react";

interface CollectionsViewProps {
  blobs: any[];
  onSelectBlob: (blob: any) => void;
}

export function CollectionsView({ blobs, onSelectBlob }: CollectionsViewProps) {
  const { 
    collections, 
    createCollection, 
    deleteCollection, 
    toggleBlobInCollection,
    setActiveView 
  } = useWorkspaceStore();

  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [activeColId, setActiveColId] = useState<string | null>(null);

  const activeCollection = collections.find((c) => c.id === activeColId) || null;

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    createCollection(newColName, newColDesc);
    setNewColName("");
    setNewColDesc("");
  };

  const getBlobById = (id: string) => {
    return blobs.find((b) => b.id === id);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground h-full">
      {/* Collections Directory Left Panel */}
      <div className="w-80 border-r border-border bg-card/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-xs uppercase tracking-wider">Collections</span>
          </div>
        </div>

        {/* Create collection form */}
        <form onSubmit={handleCreateCollection} className="p-4 border-b border-border bg-accent/15 space-y-2.5 shrink-0">
          <div className="text-[10px] font-bold text-muted-foreground uppercase">New Collection</div>
          <input
            type="text"
            required
            placeholder="Folder Name e.g. Production Configs"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            className="w-full text-xs bg-background border border-border rounded p-2 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Description (Optional)"
            value={newColDesc}
            onChange={(e) => setNewColDesc(e.target.value)}
            className="w-full text-xs bg-background border border-border rounded p-2 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="w-full py-1.5 bg-primary text-primary-foreground font-semibold rounded text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Create Folder</span>
          </button>
        </form>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {collections.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No collection folders created yet.
            </div>
          ) : (
            collections.map((col) => (
              <div
                key={col.id}
                onClick={() => setActiveColId(col.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                  activeColId === col.id
                    ? "bg-accent border-primary/50 shadow-sm"
                    : "border-border/50 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className={`w-4 h-4 shrink-0 ${activeColId === col.id ? "text-primary fill-primary/10" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate text-foreground">{col.name}</span>
                    <span className="text-[10px] text-muted-foreground">{col.blobIds.length} items</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeColId === col.id) setActiveColId(null);
                    deleteCollection(col.id);
                  }}
                  className="p-1 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Collection Details Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {activeCollection ? (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
            {/* Header info */}
            <div className="border-b border-border pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Folder className="w-6 h-6 text-primary fill-primary/10" />
                <h2 className="text-lg font-bold">{activeCollection.name}</h2>
              </div>
              {activeCollection.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {activeCollection.description}
                </p>
              )}
            </div>

            {/* Main content split: Blobs in collection vs Add Blobs */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              
              {/* Left pane: items currently in this collection */}
              <div className="flex flex-col border border-border rounded-xl bg-card/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-accent/20 text-[10px] font-bold text-muted-foreground uppercase shrink-0">
                  Blobs in Folder
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {activeCollection.blobIds.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-10">
                      No blobs assigned. Check files in the right list to add them.
                    </div>
                  ) : (
                    activeCollection.blobIds.map((id) => {
                      const blob = getBlobById(id);
                      if (!blob) return null;
                      return (
                        <div
                          key={id}
                          onClick={() => {
                            onSelectBlob(blob);
                            setActiveView("workspace");
                          }}
                          className="flex items-center justify-between p-2.5 border border-border bg-background hover:border-primary/40 hover:bg-accent/40 rounded-lg transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileJson className="w-4 h-4 text-violet-500 shrink-0" />
                            <span className="text-xs font-semibold text-foreground truncate">
                              {blob.title || "Untitled Blob"}
                            </span>
                          </div>
                          <span className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right pane: list of all user blobs to toggle assignment */}
              <div className="flex flex-col border border-border rounded-xl bg-card/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-accent/20 text-[10px] font-bold text-muted-foreground uppercase shrink-0">
                  Assign / Toggle Workspace Blobs
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {blobs.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-10">
                      No saved blobs found. Save some blobs in the Workspace Editor first.
                    </div>
                  ) : (
                    blobs.map((blob) => {
                      const isAssigned = activeCollection.blobIds.includes(blob.id);
                      return (
                        <label
                          key={blob.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                            isAssigned
                              ? "bg-primary/5 border-primary/40"
                              : "border-border hover:bg-accent/35"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleBlobInCollection(activeCollection.id, blob.id)}
                              className="rounded border-border text-primary w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-foreground truncate">
                              {blob.title || "Untitled Blob"}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Layers className="w-12 h-12 text-muted-foreground/30" />
            <h3 className="text-sm font-bold text-muted-foreground">Select a Collection Folder</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Choose a folder from the sidebar or click Create Folder to group your configurations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionsView;
