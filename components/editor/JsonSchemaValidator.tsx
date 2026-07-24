"use client";

import React, { useState, useEffect, useMemo } from "react";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { AlertCircle, CheckCircle, FileCode, Play, Copy, RefreshCw, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Monaco Editor to keep bundle size optimized
const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background">
      Loading Schema Editor...
    </div>
  ),
});

interface JsonSchemaValidatorProps {
  data: string; // The active JSON content from the main editor
  isDark: boolean;
}

// Preset Schema templates
const SCHEMA_TEMPLATES = [
  {
    id: "empty",
    title: "Blank Schema",
    schema: JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "My Schema",
        type: "object",
        properties: {},
        required: [],
      },
      null,
      2
    ),
  },
  {
    id: "user-profile",
    title: "User Profile",
    schema: JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "User Profile",
        type: "object",
        properties: {
          id: { type: "string", pattern: "^[a-fA-F0-9]{8}$" },
          name: { type: "string", minLength: 2 },
          email: { type: "string", format: "email" },
          age: { type: "integer", minimum: 18, maximum: 120 },
          roles: {
            type: "array",
            items: { type: "string", enum: ["admin", "editor", "user"] },
            minItems: 1,
          },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
              zipcode: { type: "string", pattern: "^\\d{5}$" },
            },
            required: ["city"],
          },
        },
        required: ["id", "name", "email", "age", "roles"],
      },
      null,
      2
    ),
  },
  {
    id: "product-list",
    title: "Product Catalog",
    schema: JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Product Catalog",
        type: "object",
        properties: {
          catalogName: { type: "string" },
          version: { type: "string" },
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                price: { type: "number", minimum: 0.01 },
                tags: { type: "array", items: { type: "string" } },
                inStock: { type: "boolean" },
                rating: { type: "number", minimum: 0, maximum: 5 },
              },
              required: ["id", "title", "price", "inStock"],
            },
          },
        },
        required: ["catalogName", "products"],
      },
      null,
      2
    ),
  },
];

// Helper to locate lines for specific paths in the JSON string
function findLineForPath(jsonStr: string, path: string): number {
  if (!path || path === "/" || path === "") return 1;
  const segments = path.split("/").filter(Boolean);
  const lines = jsonStr.split("\n");
  let currentLineIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isNumeric = /^\d+$/.test(segment);
    let found = false;

    // Search forward from currentLineIndex
    for (let l = currentLineIndex; l < lines.length; l++) {
      const lineContent = lines[l];
      if (isNumeric) {
        // For array items, find the bracket '[' or brace '{'
        if (lineContent.trim().startsWith("{") || lineContent.trim().startsWith("[")) {
          currentLineIndex = l;
          found = true;
          break;
        }
      } else {
        // Search for property keys matching the segment
        if (lineContent.includes(`"${segment}"`)) {
          currentLineIndex = l;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }

  return currentLineIndex + 1;
}

export function JsonSchemaValidator({ data, isDark }: JsonSchemaValidatorProps) {
  const [schemaContent, setSchemaContent] = useState<string>(SCHEMA_TEMPLATES[0].schema);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<ErrorObject & { line: number }>>([]);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [validationRun, setValidationRun] = useState<boolean>(false);

  // Initialize AJV instance
  const ajv = useMemo(() => {
    const instance = new Ajv({ allErrors: true, verbose: true });
    addFormats(instance);
    return instance;
  }, []);

  // Sync / Run schema validation
  const validateJson = () => {
    setValidationRun(true);
    setSchemaError(null);
    setValidationErrors([]);
    setIsValid(true);

    let parsedSchema: any;
    try {
      parsedSchema = JSON.parse(schemaContent);
    } catch (e: any) {
      setSchemaError(`Schema JSON Parsing Error: ${e.message}`);
      setIsValid(false);
      return;
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(data);
    } catch (e: any) {
      // If the main editor JSON is invalid, we do not throw schema errors
      return;
    }

    try {
      // Validate schema format first
      const isSchemaValid = ajv.validateSchema(parsedSchema);
      if (!isSchemaValid) {
        const errorText = ajv.errorsText(ajv.errors);
        setSchemaError(`Invalid JSON Schema definition: ${errorText}`);
        setIsValid(false);
        return;
      }

      // Compile and validate data
      const validate = ajv.compile(parsedSchema);
      const dataValid = validate(parsedData);

      if (dataValid) {
        setIsValid(true);
        setValidationErrors([]);
      } else {
        setIsValid(false);
        if (validate.errors) {
          const mappedErrors = validate.errors.map((err) => {
            const line = findLineForPath(data, err.instancePath);
            return { ...err, line };
          });
          setValidationErrors(mappedErrors);
        }
      }
    } catch (err: any) {
      setSchemaError(`Schema Compilation Error: ${err.message}`);
      setIsValid(false);
    }
  };

  // Re-run validation when main JSON data or schema changes
  useEffect(() => {
    validateJson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schemaContent]);

  // Sync Monaco Editor markers for visual schema error highlights in the editor
  useEffect(() => {
    if (typeof window !== "undefined") {
      const monaco = (window as any).monaco;
      const editor = (window as any).currentEditor;

      if (monaco && editor) {
        const model = editor.getModel();
        if (model) {
          // Clear current markers from previous validation runs
          const owner = "json-schema-validator";
          
          if (!isValid && validationErrors.length > 0) {
            const markers = validationErrors.map((err) => {
              const line = err.line;
              const lineContent = model.getLineContent(line) || "";
              const startColumn = lineContent.indexOf(err.instancePath.split("/").pop() || "") + 1 || 1;
              const endColumn = lineContent.length + 1;

              return {
                owner,
                severity: monaco.MarkerSeverity.Error,
                message: `[Schema Validation] Path: ${err.instancePath || "/"} - ${err.message}`,
                startLineNumber: line,
                startColumn: startColumn,
                endLineNumber: line,
                endColumn: endColumn,
              };
            });
            monaco.editor.setModelMarkers(model, owner, markers);
          } else {
            monaco.editor.setModelMarkers(model, owner, []);
          }
        }
      }
    }
  }, [isValid, validationErrors]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SCHEMA_TEMPLATES.find((t) => t.id === e.target.value);
    if (selected) {
      setSchemaContent(selected.schema);
    }
  };

  const handleFormatSchema = () => {
    try {
      const parsed = JSON.parse(schemaContent);
      setSchemaContent(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      setSchemaError(`Format failed: Invalid Schema JSON`);
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaContent);
  };

  // Direct editor cursor navigation on error card click
  const focusMainEditorLine = (line: number) => {
    if (typeof window !== "undefined") {
      const editor = (window as any).currentEditor;
      if (editor) {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-md overflow-hidden text-foreground">
      {/* Schema Editor Top Panel */}
      <div className="flex-1 flex flex-col min-h-[300px] border-b border-border">
        {/* Editor Toolbar */}
        <div className="px-3 py-2 bg-accent/40 border-b border-border flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <FileCode className="w-3.5 h-3.5 text-primary" />
            <span>JSON SCHEMA EDITOR</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Select */}
            <div className="relative flex items-center bg-background border border-border rounded px-2 py-0.5 text-xs">
              <select
                onChange={handleTemplateChange}
                defaultValue="empty"
                className="bg-transparent border-none outline-none pr-5 text-xs text-muted-foreground hover:text-foreground cursor-pointer appearance-none"
              >
                {SCHEMA_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 pointer-events-none" />
            </div>

            <button
              onClick={handleFormatSchema}
              title="Format Schema"
              className="p-1 border border-border hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopySchema}
              title="Copy Schema"
              className="p-1 border border-border hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Monaco Schema Editor */}
        <div className="flex-1 min-h-[150px]">
          <MonacoEditor
            value={schemaContent}
            onChange={(val) => setSchemaContent(val || "")}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Validation Reports Bottom Panel */}
      <div className="h-[250px] flex flex-col bg-background/50">
        <div className="px-3 py-1.5 bg-accent/30 border-b border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          <span>Validation Results</span>
          {validationRun && (
            <span
              className={`px-1.5 py-0.5 rounded-sm font-semibold uppercase ${
                isValid
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              {isValid ? "Passed" : "Failed"}
            </span>
          )}
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {schemaError ? (
            <div className="flex gap-2 p-3 text-xs font-mono rounded border border-red-500/20 bg-red-50/50 dark:bg-red-950/10 text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Schema Config Error</span>
                <span className="whitespace-pre-wrap">{schemaError}</span>
              </div>
            </div>
          ) : !validationRun ? (
            <div className="text-xs text-muted-foreground flex items-center justify-center h-full">
              Enter a Schema template above to run validation.
            </div>
          ) : isValid ? (
            <div className="flex gap-2 p-3 text-xs rounded border border-green-500/20 bg-green-50/50 dark:bg-green-950/10 text-green-600 dark:text-green-400 items-center justify-center h-full">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-semibold block">JSON Successfully Validated</span>
                <span>Active document conforms fully to the JSON Schema.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium mb-1">
                Found {validationErrors.length} validation error{validationErrors.length !== 1 ? "s" : ""}:
              </div>

              {validationErrors.map((err, idx) => (
                <div
                  key={idx}
                  onClick={() => focusMainEditorLine(err.line)}
                  className="group flex items-start gap-2 p-2.5 text-xs border border-border bg-card rounded-md hover:border-primary/40 hover:bg-accent/40 transition-all cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-muted-foreground">
                        {err.instancePath || "/ (Root)"}
                      </span>
                      <span className="text-[10px] text-primary bg-primary/5 px-1.5 py-0.2 rounded border border-primary/10 select-none group-hover:bg-primary/15 whitespace-nowrap">
                        Line {err.line}
                      </span>
                    </div>
                    <div className="text-foreground/95 mt-1 font-mono">{err.message}</div>
                    {err.params && Object.keys(err.params).length > 0 && (
                      <div className="mt-1.5 text-[10px] text-muted-foreground bg-accent/25 p-1 rounded font-mono truncate">
                        Params: {JSON.stringify(err.params)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JsonSchemaValidator;
