// Centralized error normalization and UI mapping for HTTP and network errors

export type UiErrorAction =
  | { kind: "promptRelogin" }
  | { kind: "link"; to: string; label: string }
  | { kind: "cooldown"; retryAfterMs?: number }
  | { kind: "transient"; message: string }
  | { kind: "inlineMessage"; messageId: string; message: string; canRetry: boolean };

export interface NormalizedError {
  httpStatus?: number;
  code?: string;
  message: string;
  retryAfterMs?: number;
  requestId?: string;
  cause?: unknown;
}

// Try to parse common axios/fetch error shapes
export function normalizeError(e: unknown): NormalizedError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;
  const axiosResp = err?.response;
  const status: number | undefined = axiosResp?.status ?? err?.status;
  const headers = axiosResp?.headers ?? err?.headers ?? {};
  const data = axiosResp?.data ?? err?.data;
  const message: string = data?.message || data?.error || err?.message || "Unexpected error occurred";
  const retryAfter = headers?.["retry-after"] || headers?.["Retry-After"];
  let retryAfterMs: number | undefined;
  if (retryAfter) {
    const n = Number(retryAfter);
    retryAfterMs = Number.isFinite(n) ? n * 1000 : undefined;
  }
  const requestId: string | undefined = headers?.["x-request-id"] || headers?.["X-Request-Id"] || data?.request_id;

  // Heuristic: some backends surface rate-limit as message only
  let effectiveStatus = status;
  const lowerMsg = String(message || "").toLowerCase();
  if (!effectiveStatus) {
    if (
      lowerMsg.includes("too many requests") ||
      lowerMsg.includes("too much requests") ||
      lowerMsg.includes("rate limit")
    ) {
      effectiveStatus = 429;
    }
  }

  return {
    httpStatus: effectiveStatus,
    code: data?.code || err?.code,
    message,
    retryAfterMs,
    requestId,
    cause: e,
  };
}

export function mapErrorToUi(e: NormalizedError): UiErrorAction {
  const status = e.httpStatus;
  switch (status) {
    case 401:
    case 403:
      return { kind: "promptRelogin" };
    case 404:
      return { kind: "link", to: "/whywhy/not-found", label: "Thread not found" };
    case 429:
      return { kind: "cooldown", retryAfterMs: e.retryAfterMs };
    case 0:
    case undefined:
      return { kind: "transient", message: e.message || "Network error" };
    default:
      if (status && status >= 500) {
        return { kind: "transient", message: e.message || "Server error" };
      }
      return { kind: "transient", message: e.message || "Request failed" };
  }
}
