const DEFAULT_TIMEZONE = "Asia/Jakarta";

export function getAppTimezone() {
  return process.env.NEXT_PUBLIC_APP_TIMEZONE || DEFAULT_TIMEZONE;
}

export function todayInTimezone(tz = getAppTimezone()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatDate(dateInput, options = {}) {
  if (!dateInput) return "";

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: getAppTimezone(),
      month: "short",
      day: "numeric",
      year: "numeric",
      ...options,
    }).format(d);
  } catch {
    return d.toLocaleDateString("en-US");
  }
}

export function daysSince(dateInput) {
  if (!dateInput) return 0;

  try {
    const todayStr = todayInTimezone();
    let foundStr;

    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      foundStr = dateInput.slice(0, 10);
    } else {
      const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (Number.isNaN(d.getTime())) return 0;
      foundStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: getAppTimezone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    }

    const todayDate = new Date(`${todayStr}T00:00:00Z`);
    const foundDate = new Date(`${foundStr}T00:00:00Z`);
    const diffDays = Math.floor((todayDate.getTime() - foundDate.getTime()) / 86400000);

    return Math.max(0, Number.isNaN(diffDays) ? 0 : diffDays);
  } catch {
    return 0;
  }
}

export function daysOverdue(dateFound, overdueThresholdDays = 30) {
  const elapsed = daysSince(dateFound);
  return Math.max(0, elapsed - overdueThresholdDays);
}

export function formatDaysAgo(days) {
  return `Found ${days} ${days === 1 ? "day" : "days"} ago`;
}

export function formatOverdueLabel(days) {
  return `Overdue ${days} ${days === 1 ? "day" : "days"}`;
}
