import { ApiError } from "@/lib/types/api";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorEnvelope = data as ApiError;
    const code = errorEnvelope?.error?.code || "request_failed";
    const message = errorEnvelope?.error?.message || response.statusText || "An error occurred";
    const details = errorEnvelope?.error?.details;

    if (response.status === 401 && code === "token_expired" && typeof window !== "undefined") {
      window.location.href = "/login?reason=expired";
    }

    throw new ApiClientError(response.status, code, message, details);
  }

  return data as T;
}

