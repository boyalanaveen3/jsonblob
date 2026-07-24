"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  FileJson,
  Upload
} from "lucide-react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background">
      Loading Editor...
    </div>
  ),
});

interface ConversionViewProps {
  isDark: boolean;
  onLoadIntoEditor: (content: string) => void;
  onSaveAsBlob: (title: string, content: string) => void;
}

// Helper YAML parser
function parseYaml(yaml: string): any {
  const lines = yaml.split("\n");
  const result: any = {};
  const stack: Array<{ indent: number; obj: any; key?: string; isArray?: boolean }> = [{ indent: -1, obj: result }];

  for (let line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Check if array item
    if (trimmed.startsWith("-")) {
      const valStr = trimmed.slice(1).trim();
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      if (parent.key && !parent.isArray) {
        parent.obj[parent.key] = [];
        parent.isArray = true;
      }
      const targetArray = parent.key ? parent.obj[parent.key] : parent.obj;
      
      if (valStr.includes(":")) {
        const [k, v] = valStr.split(/:(.+)/);
        const obj: any = {};
        const val = parseYamlValue(v.trim());
        obj[k.trim()] = val;
        targetArray.push(obj);
        stack.push({ indent: indent + 2, obj: obj });
      } else {
        targetArray.push(parseYamlValue(valStr));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;
      if (valStr === "") {
        parent[key] = {};
        stack.push({ indent: indent, obj: parent[key], key: key });
      } else {
        parent[key] = parseYamlValue(valStr);
      }
    }
  }
  return result;
}

function parseYamlValue(val: string): any {
  val = val.trim();
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  if (val.toLowerCase() === "true") return true;
  if (val.toLowerCase() === "false") return false;
  if (val.toLowerCase() === "null") return null;
  if (!isNaN(Number(val))) return Number(val);
  return val;
}

// Helper YAML generator
function jsonToYaml(obj: any, indent = 0): string {
  const spaces = " ".repeat(indent);
  if (obj === null) return "null";
  if (typeof obj === "undefined") return "";
  if (typeof obj !== "object") {
    if (typeof obj === "string") {
      if (obj.includes("\n") || obj.includes(":") || obj.includes("-")) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map(item => `${spaces}- ${jsonToYaml(item, indent + 2).trim()}`).join("\n");
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) return "{}";
  return keys.map(key => {
    const val = obj[key];
    if (typeof val === "object" && val !== null) {
      return `${spaces}${key}:\n${jsonToYaml(val, indent + 2)}`;
    }
    return `${spaces}${key}: ${jsonToYaml(val, indent + 2)}`;
  }).join("\n");
}

// CSV parser
function csvToJson(csv: string, delimiter = ","): any[] {
  const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(delimiter).map(h => {
    let trimmed = h.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1);
    }
    return trimmed;
  });

  if (headers.length === 0 || headers.every(h => h === "")) {
    throw new Error("Missing headers in CSV/TSV input.");
  }

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let currentVal = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());

    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}.`);
    }

    const rowObj: any = {};
    headers.forEach((header, idx) => {
      let val: any = values[idx];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val.toLowerCase() === "true") val = true;
      else if (val.toLowerCase() === "false") val = false;
      else if (val.toLowerCase() === "null") val = null;
      else if (!isNaN(Number(val)) && val !== "") val = Number(val);
      
      rowObj[header] = val;
    });
    result.push(rowObj);
  }
  return result;
}

// CSV Generator
function jsonToCsv(json: any[], delimiter = ","): string {
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error("JSON input must be an array of objects to convert to CSV/TSV.");
  }
  const headers = Object.keys(json[0]);
  const headerRow = headers.join(delimiter);
  const rows = json.map(obj => {
    return headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") val = JSON.stringify(val);
      const strVal = String(val);
      if (strVal.includes(delimiter) || strVal.includes('"') || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(delimiter);
  });
  return [headerRow, ...rows].join("\n");
}

const SAMPLE_CSV = `id,name,email,role,active
1,Naveen Boyala,naveen@jsonblob.io,admin,true
2,Sarah Connor,sarah@resistance.net,editor,true
3,John Doe,john.doe@gmail.com,user,false`;

const SAMPLE_YAML = `gateway:
  version: "2.4.1"
  environment: "production"
  routes:
    - path: "/users"
      service: "user-service"
      rateLimit: 100
    - path: "/billing"
      service: "billing-service"
      rateLimit: 50`;

export function ConversionView({ isDark, onLoadIntoEditor, onSaveAsBlob }: ConversionViewProps) {
  const [inputText, setInputText] = useState(SAMPLE_CSV);
  const [outputText, setOutputText] = useState("");
  const [inputFormat, setInputFormat] = useState<"csv" | "tsv" | "yaml" | "json">("csv");
  const [outputFormat, setOutputFormat] = useState<"csv" | "tsv" | "yaml" | "json">("json");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Set initial sample when format changes
  useEffect(() => {
    if (inputFormat === "csv") {
      setInputText(SAMPLE_CSV);
    } else if (inputFormat === "tsv") {
      setInputText(SAMPLE_CSV.replace(/,/g, "\t"));
    } else if (inputFormat === "yaml") {
      setInputText(SAMPLE_YAML);
    } else if (inputFormat === "json") {
      setInputText(JSON.stringify({
        users: [
          { id: 1, name: "Naveen Boyala", email: "naveen@jsonblob.io" },
          { id: 2, name: "Sarah Connor", email: "sarah@resistance.net" }
        ]
      }, null, 2));
    }
    setOutputText("");
    setValidationError(null);
    setSuccessMsg(null);
  }, [inputFormat]);

  const handleConvert = () => {
    setValidationError(null);
    setSuccessMsg(null);
    try {
      let parsedData: any = null;

      // 1. PARSE INPUT
      if (inputFormat === "json") {
        parsedData = JSON.parse(inputText);
      } else if (inputFormat === "yaml") {
        parsedData = parseYaml(inputText);
      } else if (inputFormat === "csv") {
        parsedData = csvToJson(inputText, ",");
      } else if (inputFormat === "tsv") {
        parsedData = csvToJson(inputText, "\t");
      }

      // 2. GENERATE OUTPUT
      let generatedText = "";
      if (outputFormat === "json") {
        generatedText = JSON.stringify(parsedData, null, 2);
      } else if (outputFormat === "yaml") {
        generatedText = jsonToYaml(parsedData);
      } else if (outputFormat === "csv") {
        const arr = Array.isArray(parsedData) ? parsedData : [parsedData];
        generatedText = jsonToCsv(arr, ",");
      } else if (outputFormat === "tsv") {
        const arr = Array.isArray(parsedData) ? parsedData : [parsedData];
        generatedText = jsonToCsv(arr, "\t");
      }

      setOutputText(generatedText);
      setSuccessMsg("Conversion completed successfully!");
    } catch (err: any) {
      setValidationError(err.message || "Failed to convert formats.");
      setOutputText("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const ext = outputFormat === "tsv" ? "tsv" : outputFormat === "csv" ? "csv" : outputFormat === "yaml" ? "yaml" : "json";
    link.download = `converted_data_${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    if (!outputText) return;
    if (outputFormat === "json") {
      onLoadIntoEditor(outputText);
    } else {
      // If it is CSV/YAML/TSV, convert to JSON first then load
      try {
        let parsedData: any = null;
        if (outputFormat === "yaml") parsedData = parseYaml(outputText);
        else if (outputFormat === "csv") parsedData = csvToJson(outputText, ",");
        else if (outputFormat === "tsv") parsedData = csvToJson(outputText, "\t");
        onLoadIntoEditor(JSON.stringify(parsedData, null, 2));
      } catch (err: any) {
        onLoadIntoEditor(JSON.stringify({ error: "Failed to load", raw: outputText }, null, 2));
      }
    }
  };

  const handleSaveAsBlobClick = () => {
    if (!outputText) return;
    let jsonStr = outputText;
    if (outputFormat !== "json") {
      try {
        let parsedData: any = null;
        if (outputFormat === "yaml") parsedData = parseYaml(outputText);
        else if (outputFormat === "csv") parsedData = csvToJson(outputText, ",");
        else if (outputFormat === "tsv") parsedData = csvToJson(outputText, "\t");
        jsonStr = JSON.stringify(parsedData, null, 2);
      } catch {
        // Fallback
      }
    }
    onSaveAsBlob("Imported Converted Blob", jsonStr);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
      
      // Auto-detect format from extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "csv") setInputFormat("csv");
      else if (ext === "tsv") setInputFormat("tsv");
      else if (ext === "yaml" || ext === "yml") setInputFormat("yaml");
      else if (ext === "json") setInputFormat("json");
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground h-full relative">
      {/* Header bar */}
      <header className="h-14 border-b border-border bg-card/60 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 select-none">
          <RefreshCw className="w-4 h-4 text-primary animate-spin-slow" />
          <span className="font-bold text-xs uppercase tracking-wider">Format Converter Studio</span>
        </div>

        {/* Upload file */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-accent rounded text-xs font-semibold cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
          <input
            type="file"
            accept=".csv,.tsv,.yaml,.yml,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </header>

      {/* Main Workspace Split layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Input Panel */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border overflow-hidden">
          {/* Toolbar */}
          <div className="h-10 px-4 bg-card/30 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Source Format:</span>
              <select
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value as any)}
                className="bg-background border border-border rounded px-2 py-0.5 text-xs outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="csv">CSV</option>
                <option value="tsv">TSV (Tab Separated)</option>
                <option value="yaml">YAML</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          {/* Input Monaco Editor */}
          <div className="flex-1 min-h-[180px] p-3 bg-background">
            <MonacoEditor
              value={inputText}
              onChange={(val) => setInputText(val || "")}
              isDark={isDark}
              language={inputFormat === "yaml" ? "yaml" : inputFormat === "json" ? "json" : "plaintext"}
            />
          </div>
        </div>

        {/* Middle action button for Conversion */}
        <div className="md:h-full md:w-16 flex items-center justify-center bg-card/10 shrink-0 border-b md:border-b-0 md:border-r border-border p-2">
          <button
            onClick={handleConvert}
            className="flex md:flex-col items-center gap-2 px-4 py-2 md:py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-xs font-bold shadow-md shadow-primary/10 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>Convert</span>
            <ArrowRight className="w-3.5 h-3.5 hidden md:block" />
          </button>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-10 px-4 bg-card/30 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Target Format:</span>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as any)}
                className="bg-background border border-border rounded px-2 py-0.5 text-xs outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
                <option value="csv">CSV</option>
                <option value="tsv">TSV (Tab Separated)</option>
              </select>
            </div>

            {/* Output Action buttons */}
            {outputText && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleLoad}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                  title="Load directly into the Workspace Code Editor"
                >
                  <FileCode className="w-3 h-3" />
                  <span>Load to Editor</span>
                </button>
                <button
                  onClick={handleSaveAsBlobClick}
                  className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                  title="Save output as a new JSON Blob"
                >
                  <FileJson className="w-3 h-3" />
                  <span>Save Blob</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copy Result"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Output Monaco Editor */}
          <div className="flex-1 min-h-[180px] p-3 bg-background">
            <MonacoEditor
              value={outputText}
              isDark={isDark}
              readOnly={true}
              language={outputFormat === "yaml" ? "yaml" : outputFormat === "json" ? "json" : "plaintext"}
            />
          </div>
        </div>
      </div>

      {/* Validation status panel footer */}
      <footer className="h-12 border-t border-border bg-card flex items-center justify-between px-6 shrink-0 text-xs text-muted-foreground select-none">
        <div className="flex-1 mr-4">
          {validationError ? (
            <div className="flex items-center gap-1.5 text-red-500 font-semibold leading-none">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Format Error: {validationError}</span>
            </div>
          ) : successMsg ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold leading-none">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <span>Ready for conversion. Upload a file or paste content to start.</span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default ConversionView;
