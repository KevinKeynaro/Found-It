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

export async function createItem(formData, { signal } = {}) {
  return api("/api/items", {
    method: "POST",
    body: formData,
    signal,
  });
}

export async function updateItem(id, formData, { signal } = {}) {
  const endpoint = `/api/items/${encodeURIComponent(id)}`;
  return api(endpoint, {
    method: "PATCH",
    body: formData,
    signal,
  });
}

export async function returnItem(id, { returned_to } = {}, { signal } = {}) {
  const endpoint = `/api/items/${encodeURIComponent(id)}/return`;
  return api(endpoint, {
    method: "POST",
    body: { returned_to: returned_to || null },
    signal,
  });
}

export async function reopenItem(id, { signal } = {}) {
  const endpoint = `/api/items/${encodeURIComponent(id)}/reopen`;
  return api(endpoint, {
    method: "POST",
    signal,
  });
}

export async function deleteItem(id, { signal } = {}) {
  const endpoint = `/api/items/${encodeURIComponent(id)}`;
  return api(endpoint, {
    method: "DELETE",
    signal,
  });
}
