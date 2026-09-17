export type ServiceStatus = 'ready' | 'database-unavailable' | 'unavailable';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: {
  method?: string; body?: unknown; token?: string; signal?: AbortSignal;
} = {}): Promise<T> {
  const timeout = AbortSignal.timeout(8_000);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, 'Le serveur ne répond pas. Réessaie dans un instant.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    throw new ApiError(response.status, data?.error || 'Le service est indisponible. Réessaie dans un instant.');
  }
  return data as T;
}

export async function getServiceStatus(signal: AbortSignal): Promise<ServiceStatus> {
  const response = await fetch('/api/health', { signal });
  const health: { status?: string; database?: string } = await response.json();

  if (response.ok && health.status === 'ok' && health.database === 'connected') {
    return 'ready';
  }

  return health.database === 'unavailable' ? 'database-unavailable' : 'unavailable';
}
