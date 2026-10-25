import type { ApiError, ApiErrorCode } from '@lobby/contracts';

/** NETWORK: the request may or may not have reached the server. OFFLINE: it was never sent. */
export type ClientErrorCode = ApiErrorCode | 'NETWORK' | 'OFFLINE';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const isApiError = (body: unknown): body is ApiError =>
  typeof body === 'object' && body !== null && 'code' in body && 'message' in body;

type ApiInit = Omit<RequestInit, 'headers'> & { json?: unknown; headers?: Record<string, string> };

/** fetch wrapper: JSON in, JSON out, every failure becomes an `ApiRequestError` with a code the UI can translate. */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      headers: { Accept: 'application/json', ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError(0, 'NETWORK', 'Network request failed');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // A success whose body never arrived tells the caller nothing, so it counts as a dropped connection.
    if (response.ok) throw new ApiRequestError(0, 'NETWORK', 'Response body was cut off');
  }

  if (!response.ok) {
    throw isApiError(body)
      ? new ApiRequestError(response.status, body.code, body.message)
      : new ApiRequestError(response.status, 'INTERNAL', `HTTP ${response.status}`);
  }

  return body as T;
}
