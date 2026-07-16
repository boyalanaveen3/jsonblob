export interface ExecutionResult {
  logs: string[];
  error?: string;
  compilationError?: string;
  warnings?: string[];
  timeMs: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
}

export interface LanguageAdapter {
  language: string;
  extension: string;
  run(code: string): Promise<ExecutionResult>;
  format(code: string): Promise<string>;
  validate(code: string): ValidationResult;
}
