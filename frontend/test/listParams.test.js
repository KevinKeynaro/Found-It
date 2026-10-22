import test from "node:test";
import assert from "node:assert/strict";
import { parseListParams, buildListUrl } from "../src/lib/listParams.js";

test("parseListParams handles defaults and invalid input", () => {
  // Empty / null inputs
  assert.deepEqual(parseListParams(null, "teacher"), {
    q: "",
    view: "active",
    page: 1,
  });

  assert.deepEqual(parseListParams("", "teacher"), {
    q: "",
    view: "active",
    page: 1,
  });

  // Invalid page numbers fallback to 1
  assert.equal(parseListParams({ page: "0" }, "teacher").page, 1);
  assert.equal(parseListParams({ page: "-10" }, "teacher").page, 1);
  assert.equal(parseListParams({ page: "abc" }, "teacher").page, 1);
  assert.equal(parseListParams({ page: 3.5 }, "teacher").page, 3);

  // Invalid view falls back to 'active'
  assert.equal(parseListParams({ view: "invalid_view" }, "teacher").view, "active");
  assert.equal(parseListParams({ view: "OVERDUE" }, "teacher").view, "overdue");
});

test("parseListParams enforces role restrictions on students", () => {
  // Student attempting to view overdue
  const studentOverdue = parseListParams({ view: "overdue" }, "student");
  assert.equal(studentOverdue.view, "active");

  // Student attempting to view archive
  const studentArchive = parseListParams({ view: "archive" }, "student");
  assert.equal(studentArchive.view, "active");

  // Teacher allowed to view overdue and archive
  assert.equal(parseListParams({ view: "overdue" }, "teacher").view, "overdue");
  assert.equal(parseListParams({ view: "archive" }, "teacher").view, "archive");

  // Admin allowed to view overdue and archive
  assert.equal(parseListParams({ view: "overdue" }, "admin").view, "overdue");
  assert.equal(parseListParams({ view: "archive" }, "admin").view, "archive");
});

test("parseListParams sanitizes query string q", () => {
  // Whitespace trimmed
  const trimmed = parseListParams({ q: "   blue backpack   " }, "teacher");
  assert.equal(trimmed.q, "blue backpack");

  // Length capped at 100 characters
  const longStr = "a".repeat(150);
  const truncated = parseListParams({ q: longStr }, "teacher");
  assert.equal(truncated.q.length, 100);
});

test("buildListUrl omits defaults and formats URL correctly", () => {
  // All defaults -> /items
  assert.equal(buildListUrl({ q: "", view: "active", page: 1 }), "/items");
  assert.equal(buildListUrl({}), "/items");

  // Query only
  assert.equal(buildListUrl({ q: "calculator" }), "/items?q=calculator");

  // View only
  assert.equal(buildListUrl({ view: "overdue" }), "/items?view=overdue");

  // Page only
  assert.equal(buildListUrl({ page: 2 }), "/items?page=2");

  // Combined non-defaults
  const url = buildListUrl({ q: "bottle", view: "archive", page: 3 });
  assert.equal(url, "/items?q=bottle&view=archive&page=3");
});
