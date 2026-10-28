// Single entry point for backend calls. The backend wraps successful responses as
// { statusCode, message, data } and errors as { message, errors?, success: false }.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export type FieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  // null when the request never got an HTTP response (offline, server down).
  readonly status: number | null;
  readonly fieldErrors: FieldError[];

  constructor(message: string, status: number | null, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError() {
    return this.status === null;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  // Clerk session token for employee routes.
  token?: string | null;
};

type ErrorBody = {
  message?: unknown;
  errors?: unknown;
};

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "Please check the details and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "This was changed by someone else. Refresh and try again.",
  429: "Too many requests. Please wait a moment and try again.",
};

function errorMessage(status: number, body: ErrorBody | null) {
  // Server errors carry no useful detail for the user.
  if (status >= 500) {
    return status === 503 && typeof body?.message === "string"
      ? body.message
      : "Something went wrong on our side. Please try again.";
  }

  if (typeof body?.message === "string" && body.message.trim() !== "") {
    return body.message;
  }

  return FALLBACK_MESSAGES[status] ?? "The request could not be completed.";
}

function fieldErrors(body: ErrorBody | null): FieldError[] {
  if (!Array.isArray(body?.errors)) {
    return [];
  }

  return body.errors.filter(
    (item): item is FieldError =>
      typeof item?.field === "string" && typeof item?.message === "string",
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    // Cancelled by the caller (e.g. the component unmounted): not a failure to report.
    if (options.signal?.aborted) {
      throw error;
    }

    throw new ApiError("Could not reach the server. Check your connection and try again.", null);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = payload as ErrorBody | null;
    throw new ApiError(errorMessage(response.status, body), response.status, fieldErrors(body));
  }

  return (payload as { data: T }).data;
}

export type DownloadedFile = {
  blob: Blob;
  fileName: string | null;
};

// For endpoints that return a file (PDFs). Errors are JSON and handled like apiRequest.
export async function apiFileRequest(path: string, options: RequestOptions = {}): Promise<DownloadedFile> {
  const headers = new Headers({ Accept: "application/pdf, application/json" });

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: options.method ?? "GET", headers, signal: options.signal });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }

    throw new ApiError("Could not reach the server. Check your connection and try again.", null);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(errorMessage(response.status, body), response.status, fieldErrors(body));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null;
  return { blob: await response.blob(), fileName };
}
