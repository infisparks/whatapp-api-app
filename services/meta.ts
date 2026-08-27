import { META_CONFIG } from '@/lib/meta-config';
import { redactSecret } from './encryption';

export interface MetaApiOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  accessToken?: string;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  maxRetries?: number;
}

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

export class MetaGraphApiException extends Error {
  public code: number;
  public subcode?: number;
  public type: string;
  public fbtraceId?: string;
  public userTitle?: string;
  public userMsg?: string;

  constructor(error: MetaApiError) {
    super(error.message || 'Meta Graph API Error');
    this.name = 'MetaGraphApiException';
    this.code = error.code || 500;
    this.subcode = error.error_subcode;
    this.type = error.type || 'ApiException';
    this.fbtraceId = error.fbtrace_id;
    this.userTitle = error.error_user_title;
    this.userMsg = error.error_user_msg;
  }
}

/**
 * Low-level client for Meta Graph API v26.0
 */
export async function callMetaGraphApi<T = any>(
  endpoint: string,
  options: MetaApiOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    accessToken,
    body,
    params,
    headers = {},
    maxRetries = 2,
  } = options;

  const apiVersion = process.env.META_GRAPH_API_VERSION || META_CONFIG.GRAPH_API_VERSION;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  const url = new URL(`${META_CONFIG.GRAPH_BASE_URL}/${apiVersion}/${cleanEndpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const requestHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...headers,
  };

  if (accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorData: MetaApiError = data.error || {
          message: `HTTP ${response.status} ${response.statusText}`,
          type: 'HTTPError',
          code: response.status,
        };

        console.error(`[MetaGraphApi Error] ${method} ${cleanEndpoint} failed (Attempt ${attempt + 1}):`, {
          code: errorData.code,
          subcode: errorData.error_subcode,
          message: errorData.message,
          fbtrace_id: errorData.fbtrace_id,
        });

        // Retry on transient rate limit or server errors
        const isTransient = [429, 500, 502, 503, 504].includes(errorData.code);
        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }

        throw new MetaGraphApiException(errorData);
      }

      return data as T;
    } catch (err: any) {
      lastError = err;
      if (err instanceof MetaGraphApiException) {
        throw err;
      }
      
      console.error(`[MetaGraphApi Network Error] ${method} ${cleanEndpoint} (Attempt ${attempt + 1}):`, err.message);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
      } else {
        break;
      }
    }
  }

  throw lastError || new Error(`Failed to call Meta Graph API after ${maxRetries + 1} attempts`);
}
