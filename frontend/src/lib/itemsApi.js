import { api } from "./api";

export async function listItems({ q, view, page, limit } = {}, { signal } = {}) {
  const params = new URLSearchParams();

  if (q && q.trim()) {
    params.set("q", q.trim());
  }

  if (view && view !== "active") {
    params.set("view", view);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const endpoint = query ? `/api/items?${query}` : "/api/items";

  return api(endpoint, {
    method: "GET",
    signal,
  });
}

export async function getItem(id, { signal } = {}) {
  const endpoint = `/api/items/${encodeURIComponent(id)}`;
  return api(endpoint, {
    method: "GET",
    signal,
  });
}
