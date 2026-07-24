export interface CloudflareAccount {
  id: string;
  name: string;
  type?: string;
}

export interface CloudflareD1Database {
  uuid: string;
  name: string;
  created_at: string;
  version?: string;
  num_tables?: number;
}

export interface CloudflareQueryResponse {
  success: boolean;
  results?: Array<{
    results?: Array<Record<string, any>>;
    success?: boolean;
    meta?: {
      duration?: number;
      changes?: number;
      last_row_id?: number;
      rows_read?: number;
      rows_written?: number;
    };
  }>;
  errors?: Array<{ code: number; message: string }>;
  messages?: string[];
}

export class CloudflareService {
  private baseUrl = "https://api.cloudflare.com/client/v4";

  /**
   * Fetch Cloudflare Accounts for the authenticated user
   */
  async getAccounts(token: string): Promise<CloudflareAccount[]> {
    const res = await fetch(`${this.baseUrl}/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch Cloudflare accounts (${res.status}): ${body}`);
    }
    const data: any = await res.json();
    return data.result || [];
  }

  /**
   * Fetch D1 Databases for a specific Cloudflare Account ID
   */
  async getD1Databases(accountId: string, token: string): Promise<CloudflareD1Database[]> {
    const res = await fetch(`${this.baseUrl}/accounts/${accountId}/d1/database`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch D1 databases (${res.status}): ${body}`);
    }
    const data: any = await res.json();
    return data.result || [];
  }

  /**
   * Execute raw SQL statements on a Cloudflare D1 Database via REST API
   */
  async executeQuery(
    accountId: string,
    databaseId: string,
    sql: string,
    token: string
  ): Promise<CloudflareQueryResponse> {
    try {
      const res = await fetch(
        `${this.baseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        }
      );
      const data: any = await res.json();
      return data as CloudflareQueryResponse;
    } catch (err: any) {
      return {
        success: false,
        errors: [{ code: 500, message: err.message }],
      };
    }
  }
}

export const cloudflareService = new CloudflareService();
