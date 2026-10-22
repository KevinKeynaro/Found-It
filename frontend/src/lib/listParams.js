const VALID_VIEWS = ["active", "overdue", "archive"];

export function parseListParams(searchParams, role) {
  const getParam = (key) => {
    if (!searchParams) return null;
    if (typeof searchParams.get === "function") {
      return searchParams.get(key);
    }
    if (typeof searchParams === "object") {
      return searchParams[key] ?? null;
    }
    if (typeof searchParams === "string") {
      const sp = new URLSearchParams(searchParams);
      return sp.get(key);
    }
    return null;
  };

  const rawQ = getParam("q");
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";

  let view = "active";
  if (role !== "student") {
    const rawView = (getParam("view") || "").toLowerCase().trim();
    if (VALID_VIEWS.includes(rawView)) {
      view = rawView;
    }
  }

  const rawPage = parseInt(getParam("page"), 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  return { q, view, page };
}

export function buildListUrl(params = {}, basePath = "/items") {
  const search = new URLSearchParams();

  if (params.q && typeof params.q === "string" && params.q.trim()) {
    search.set("q", params.q.trim().slice(0, 100));
  }

  if (params.view && params.view !== "active" && VALID_VIEWS.includes(params.view)) {
    search.set("view", params.view);
  }

  if (params.page && Number(params.page) > 1) {
    search.set("page", String(params.page));
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
