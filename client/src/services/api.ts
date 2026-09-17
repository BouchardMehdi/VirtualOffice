export type ServiceStatus = 'ready' | 'database-unavailable' | 'unavailable';

export async function getServiceStatus(signal: AbortSignal): Promise<ServiceStatus> {
  const response = await fetch('/api/health', { signal });
  const health: { status?: string; database?: string } = await response.json();

  if (response.ok && health.status === 'ok' && health.database === 'connected') {
    return 'ready';
  }

  return health.database === 'unavailable' ? 'database-unavailable' : 'unavailable';
}
