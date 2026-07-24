"use client";

import { useState, useEffect, useCallback } from "react";
import { CloudflareD1Database } from "@/lib/services/cloudflare.service";

export interface ConnectedCloudflareAccount {
  id: string;
  name: string;
  email: string;
  organization: string;
  connectedAt: string;
  databases: CloudflareD1Database[];
}

export interface CloudflareConnectionState {
  status: "disconnected" | "connecting" | "connected";
  accounts: ConnectedCloudflareAccount[];
  activeAccountId: string | null;
  selectedDatabaseId: string | null;
  error: string | null;
}

const DEFAULT_ACCOUNTS: ConnectedCloudflareAccount[] = [
  {
    id: "acc-personal-01",
    name: "Cloudflare Production D1",
    email: "boyalanaveen103@gmail.com",
    organization: "Cloudflare Global",
    connectedAt: new Date().toISOString(),
    databases: [
      {
        uuid: "1ad3573e-3f03-1906-8599-0b56d06cdc0f",
        name: "jsonblob-db",
        created_at: "2026-07-01T00:00:00Z",
        num_tables: 6,
      },
      {
        uuid: "9001-d1-prod-uuid",
        name: "production-db",
        created_at: "2026-07-05T00:00:00Z",
        num_tables: 3,
      },
    ],
  },
  {
    id: "acc-enterprise-02",
    name: "Cloudflare Enterprise / Work",
    email: "naveen@enterprise.io",
    organization: "Enterprise SaaS Org",
    connectedAt: new Date().toISOString(),
    databases: [
      {
        uuid: "ent-db-001",
        name: "enterprise-analytics-db",
        created_at: "2026-07-10T00:00:00Z",
        num_tables: 8,
      },
      {
        uuid: "ent-db-002",
        name: "tenant-isolation-d1",
        created_at: "2026-07-15T00:00:00Z",
        num_tables: 4,
      },
    ],
  },
];

export function useCloudflare() {
  const [state, setState] = useState<CloudflareConnectionState>({
    status: "disconnected",
    accounts: [],
    activeAccountId: null,
    selectedDatabaseId: null,
    error: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/cloudflare/session");
      const session: any = await res.json();

      if (session.isConnected && Array.isArray(session.accounts) && session.accounts.length > 0) {
        const accounts = session.accounts.map((a: any, idx: number) => ({
          id: a.id || `acc-${idx}`,
          name: a.name || `Cloudflare Account ${idx + 1}`,
          email: a.email || null,
          organization: a.organization || null,
          connectedAt: a.connectedAt || new Date().toISOString(),
          databases: Array.isArray(a.databases) ? a.databases : [],
        }));

        const savedAccId = typeof window !== "undefined" ? localStorage.getItem("cf_active_acc_id") : null;
        const activeAccId = savedAccId && accounts.some((a: any) => a.id === savedAccId)
          ? savedAccId
          : accounts[0].id;

        const currentAcc = accounts.find((a: any) => a.id === activeAccId) || accounts[0];
        const savedDbId = typeof window !== "undefined" ? localStorage.getItem("cf_selected_db_id") : null;
        const activeDbId = savedDbId && currentAcc.databases.some((d: any) => d.uuid === savedDbId)
          ? savedDbId
          : (currentAcc.databases[0] && currentAcc.databases[0].uuid) || null;

        setState({
          status: "connected",
          accounts,
          activeAccountId: activeAccId,
          selectedDatabaseId: activeDbId,
          error: null,
        });
          if (typeof window !== "undefined") {
            const primary = accounts[0];
            localStorage.setItem("cloudflare_d1_session", JSON.stringify({
              isConnected: true,
              accountName: primary.name,
              email: primary.email || null,
              organization: primary.organization || null,
              connectedAt: primary.connectedAt || new Date().toISOString(),
            }));
          }
      } else {
        setState((prev) => ({ ...prev, status: "disconnected" }));
      }
    } catch (err: any) {
      setState((prev) => ({ ...prev, status: "disconnected", error: err.message }));
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const switchAccount = (accId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cf_active_acc_id", accId);
    }
    const acc = state.accounts.find((a) => a.id === accId);
    const newDbId = acc && acc.databases.length > 0 ? acc.databases[0].uuid : null;
    if (newDbId && typeof window !== "undefined") {
      localStorage.setItem("cf_selected_db_id", newDbId);
    }

    setState((prev) => ({
      ...prev,
      activeAccountId: accId,
      selectedDatabaseId: newDbId,
    }));
  };

  const login = (promptAccount = false) => {
    setState((prev) => ({ ...prev, status: "connecting" }));
    const url = promptAccount
      ? "/api/auth/cloudflare?prompt=select_account"
      : "/api/auth/cloudflare";
    window.location.href = url;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/cloudflare/session", { method: "DELETE" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("cloudflare_d1_session");
        localStorage.removeItem("cf_selected_db_id");
        localStorage.removeItem("cf_active_acc_id");
      }
      setState({
        status: "disconnected",
        accounts: [],
        activeAccountId: null,
        selectedDatabaseId: null,
        error: null,
      });
    } catch (e) {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  const selectDatabase = (dbId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cf_selected_db_id", dbId);
    }
    setState((prev) => ({ ...prev, selectedDatabaseId: dbId }));
  };

  const activeAccount = state.accounts.find((a) => a.id === state.activeAccountId) || null;
  const currentDatabases = activeAccount ? activeAccount.databases : [];

  return {
    state,
    isLoading,
    activeAccount,
    currentDatabases,
    login,
    logout,
    switchAccount,
    selectDatabase,
    refreshDatabases: checkConnection,
  };
}
