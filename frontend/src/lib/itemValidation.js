import { todayInTimezone } from "./format.js";
import { MESSAGES } from "./messages.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validates item form values according to backend rules.
 *
 * @param {Object} values - { title, description, location_found, date_found }
 * @param {Object} [options] - { today }
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateItemForm(values = {}, { today = todayInTimezone() } = {}) {
  const errors = {};

  // Title: 1 - 150 chars trimmed
  const rawTitle = values.title !== undefined && values.title !== null ? String(values.title) : "";
  const title = rawTitle.trim();
  if (!title) {
    errors.title = MESSAGES.items.validation.titleRequired;
  } else if (title.length > 150) {
    errors.title = MESSAGES.items.validation.titleTooLong;
  }

  // Description: optional, max 2000 chars trimmed
  if (values.description !== undefined && values.description !== null) {
    const desc = String(values.description).trim();
    if (desc.length > 2000) {
      errors.description = MESSAGES.items.validation.descTooLong;
    }
  }

  // Location found: 1 - 150 chars trimmed
  const rawLoc = values.location_found !== undefined && values.location_found !== null ? String(values.location_found) : "";
  const location = rawLoc.trim();
  if (!location) {
    errors.location_found = MESSAGES.items.validation.locationRequired;
  } else if (location.length > 150) {
    errors.location_found = MESSAGES.items.validation.locationTooLong;
  }

  // Date found: YYYY-MM-DD valid calendar date, not in future
  const rawDate = values.date_found !== undefined && values.date_found !== null ? String(values.date_found).trim() : "";
  if (!rawDate) {
    errors.date_found = MESSAGES.items.validation.dateRequired;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    errors.date_found = MESSAGES.items.validation.dateInvalid;
  } else {
    const [year, month, day] = rawDate.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      errors.date_found = MESSAGES.items.validation.dateInvalid;
    } else if (rawDate > today) {
      errors.date_found = MESSAGES.items.validation.dateFuture;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates photo file (JPEG, PNG or WebP, max 5 MB).
 *
 * @param {File|Blob|null|undefined} file
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validatePhotoFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: MESSAGES.items.validation.photoRequired,
    };
  }

  // Check file type
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const hasValidMime = ALLOWED_PHOTO_TYPES.includes(type);
  const hasValidExt = /\.(jpe?g|png|webp)$/i.test(name);

  if (!hasValidMime && !hasValidExt) {
    return {
      isValid: false,
      error: MESSAGES.items.validation.photoInvalidType,
    };
  }

  // Check file size (max 5 MB = 5,242,880 bytes)
  if (typeof file.size === "number" && file.size > MAX_PHOTO_BYTES) {
    return {
      isValid: false,
      error: MESSAGES.items.validation.photoTooLarge,
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Builds FormData for updating an item, containing only changed fields and/or photo.
 *
 * @param {Object} original - Original item values
 * @param {Object} values - Current form values
 * @param {File|Blob|null} [newPhoto] - New photo if replaced
 * @returns {{ formData: FormData, hasChanges: boolean, changedFields: string[] }}
 */
export function buildUpdateFormData(original = {}, values = {}, newPhoto = null) {
  const formData = new FormData();
  const changedFields = [];

  // Title
  const origTitle = (original.title ?? "").trim();
  const newTitle = (values.title ?? "").trim();
  if (newTitle !== origTitle) {
    formData.append("title", newTitle);
    changedFields.push("title");
  }

  // Description (normalize null / undefined to empty string)
  const origDesc = (original.description ?? "").trim();
  const newDesc = (values.description ?? "").trim();
  if (newDesc !== origDesc) {
    formData.append("description", newDesc);
    changedFields.push("description");
  }

  // Location found
  const origLoc = (original.location_found ?? "").trim();
  const newLoc = (values.location_found ?? "").trim();
  if (newLoc !== origLoc) {
    formData.append("location_found", newLoc);
    changedFields.push("location_found");
  }

  // Date found
  const origDate = (original.date_found ?? "").trim();
  const newDate = (values.date_found ?? "").trim();
  if (newDate !== origDate) {
    formData.append("date_found", newDate);
    changedFields.push("date_found");
  }

  // New photo
  if (newPhoto) {
    formData.append("photo", newPhoto);
    changedFields.push("photo");
  }

  return {
    formData,
    hasChanges: changedFields.length > 0,
    changedFields,
  };
}
