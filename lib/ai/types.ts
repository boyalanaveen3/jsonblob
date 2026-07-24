import { D1DatabaseSchema } from "../db/types";

export type AIContext = {
  query: string;
  selectedText?: string;
  providerId: string;
  providerName: string;
  activeDatabase?: D1DatabaseSchema;
  activeTable?: string;
  lastError?: string | null;
};

export interface AIExplanationResult {
  summary: string;
  tablesUsed: string[];
  filtersApplied: string[];
  executionFlow: string[];
  improvements: string[];
  complexity: string;
}

export interface AIOptimizeResult {
  originalQuery: string;
  optimizedQuery: string;
  changes: string[];
  performanceGainEstimate: string;
}

export interface AIFixResult {
  errorSummary: string;
  fixedQuery: string;
  explanation: string;
  fixSteps: string[];
}

export interface AISampleDataResult {
  tableName: string;
  rowCount: number;
  insertSql: string;
}

export interface AITypeScriptResult {
  typeName: string;
  interfaceCode: string;
  zodSchemaCode: string;
  apiResponseTypeCode: string;
}

export interface IAIProvider {
  id: string;
  name: string;
  
  explainSQL(ctx: AIContext): Promise<AIExplanationResult>;
  generateSQL(prompt: string, ctx: AIContext): Promise<string>;
  optimizeSQL(ctx: AIContext): Promise<AIOptimizeResult>;
  fixSQL(ctx: AIContext): Promise<AIFixResult>;
  chat(userMessage: string, history: Array<{ role: "user" | "assistant"; content: string }>, ctx: AIContext): Promise<string>;
  generateSampleData(tableName: string, count: number, isEdgeCase: boolean, ctx: AIContext): Promise<AISampleDataResult>;
  generateTypeScript(ctx: AIContext): Promise<AITypeScriptResult>;
}
