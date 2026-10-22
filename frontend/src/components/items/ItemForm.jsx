"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PhotoField } from "./PhotoField";
import {
  validateItemForm,
  validatePhotoFile,
  buildUpdateFormData,
} from "@/lib/itemValidation";
import { todayInTimezone } from "@/lib/format";
import { MESSAGES } from "@/lib/messages";

export function ItemForm({
  mode = "create",
  initialValues = null,
  onSubmit,
  isSubmitting = false,
  serverError = null,
  serverFieldErrors = {},
}) {
  const isEdit = mode === "edit";
  const today = todayInTimezone();

  const [values, setValues] = useState({
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    location_found: initialValues?.location_found ?? "",
    date_found: initialValues?.date_found ?? today,
  });

  const [newPhoto, setNewPhoto] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [clientErrors, setClientErrors] = useState({});

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhotoChange = (file) => {
    setNewPhoto(file);
    setPhotoError(null);
    if (clientErrors.photo) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    }
  };

  // Determine change state for edit mode
  const { hasChanges } = isEdit
    ? buildUpdateFormData(initialValues || {}, values, newPhoto)
    : { hasChanges: true };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate form fields
    const formValidation = validateItemForm(values, { today });
    const errors = { ...formValidation.errors };

    // Validate photo
    if (!isEdit) {
      const photoValidation = validatePhotoFile(newPhoto);
      if (!photoValidation.isValid) {
        errors.photo = photoValidation.error;
      }
    } else if (newPhoto) {
      const photoValidation = validatePhotoFile(newPhoto);
      if (!photoValidation.isValid) {
        errors.photo = photoValidation.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      if (errors.photo) {
        setPhotoError(errors.photo);
      }
      return;
    }

    setClientErrors({});
    setPhotoError(null);

    if (isEdit) {
      if (!hasChanges) return;
      const updateData = buildUpdateFormData(initialValues || {}, values, newPhoto);
      await onSubmit(updateData.formData);
    } else {
      const formData = new FormData();
      formData.append("title", values.title.trim());
      if (values.description && values.description.trim()) {
        formData.append("description", values.description.trim());
      }
      formData.append("location_found", values.location_found.trim());
      formData.append("date_found", values.date_found.trim());
      if (newPhoto) {
        formData.append("photo", newPhoto);
      }
      await onSubmit(formData);
    }
  };

  const getFieldError = (field) => {
    return clientErrors[field] || serverFieldErrors[field] || null;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && (
        <Alert variant="error" className="py-3">
          {serverError}
        </Alert>
      )}

      {/* Photo Field */}
      <PhotoField
        currentPhotoUrl={isEdit ? initialValues?.image_url : null}
        onChange={handlePhotoChange}
        error={photoError || getFieldError("photo")}
        required={!isEdit}
      />

      {/* Title Field */}
      <Input
        id="item-title"
        label={MESSAGES.items.form.titleLabel}
        placeholder={MESSAGES.items.form.titlePlaceholder}
        value={values.title}
        onChange={(e) => updateField("title", e.target.value)}
        error={getFieldError("title")}
        maxLength={150}
        required
        disabled={isSubmitting}
      />

      {/* Description Field */}
      <Textarea
        id="item-description"
        label={MESSAGES.items.form.descLabel}
        placeholder={MESSAGES.items.form.descPlaceholder}
        value={values.description}
        onChange={(e) => updateField("description", e.target.value)}
        error={getFieldError("description")}
        rows={4}
        maxLength={2000}
        disabled={isSubmitting}
      />

      {/* Location Found Field */}
      <Input
        id="item-location"
        label={MESSAGES.items.form.locationLabel}
        placeholder={MESSAGES.items.form.locationPlaceholder}
        value={values.location_found}
        onChange={(e) => updateField("location_found", e.target.value)}
        error={getFieldError("location_found")}
        maxLength={150}
        required
        disabled={isSubmitting}
      />

      {/* Date Found Field */}
      <Input
        id="item-date"
        type="date"
        label={MESSAGES.items.form.dateLabel}
        value={values.date_found}
        onChange={(e) => updateField("date_found", e.target.value)}
        error={getFieldError("date_found")}
        max={today}
        required
        disabled={isSubmitting}
      />

      {/* Submit / Action Buttons */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isEdit && !hasChanges && !isSubmitting && (
          <p className="text-xs text-slate-500 order-2 sm:order-1">
            {MESSAGES.items.form.noChangesHint}
          </p>
        )}

        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto order-1 sm:order-2">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || (isEdit && !hasChanges)}
            className="w-full sm:w-auto min-h-[44px] px-6"
          >
            {isEdit
              ? isSubmitting
                ? MESSAGES.items.savingChanges
                : MESSAGES.items.saveChanges
              : isSubmitting
                ? MESSAGES.items.postingItem
                : MESSAGES.items.postItem}
          </Button>
        </div>
      </div>
    </form>
  );
}
