import { ERROR_MESSAGES, getErrorMessage } from "./messages.js";

const DEFAULT_API_URL = "http://localhost:5000";

export class ApiError extends Error {
  constructor({ status, code, message, details = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  const method = (options.method || "GET").toUpperCase();
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = new Headers(options.headers || {});

  if (isWrite && !headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  let body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;

  if (body && typeof body === "object" && !isFormData && !isBlob) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      body,
      credentials: options.credentials || "include",
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: ERROR_MESSAGES.NETWORK_ERROR,
      details: null,
    });
  }

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const rawError = payload?.error || {};
    const code = rawError.code || (response.status === 401 ? "UNAUTHENTICATED" : "UNKNOWN_ERROR");
    const userMessage = getErrorMessage(code, ERROR_MESSAGES.DEFAULT);

    throw new ApiError({
      status: response.status,
      code,
      message: userMessage,
      details: rawError.details || null,
    });
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
