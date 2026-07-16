"use client";

import { DiffEditor } from "@monaco-editor/react";

interface MonacoDiffEditorProps {
  originalValue: string;
  modifiedValue: string;
  isDark: boolean;
}

export function MonacoDiffEditor({
  originalValue,
  modifiedValue,
  isDark,
}: MonacoDiffEditorProps) {
  return (
    <div className="w-full h-full border border-border rounded-md overflow-hidden bg-card">
      <DiffEditor
        height="100%"
        original={originalValue}
        modified={modifiedValue}
        language="json"
        theme={isDark ? "vs-dark" : "light"}
        loading={
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-background">
            Loading Diff Editor...
          </div>
        }
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 13,
          fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderSideBySide: true,
          readOnly: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
export default MonacoDiffEditor;
