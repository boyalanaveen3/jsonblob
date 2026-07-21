"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  isDark: boolean;
  language?: string;
}

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  wordWrap: "on" as const,
  formatOnPaste: true,
  tabSize: 2,
  fontSize: 14,
  fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  automaticLayout: true,
  scrollBeyondLastLine: false,
  lineNumbers: "on" as const,
  folding: true,
  cursorBlinking: "smooth" as const,
  cursorSmoothCaretAnimation: "on" as const,
  padding: { top: 12, bottom: 12 },
};

export function MonacoEditor({ value, onChange, isDark, language = "json" }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  // Sync value from parent only if it differs from the editor's current internal value.
  // This prevents resetting the model/search state on every keystroke.
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
    if (typeof window !== "undefined") {
      (window as any).monaco = monaco;
      (window as any).currentEditor = editor;
      (window as any).setEditorValue = (val: string) => {
        editor.setValue(val);
        onChange(val);
      };
    }

    // Set up listeners for the Find/Replace state to restore focus on close
    try {
      const findController = editor.getContribution("editor.contrib.findController");
      if (findController) {
        const findState = findController.getState();
        if (findState) {
          findState.onFindReplaceStateChange((e: any) => {
            if (e.isRevealed === false || (e.isRevealed === undefined && !findState.isRevealed)) {
              const selection = editor.getSelection();
              setTimeout(() => {
                editor.focus();
                if (selection) {
                  editor.setSelection(selection);
                }
              }, 50);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Failed to attach Monaco FindController listener:", err);
    }

    try {
      const contextKeyService = editor._contextKeyService;
      if (contextKeyService) {
        contextKeyService.onDidChangeContext((e: any) => {
          if (e.affectsSome && e.affectsSome(new Set(["findWidgetVisible"]))) {
            const isVisible = contextKeyService.getContextValue("findWidgetVisible");
            if (!isVisible) {
              const selection = editor.getSelection();
              setTimeout(() => {
                editor.focus();
                if (selection) {
                  editor.setSelection(selection);
                }
              }, 50);
            }
          }
        });
      }
    } catch (err) {
      console.warn("Failed to attach Monaco contextKeyService listener:", err);
    }
  }

  return (
    <div className="w-full h-full border border-border rounded-md overflow-hidden bg-card">
      <Editor
        height="100%"
        language={language}
        defaultValue={value}
        onMount={handleEditorDidMount}
        onChange={onChange}
        theme={isDark ? "vs-dark" : "light"}
        loading={
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-background">
            Loading editor...
          </div>
        }
        options={EDITOR_OPTIONS}
      />
    </div>
  );
}

export default MonacoEditor;
