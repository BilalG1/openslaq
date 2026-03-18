import { OpenSlaqApiError } from "./errors";

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  workspaceSlug: string;
  fetch: typeof globalThis.fetch;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly workspaceSlug: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: HttpClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.workspaceSlug = options.workspaceSlug;
    this.fetch = options.fetch;
  }

  workspacePath(path: string): string {
    return `/api/workspaces/${this.workspaceSlug}${path}`;
  }

  globalPath(path: string): string {
    return `/api${path}`;
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, query);
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async postVoid(path: string, body?: unknown): Promise<void> {
    const url = this.buildUrl(path);
    await this.requestVoid(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async putVoid(path: string, body?: unknown): Promise<void> {
    const url = this.buildUrl(path);
    await this.requestVoid(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async del(path: string): Promise<void> {
    const url = this.buildUrl(path);
    await this.requestVoid(url, { method: "DELETE" });
  }

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    const response = await this.fetch(url, { method: "POST", headers, body: formData });
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
    const text = await response.text();
    if (!text) throw new OpenSlaqApiError(response.status, "Expected response body but received empty response");
    return JSON.parse(text) as T;
  }

  async getRedirectUrl(path: string): Promise<string> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    const response = await this.fetch(url, { method: "GET", headers, redirect: "manual" });
    const location = response.headers.get("Location");
    if (!location) {
      throw new OpenSlaqApiError(response.status, "Missing Location header in redirect response");
    }
    return location;
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, typeof value === "boolean" ? (value ? "true" : "false") : String(value));
        }
      }
    }
    return url.toString();
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        errorMessage = body.error;
      }
    } catch {
      // Use default error message
    }
    throw new OpenSlaqApiError(response.status, errorMessage);
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (init.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetch(url, { ...init, headers });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const text = await response.text();
    if (!text) throw new OpenSlaqApiError(response.status, "Expected response body but received empty response");
    return JSON.parse(text) as T;
  }

  private async requestVoid(url: string, init: RequestInit): Promise<void> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (init.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetch(url, { ...init, headers });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
  }
}
