import { Rule } from './forge/rule';
import type { Response } from 'node-fetch';

export interface DynamicValueResponse {
  id: string;
  name: string;
  type: {
    value: string;
  };
}

export interface ValuesClient {
  listDynamicValues(): Promise<DynamicValueResponse[]>;
  update(params: { request: Record<string, any> }): Promise<void>;
}

export interface RulebricksClient {
  values: ValuesClient;
  assets: {
    importRule: (rule: { rule: Record<string, any> }) => Promise<void>;
    exportRule: (ruleId: string) => Promise<Record<string, any>>;
    listFolders: () => Promise<any[]>;
    upsertFolder: (folder: Record<string, any>) => Promise<any>;
    listRules: () => Promise<any[]>;
    deleteRule: (params: { id: string }) => Promise<void>;
  };
  rules: {
    solve: (params: { slug: string; request: Record<string, any> }) => Promise<Record<string, any>>;
  };
}

export class RulebricksSDK implements RulebricksClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchInstance: any;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://rulebricks.com/api/v1';
    this.fetchInstance = null;
  }

  private async initFetch() {
    if (!this.fetchInstance) {
      this.fetchInstance = (await import('node-fetch')).default;
    }
    return this.fetchInstance;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, any>
  ): Promise<T> {
    const fetch = await this.initFetch();
    // Remove /api/v1 prefix if it exists in the path since it's already in baseUrl
    const normalizedPath = path.startsWith('/api/v1') ? path.substring(7) : path;
    const url = `${this.baseUrl}${normalizedPath}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'X-Fern-Language': 'TypeScript'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as T;
    return data;
  }

  values: ValuesClient = {
    listDynamicValues: async (): Promise<DynamicValueResponse[]> => {
      return this.request<DynamicValueResponse[]>('GET', '/values');
    },
    update: async (params: { request: Record<string, any> }): Promise<void> => {
      await this.request<void>('POST', '/values', params.request);
    }
  };

  assets = {
    importRule: async (params: { rule: Record<string, any> }): Promise<void> => {
      await this.request('POST', '/admin/rules/import', params);
    },
    exportRule: async (ruleId: string): Promise<Record<string, any>> => {
      return this.request('GET', '/admin/rules/export', { id: ruleId });
    },
    listFolders: async (): Promise<any[]> => {
      return this.request('GET', '/admin/folders/list');
    },
    upsertFolder: async (folder: Record<string, any>): Promise<any> => {
      return this.request('POST', '/admin/folders/upsert', folder);
    },
    listRules: async (): Promise<any[]> => {
      return this.request('GET', '/admin/rules/list');
    },
    deleteRule: async (params: { id: string }): Promise<void> => {
      await this.request('DELETE', '/admin/rules/delete', { id: params.id });
    }
  };

  rules = {
    solve: async (params: { slug: string; request: Record<string, any> }): Promise<Record<string, any>> => {
      return this.request('POST', `/api/v1/rules/${params.slug}/solve`, params.request);
    }
  };

  configure(apiKey: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }
}

export function configure(apiKey: string, baseUrl?: string): RulebricksClient {
  const sdk = new RulebricksSDK({ apiKey, baseUrl });
  return sdk;
}
