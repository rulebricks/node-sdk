import { Rule } from './forge/rule';
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';

export interface RulebricksClient {
  assets: {
    importRule: (rule: Record<string, any>) => Promise<void>;
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

  constructor(apiKey: string, baseUrl: string = 'https://rulebricks.com/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, any>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  assets = {
    importRule: async (rule: Record<string, any>): Promise<void> => {
      await this.request('POST', '/assets/rules', rule);
    },
    exportRule: async (ruleId: string): Promise<Record<string, any>> => {
      return this.request('GET', `/assets/rules/${ruleId}`);
    },
    listFolders: async (): Promise<any[]> => {
      return this.request('GET', '/assets/folders');
    },
    upsertFolder: async (folder: Record<string, any>): Promise<any> => {
      return this.request('POST', '/assets/folders', folder);
    },
    listRules: async (): Promise<any[]> => {
      return this.request('GET', '/assets/rules');
    },
    deleteRule: async (params: { id: string }): Promise<void> => {
      await this.request('DELETE', `/assets/rules/${params.id}`);
    }
  };

  rules = {
    solve: async (params: { slug: string; request: Record<string, any> }): Promise<Record<string, any>> => {
      return this.request('POST', `/rules/${params.slug}/solve`, params.request);
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
  const sdk = new RulebricksSDK(apiKey, baseUrl);
  return sdk;
}
