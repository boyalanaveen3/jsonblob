import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewType = "dashboard" | "workspace" | "sql" | "api" | "collections" | "settings" | "conversion";

export interface SqlTab {
  id: string;
  title: string;
  query: string;
  dialect: "sqlite" | "postgres" | "d1";
}

export interface SqlHistoryItem {
  id: string;
  query: string;
  dialect: string;
  executedAt: string;
  status: "success" | "error";
  duration: number;
  error?: string;
  rowsCount?: number;
}

export interface SavedQuery {
  id: string;
  title: string;
  query: string;
  dialect: string;
  createdAt: string;
}

export interface ApiRequestItem {
  id: string;
  name?: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  auth: {
    type: "none" | "bearer" | "basic" | "apikey";
    bearerToken?: string;
    basicUser?: string;
    basicPass?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
  };
  bodyType: "json" | "form" | "raw" | "none";
  body: string;
  formData: Array<{ key: string; value: string; enabled: boolean }>;
}

export interface ApiHistoryItem extends ApiRequestItem {
  executedAt: string;
  statusCode: number;
  duration: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  requests: ApiRequestItem[];
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  blobIds: string[];
}

export interface ActivityItem {
  id: string;
  type: "blob_create" | "blob_update" | "sql_run" | "api_send";
  title: string;
  timestamp: string;
}

interface WorkspaceState {
  // Navigation
  activeView: ViewType;
  isSidebarCollapsed: boolean;
  
  // SQL Editor
  sqlTabs: SqlTab[];
  activeSqlTabId: string;
  sqlHistory: SqlHistoryItem[];
  savedQueries: SavedQuery[];
  
  // API Studio
  apiHistory: ApiHistoryItem[];
  apiCollections: ApiCollection[];
  envVariables: EnvVariable[];
  activeApiRequest: ApiRequestItem;
  
  // Collections
  collections: Collection[];
  
  // Recent Activity
  activities: ActivityItem[];
  
  // Favorites
  favoriteBlobIds: string[];

  // Actions
  setActiveView: (view: ViewType) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // SQL Actions
  addSqlTab: (tab?: Partial<SqlTab>) => void;
  closeSqlTab: (id: string) => void;
  setActiveSqlTabId: (id: string) => void;
  updateSqlTab: (id: string, updates: Partial<SqlTab>) => void;
  addSqlHistory: (item: Omit<SqlHistoryItem, "id" | "executedAt">) => void;
  clearSqlHistory: () => void;
  saveQuery: (title: string, query: string, dialect: string) => void;
  deleteSavedQuery: (id: string) => void;
  
  // API Actions
  setActiveApiRequest: (req: ApiRequestItem) => void;
  updateActiveApiRequest: (updates: Partial<ApiRequestItem>) => void;
  addApiHistory: (item: Omit<ApiHistoryItem, "id" | "executedAt">) => void;
  clearApiHistory: () => void;
  addApiCollection: (name: string, description?: string) => string;
  renameApiCollection: (id: string, name: string) => void;
  deleteApiCollection: (id: string) => void;
  saveRequestToCollection: (collectionId: string, request: Omit<ApiRequestItem, "id"> & { title?: string; name?: string }) => void;
  addRequestToCollection: (collectionId: string, request?: Partial<ApiRequestItem>) => void;
  deleteRequestFromCollection: (collectionId: string, requestId: string) => void;
  updateRequestInCollection: (collectionId: string, requestId: string, updates: Partial<ApiRequestItem>) => void;
  importApiCollections: (newCollections: ApiCollection[]) => void;
  addEnvVariable: (variable: Omit<EnvVariable, "id">) => void;
  updateEnvVariable: (id: string, updates: Partial<EnvVariable>) => void;
  deleteEnvVariable: (id: string) => void;
  
  // Collections
  createCollection: (name: string, description?: string) => void;
  deleteCollection: (id: string) => void;
  toggleBlobInCollection: (collectionId: string, blobId: string) => void;
  
  // Activities
  addActivity: (type: ActivityItem["type"], title: string) => void;
  clearActivities: () => void;
  
  // Favorites
  toggleFavoriteBlob: (blobId: string) => void;
}

const DEFAULT_API_REQUEST: ApiRequestItem = {
  id: "current-req",
  method: "GET",
  url: "https://api.github.com/users/google",
  headers: [{ key: "Accept", value: "application/json", enabled: true }],
  auth: { type: "none" },
  bodyType: "none",
  body: "{\n  \n}",
  formData: [],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Default States
      activeView: "dashboard",
      isSidebarCollapsed: false,
      sqlTabs: [
        {
          id: "sql-scratchpad",
          title: "Query 1",
          query: "-- SQL Editor - Run queries against mock database engines\nSELECT * FROM users LIMIT 10;\n",
          dialect: "sqlite",
        },
      ],
      activeSqlTabId: "sql-scratchpad",
      sqlHistory: [],
      savedQueries: [],
      apiHistory: [],
      apiCollections: [],
      envVariables: [],
      activeApiRequest: DEFAULT_API_REQUEST,
      collections: [],
      activities: [
        {
          id: "welcome-activity",
          type: "blob_create",
          title: "Developer Workspace Initialized",
          timestamp: new Date().toISOString(),
        },
      ],
      favoriteBlobIds: [],

      // Navigation Actions
      setActiveView: (view) => set({ activeView: view }),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      // SQL Actions
      addSqlTab: (tab) => {
        const { sqlTabs } = get();
        const newId = crypto.randomUUID();
        const newTab: SqlTab = {
          id: newId,
          title: tab?.title || `Query ${sqlTabs.length + 1}`,
          query: tab?.query || "-- Write SQL query here\nSELECT 1;\n",
          dialect: tab?.dialect || "sqlite",
        };
        set({
          sqlTabs: [...sqlTabs, newTab],
          activeSqlTabId: newId,
        });
      },
      closeSqlTab: (id) => {
        const { sqlTabs, activeSqlTabId } = get();
        if (sqlTabs.length === 1) return; // Keep at least one
        const activeIdx = sqlTabs.findIndex((t) => t.id === id);
        const filtered = sqlTabs.filter((t) => t.id !== id);
        let nextActiveId = activeSqlTabId;
        if (activeSqlTabId === id) {
          nextActiveId = filtered[activeIdx === 0 ? 0 : activeIdx - 1].id;
        }
        set({ sqlTabs: filtered, activeSqlTabId: nextActiveId });
      },
      setActiveSqlTabId: (id) => set({ activeSqlTabId: id }),
      updateSqlTab: (id, updates) => {
        const { sqlTabs } = get();
        set({
          sqlTabs: sqlTabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        });
      },
      addSqlHistory: (item) => {
        const { sqlHistory } = get();
        const newItem: SqlHistoryItem = {
          ...item,
          id: crypto.randomUUID(),
          executedAt: new Date().toISOString(),
        };
        set({ sqlHistory: [newItem, ...sqlHistory].slice(0, 50) }); // Limit to 50 items
      },
      clearSqlHistory: () => set({ sqlHistory: [] }),
      saveQuery: (title, query, dialect) => {
        const { savedQueries } = get();
        const newSaved: SavedQuery = {
          id: crypto.randomUUID(),
          title,
          query,
          dialect,
          createdAt: new Date().toISOString(),
        };
        set({ savedQueries: [newSaved, ...savedQueries] });
      },
      deleteSavedQuery: (id) => {
        const { savedQueries } = get();
        set({ savedQueries: savedQueries.filter((q) => q.id !== id) });
      },

      // API Actions
      setActiveApiRequest: (req) => set({ activeApiRequest: req }),
      updateActiveApiRequest: (updates) => {
        const { activeApiRequest } = get();
        set({ activeApiRequest: { ...activeApiRequest, ...updates } });
      },
      addApiHistory: (item) => {
        const { apiHistory } = get();
        const newItem: ApiHistoryItem = {
          ...item,
          id: crypto.randomUUID(),
          executedAt: new Date().toISOString(),
        };
        set({ apiHistory: [newItem, ...apiHistory].slice(0, 50) }); // Limit to 50
      },
      clearApiHistory: () => set({ apiHistory: [] }),
      addApiCollection: (name, description) => {
        const { apiCollections } = get();
        const newColId = crypto.randomUUID();
        const newCol: ApiCollection = {
          id: newColId,
          name: name.trim(),
          description: description?.trim(),
          requests: [],
        };
        set({ apiCollections: [newCol, ...apiCollections] });
        return newColId;
      },
      renameApiCollection: (id, name) => {
        const { apiCollections } = get();
        set({
          apiCollections: apiCollections.map((c) =>
            c.id === id ? { ...c, name: name.trim() } : c
          ),
        });
      },
      deleteApiCollection: (id) => {
        const { apiCollections } = get();
        set({ apiCollections: apiCollections.filter((c) => c.id !== id) });
      },
      saveRequestToCollection: (collectionId, request) => {
        const { apiCollections } = get();
        set({
          apiCollections: apiCollections.map((c) => {
            if (c.id === collectionId) {
              const newReq: ApiRequestItem = {
                ...request,
                id: crypto.randomUUID(),
                name: request.name || request.title || `${request.method} ${request.url}`,
              };
              return { ...c, requests: [...c.requests, newReq] };
            }
            return c;
          }),
        });
      },
      addRequestToCollection: (collectionId, request) => {
        const { apiCollections } = get();
        const newReq: ApiRequestItem = {
          id: crypto.randomUUID(),
          name: request?.name || "New Request",
          method: request?.method || "GET",
          url: request?.url || "https://api.github.com/users/google",
          headers: request?.headers || [{ key: "Accept", value: "application/json", enabled: true }],
          auth: request?.auth || { type: "none" },
          bodyType: request?.bodyType || "none",
          body: request?.body || "{\n  \n}",
          formData: request?.formData || [],
        };
        set({
          apiCollections: apiCollections.map((c) => {
            if (c.id === collectionId) {
              return { ...c, requests: [...c.requests, newReq] };
            }
            return c;
          }),
        });
      },
      deleteRequestFromCollection: (collectionId, requestId) => {
        const { apiCollections } = get();
        set({
          apiCollections: apiCollections.map((c) => {
            if (c.id === collectionId) {
              return { ...c, requests: c.requests.filter((r) => r.id !== requestId) };
            }
            return c;
          }),
        });
      },
      updateRequestInCollection: (collectionId, requestId, updates) => {
        const { apiCollections } = get();
        set({
          apiCollections: apiCollections.map((c) => {
            if (c.id === collectionId) {
              return {
                ...c,
                requests: c.requests.map((r) => (r.id === requestId ? { ...r, ...updates } : r)),
              };
            }
            return c;
          }),
        });
      },
      importApiCollections: (newCollections) => {
        const { apiCollections } = get();
        // Merge or append imported collections
        set({ apiCollections: [...newCollections, ...apiCollections] });
      },
      addEnvVariable: (variable) => {
        const { envVariables } = get();
        const newVar: EnvVariable = {
          ...variable,
          id: crypto.randomUUID(),
        };
        set({ envVariables: [...envVariables, newVar] });
      },
      updateEnvVariable: (id, updates) => {
        const { envVariables } = get();
        set({
          envVariables: envVariables.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        });
      },
      deleteEnvVariable: (id) => {
        const { envVariables } = get();
        set({ envVariables: envVariables.filter((v) => v.id !== id) });
      },

      // Collections Actions
      createCollection: (name, description) => {
        const { collections } = get();
        const newCol: Collection = {
          id: crypto.randomUUID(),
          name,
          description,
          blobIds: [],
        };
        set({ collections: [newCol, ...collections] });
      },
      deleteCollection: (id) => {
        const { collections } = get();
        set({ collections: collections.filter((c) => c.id !== id) });
      },
      toggleBlobInCollection: (collectionId, blobId) => {
        const { collections } = get();
        set({
          collections: collections.map((c) => {
            if (c.id === collectionId) {
              const exists = c.blobIds.includes(blobId);
              return {
                ...c,
                blobIds: exists ? c.blobIds.filter((id) => id !== blobId) : [...c.blobIds, blobId],
              };
            }
            return c;
          }),
        });
      },

      // Activities Actions
      addActivity: (type, title) => {
        const { activities } = get();
        const newItem: ActivityItem = {
          id: crypto.randomUUID(),
          type,
          title,
          timestamp: new Date().toISOString(),
        };
        set({ activities: [newItem, ...activities].slice(0, 30) });
      },
      clearActivities: () => set({ activities: [] }),

      // Favorites Actions
      toggleFavoriteBlob: (blobId) => {
        const { favoriteBlobIds } = get();
        const exists = favoriteBlobIds.includes(blobId);
        set({
          favoriteBlobIds: exists
            ? favoriteBlobIds.filter((id) => id !== blobId)
            : [...favoriteBlobIds, blobId],
        });
      },
    }),
    {
      name: "jsonblob-workspace-persist",
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        sqlTabs: state.sqlTabs,
        activeSqlTabId: state.activeSqlTabId,
        sqlHistory: state.sqlHistory,
        savedQueries: state.savedQueries,
        apiHistory: state.apiHistory,
        apiCollections: state.apiCollections,
        envVariables: state.envVariables,
        collections: state.collections,
        activities: state.activities,
        favoriteBlobIds: state.favoriteBlobIds,
      }),
    }
  )
);
