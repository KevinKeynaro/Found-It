import test from "node:test";
import assert from "node:assert/strict";
import {
  validateItemForm,
  validatePhotoFile,
  buildUpdateFormData,
  MAX_PHOTO_BYTES,
} from "../src/lib/itemValidation.js";

test("validateItemForm accepts valid input on boundaries", () => {
  const today = "2026-10-22";

  // Exact boundaries: 1 char title, 1 char location, today's date, no description
  const minValid = validateItemForm(
    {
      title: "A",
      description: null,
      location_found: "B",
      date_found: today,
    },
    { today }
  );
  assert.equal(minValid.isValid, true);
  assert.deepEqual(minValid.errors, {});

  // Max boundaries: 150 char title, 2000 char desc, 150 char location
  const maxValid = validateItemForm(
    {
      title: "x".repeat(150),
      description: "d".repeat(2000),
      location_found: "y".repeat(150),
      date_found: "2026-01-01",
    },
    { today }
  );
  assert.equal(maxValid.isValid, true);
  assert.deepEqual(maxValid.errors, {});
});

test("validateItemForm rejects empty and oversized titles", () => {
  const today = "2026-10-22";

  // Missing title
  assert.equal(
    validateItemForm({ location_found: "Lab", date_found: today }, { today }).isValid,
    false
  );

  // Empty string title
  assert.equal(
    validateItemForm({ title: "", location_found: "Lab", date_found: today }, { today }).isValid,
    false
  );

  // Whitespace-only title
  assert.equal(
    validateItemForm({ title: "   ", location_found: "Lab", date_found: today }, { today }).isValid,
    false
  );

  // 151 chars title (boundary exceeding 150)
  const res151 = validateItemForm(
    { title: "a".repeat(151), location_found: "Lab", date_found: today },
    { today }
  );
  assert.equal(res151.isValid, false);
  assert.match(res151.errors.title, /150 characters/);
});

test("validateItemForm rejects oversized descriptions", () => {
  const today = "2026-10-22";

  // 2000 chars description is valid
  const res2000 = validateItemForm(
    { title: "Item", description: "a".repeat(2000), location_found: "Lab", date_found: today },
    { today }
  );
  assert.equal(res2000.isValid, true);

  // 2001 chars description is invalid
  const res2001 = validateItemForm(
    { title: "Item", description: "a".repeat(2001), location_found: "Lab", date_found: today },
    { today }
  );
  assert.equal(res2001.isValid, false);
  assert.match(res2001.errors.description, /2000 characters/);
});

test("validateItemForm rejects empty and oversized location_found", () => {
  const today = "2026-10-22";

  // Empty location
  const emptyLoc = validateItemForm(
    { title: "Item", location_found: "  ", date_found: today },
    { today }
  );
  assert.equal(emptyLoc.isValid, false);
  assert.match(emptyLoc.errors.location_found, /Location found cannot be empty/);

  // 151 chars location (boundary exceeding 150)
  const loc151 = validateItemForm(
    { title: "Item", location_found: "L".repeat(151), date_found: today },
    { today }
  );
  assert.equal(loc151.isValid, false);
  assert.match(loc151.errors.location_found, /150 characters/);
});

test("validateItemForm rejects invalid, malformed, and future dates", () => {
  const today = "2026-10-22";

  // Missing date
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab" }, { today }).isValid,
    false
  );

  // Malformed date formats
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "22-10-2026" }, { today }).isValid,
    false
  );
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "invalid" }, { today }).isValid,
    false
  );

  // Impossible calendar dates
  // 2026 is not a leap year -> Feb 29 is invalid
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "2026-02-29" }, { today }).isValid,
    false
  );
  // April has 30 days -> April 31 is invalid
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "2026-04-31" }, { today }).isValid,
    false
  );

  // Boundary: today is valid
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: today }, { today }).isValid,
    true
  );

  // Boundary: tomorrow is invalid
  assert.equal(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "2026-10-23" }, { today }).isValid,
    false
  );
  assert.match(
    validateItemForm({ title: "Item", location_found: "Lab", date_found: "2026-10-23" }, { today }).errors.date_found,
    /cannot be in the future/
  );
});

test("validatePhotoFile validates presence, types, and size boundaries", () => {
  // Null or undefined
  assert.equal(validatePhotoFile(null).isValid, false);
  assert.equal(validatePhotoFile(undefined).isValid, false);

  // Valid MIME types
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: 1000 }).isValid, true);
  assert.equal(validatePhotoFile({ type: "image/png", size: 1000 }).isValid, true);
  assert.equal(validatePhotoFile({ type: "image/webp", size: 1000 }).isValid, true);

  // Valid by extension when MIME is generic
  assert.equal(validatePhotoFile({ name: "photo.jpg", size: 1000 }).isValid, true);
  assert.equal(validatePhotoFile({ name: "photo.PNG", size: 1000 }).isValid, true);
  assert.equal(validatePhotoFile({ name: "photo.webp", size: 1000 }).isValid, true);

  // Invalid MIME / extension
  assert.equal(validatePhotoFile({ type: "image/gif", size: 1000 }).isValid, false);
  assert.equal(validatePhotoFile({ type: "application/pdf", size: 1000 }).isValid, false);
  assert.equal(validatePhotoFile({ name: "document.pdf", size: 1000 }).isValid, false);

  // Size boundaries: exactly 5 MB (5,242,880 bytes) is valid
  assert.equal(
    validatePhotoFile({ type: "image/jpeg", size: MAX_PHOTO_BYTES }).isValid,
    true
  );

  // Size boundary: 5 MB + 1 byte (5,242,881 bytes) is invalid
  const overSize = validatePhotoFile({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 });
  assert.equal(overSize.isValid, false);
  assert.match(overSize.error, /5 MB/);
});

test("buildUpdateFormData detects changed fields and reports when unchanged", () => {
  const original = {
    title: "Hydro Flask",
    description: "Blue bottle",
    location_found: "Gym",
    date_found: "2026-10-20",
  };

  // No changes
  const noChanges = buildUpdateFormData(original, {
    title: "Hydro Flask",
    description: "Blue bottle",
    location_found: "Gym",
    date_found: "2026-10-20",
  });
  assert.equal(noChanges.hasChanges, false);
  assert.deepEqual(noChanges.changedFields, []);
  assert.equal(noChanges.formData.has("title"), false);

  // Whitespace-normalized: "Hydro Flask " vs "Hydro Flask" -> no change
  const whitespaceSame = buildUpdateFormData(original, {
    ...original,
    title: "  Hydro Flask  ",
  });
  assert.equal(whitespaceSame.hasChanges, false);

  // Only title changed
  const titleChanged = buildUpdateFormData(original, {
    ...original,
    title: "Red Hydro Flask",
  });
  assert.equal(titleChanged.hasChanges, true);
  assert.deepEqual(titleChanged.changedFields, ["title"]);
  assert.equal(titleChanged.formData.get("title"), "Red Hydro Flask");
  assert.equal(titleChanged.formData.has("location_found"), false);

  // Photo added without field changes
  const dummyFile = new Blob(["test"], { type: "image/jpeg" });
  const photoOnly = buildUpdateFormData(original, original, dummyFile);
  assert.equal(photoOnly.hasChanges, true);
  assert.deepEqual(photoOnly.changedFields, ["photo"]);
  assert.ok(photoOnly.formData.has("photo"));

  // Description changed from null to text
  const descFromNull = buildUpdateFormData(
    { ...original, description: null },
    { ...original, description: "New details" }
  );
  assert.equal(descFromNull.hasChanges, true);
  assert.deepEqual(descFromNull.changedFields, ["description"]);
  assert.equal(descFromNull.formData.get("description"), "New details");
});
