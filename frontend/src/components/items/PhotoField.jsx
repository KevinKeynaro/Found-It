"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, Camera, RefreshCw, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { validatePhotoFile } from "@/lib/itemValidation";
import { MESSAGES } from "@/lib/messages";

export function PhotoField({
  currentPhotoUrl = null,
  onChange,
  error = null,
  required = false,
  className = "",
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    const validation = validatePhotoFile(file);
    if (!validation.isValid) {
      setLocalError(validation.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setLocalError(null);

    // Clean up previous preview URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const newUrl = URL.createObjectURL(file);
    previewUrlRef.current = newUrl;
    setPreviewUrl(newUrl);
    setSelectedFile(file);
    onChange(file);
  };

  const handleClearSelected = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange(null);
  };

  const displayedError = error || localError;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
        {MESSAGES.items.form.photoLabel}
        {required && !currentPhotoUrl && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Hidden file input without capture attribute so devices offer camera and library */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        id="item-photo-input"
        aria-invalid={Boolean(displayedError)}
      />

      {/* Photo Preview / Upload Area */}
      {previewUrl ? (
        // Preview of newly selected photo
        <div className="relative aspect-[4/3] w-full max-w-md bg-slate-100 rounded-xl overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center">
          <Image
            src={previewUrl}
            alt="Selected photo preview"
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-contain p-2"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 bg-white/90 backdrop-blur-xs text-xs py-1 px-2.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{MESSAGES.items.form.changePhoto}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClearSelected}
              className="bg-white/90 backdrop-blur-xs text-danger border-red-200 hover:bg-red-50 text-xs py-1 px-2.5 shadow-sm"
              aria-label="Remove photo"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : currentPhotoUrl ? (
        // Existing photo in edit mode
        <div className="space-y-3">
          <div className="relative aspect-[4/3] w-full max-w-md bg-slate-100 rounded-xl overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center">
            <Image
              src={currentPhotoUrl}
              alt="Current item photo"
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-contain p-2"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 min-h-[44px]"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span>{MESSAGES.items.form.replacePhoto}</span>
          </Button>
        </div>
      ) : (
        // Empty upload dropzone button
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`group flex flex-col items-center justify-center w-full aspect-[4/3] max-w-md p-6 border-2 border-dashed rounded-xl transition-colors min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            displayedError
              ? "border-red-300 bg-red-50/50 hover:bg-red-50"
              : "border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-slate-500 shadow-sm mb-3 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-800 mb-1">
            Click to upload photo
          </span>
          <span className="text-xs text-slate-500">
            {MESSAGES.items.form.photoHelper}
          </span>
        </button>
      )}

      {displayedError && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-danger pt-1" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{displayedError}</span>
        </div>
      )}
    </div>
  );
}
