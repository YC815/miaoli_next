import { toast } from 'sonner';

export interface ApiErrorResponse {
  error: string;
  type?: string;
  retryable?: boolean;
  details?: unknown;
}

export interface ApiClientOptions extends RequestInit {
  retryCount?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
}

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * 判斷錯誤是否可以重試
 */
function isRetryableError(status: number, errorData?: ApiErrorResponse): boolean {
  // 503 (Service Unavailable) 和 504 (Gateway Timeout) 可重試
  if (status === 503 || status === 504) {
    return true;
  }

  // 伺服器明確表示可重試
  if (errorData?.retryable === true) {
    return true;
  }

  return false;
}

/**
 * 延遲執行
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 增強版 fetch，支援自動重試與錯誤處理
 */
export async function apiClient<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const {
    retryCount = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
    showErrorToast = true,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      lastResponse = response;

      // 成功回應
      if (response.ok) {
        return await response.json();
      }

      // 解析錯誤回應
      let errorData: ApiErrorResponse = { error: '系統發生錯誤' };
      try {
        const parsedError = await response.json();
        errorData = parsedError;
      } catch {
        // Keep default error message
      }

      // 檢查是否可重試
      if (attempt < retryCount && isRetryableError(response.status, errorData)) {
        console.warn(
          `Request failed (attempt ${attempt + 1}/${retryCount + 1}), retrying...`,
          { url, status: response.status, error: errorData.error }
        );
        await delay(retryDelay * (attempt + 1)); // 指數退避
        continue;
      }

      // 不可重試或已達重試次數上限
      const error = new Error(errorData.error || '請求失敗');
      (error as Error & { response?: Response; data?: ApiErrorResponse }).response = response;
      (error as Error & { response?: Response; data?: ApiErrorResponse }).data = errorData;

      if (showErrorToast) {
        toast.error(errorData.error || '操作失敗，請稍後再試');
      }

      throw error;
    } catch (error) {
      lastError = error as Error;

      // 網路錯誤（無回應）
      if (!lastResponse) {
        if (attempt < retryCount) {
          console.warn(
            `Network error (attempt ${attempt + 1}/${retryCount + 1}), retrying...`,
            { url, error }
          );
          await delay(retryDelay * (attempt + 1));
          continue;
        }

        // 網路錯誤且已達重試次數上限
        if (showErrorToast) {
          toast.error('網路連線失敗，請檢查您的網路狀態');
        }
      }

      throw error;
    }
  }

  // 不應該到這裡，但為了型別安全
  throw lastError || new Error('Request failed');
}

/**
 * 便捷方法：GET
 */
export function apiGet<T = unknown>(
  url: string,
  options?: Omit<ApiClientOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(url, { ...options, method: 'GET' });
}

/**
 * 便捷方法：POST
 */
export function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<ApiClientOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * 便捷方法：PUT
 */
export function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<ApiClientOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * 便捷方法：DELETE
 */
export function apiDelete<T = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<ApiClientOptions, 'method' | 'body'>
): Promise<T> {
  return apiClient<T>(url, {
    ...options,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
