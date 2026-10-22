import test from "node:test";
import assert from "node:assert/strict";
import { daysSince, todayInTimezone } from "../src/lib/format.js";

test("daysSince computes day difference accurately and never returns negative", () => {
  const today = todayInTimezone();
  const [year, month, day] = today.split("-").map(Number);

  // Today -> 0 days
  assert.equal(daysSince(today), 0);

  // Yesterday -> 1 day
  const yesterdayDate = new Date(Date.UTC(year, month - 1, day - 1));
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  assert.equal(daysSince(yesterdayStr), 1);

  // 10 days ago -> 10 days
  const tenDaysAgoDate = new Date(Date.UTC(year, month - 1, day - 10));
  const tenDaysAgoStr = tenDaysAgoDate.toISOString().slice(0, 10);
  assert.equal(daysSince(tenDaysAgoStr), 10);

  // Future date (tomorrow) -> 0 (never negative)
  const tomorrowDate = new Date(Date.UTC(year, month - 1, day + 1));
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
  assert.equal(daysSince(tomorrowStr), 0);

  // Invalid / null / empty inputs -> 0
  assert.equal(daysSince(null), 0);
  assert.equal(daysSince(undefined), 0);
  assert.equal(daysSince(""), 0);
  assert.equal(daysSince("invalid-date"), 0);
});
