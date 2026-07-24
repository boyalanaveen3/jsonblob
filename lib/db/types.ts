export interface ColumnDefinition {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  defaultValue?: string | null;
}

export interface TableDefinition {
  name?: string;
  columns: ColumnDefinition[];
  rows: Record<string, any>[];
  primaryKey?: string[];
  foreignKeys?: Array<{ column: string; targetTable: string; targetColumn: string }>;
  constraints?: string[];
}

export interface ViewDefinition {
  name: string;
  definition: string;
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  isUnique?: boolean;
}

export interface TriggerDefinition {
  name: string;
  tableName: string;
  event: string;
}

export type DatabaseStats = {
  size: string;
  totalTables: number;
  totalViews: number;
  totalIndexes: number;
  totalTriggers: number;
  totalRows: number;
  lastUpdated: string;
  sqliteVersion: string;
};

export interface D1DatabaseSchema {
  id: string;
  name: string;
  size?: string;
  sqliteVersion?: string;
  lastUpdated?: string;
  tables: Record<string, TableDefinition>;
  views?: Record<string, ViewDefinition>;
  indexes?: Record<string, IndexDefinition>;
  triggers?: Record<string, TriggerDefinition>;
}

export interface QueryExecutionResult {
  rows?: Array<Record<string, any>>;
  rowsCount?: number;
  message?: string;
  error?: string;
  duration: number;
}

export interface ProviderConnectionStatus {
  isConnected: boolean;
  accountName?: string;
  email?: string;
  organization?: string;
  connectedAt?: string;
}

export interface IDatabaseProvider {
  id: string;
  name: string;
  description: string;
  requiresAuth: boolean;
  
  connect(credentials?: any): Promise<boolean>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ProviderConnectionStatus;
  getDatabases(): Promise<D1DatabaseSchema[]>;
  executeQuery(dbId: string, queryStr: string): Promise<QueryExecutionResult>;
}
