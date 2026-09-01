"use client";

import { useState } from "react";

/**
 * Up to 3 photos, uploaded one at a time to POST /api/photos/upload
 * (which runs moderation before the file is ever saved — see
 * src/lib/moderation.ts) and referenced by URL in the parent form's
 * state. Plain <img>, not next/image: these are dynamic, auth-gated
 * routes rather than a fixed domain next/image could optimize.
 */
export function PhotoUploader({
  photos,
  onChange,
  disabled,
  disabledReason,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photos.length >= 3) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not upload this photo.");
        return;
      }
      onChange([...photos, body.url]);
    } catch {
      setError("Could not upload this photo — please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(url: string) {
    onChange(photos.filter((p) => p !== url));
    const id = url.split("/").pop();
    if (id) {
      fetch(`/api/photos/${id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-2">
        {photos.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-black/10 group">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated route, not a next/image-friendly domain */}
            <img src={url} alt={`Profile photo ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-1 bg-black/55">
              <button
                type="button"
                onClick={() => handleMove(i, -1)}
                disabled={i === 0}
                aria-label="Move photo earlier"
                className="text-white text-xs disabled:opacity-30 px-1"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="text-white text-xs hover:text-[var(--maroon)] px-1"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => handleMove(i, 1)}
                disabled={i === photos.length - 1}
                aria-label="Move photo later"
                className="text-white text-xs disabled:opacity-30 px-1"
              >
                ▶
              </button>
            </div>
            {i === 0 && (
              <span className="absolute top-1 left-1 bg-gold text-ink text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                Main
              </span>
            )}
          </div>
        ))}

        {photos.length < 3 && (
          <label
            title={disabled ? disabledReason : undefined}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-center px-2 ${
              disabled || uploading
                ? "opacity-40 cursor-not-allowed border-black/20"
                : "cursor-pointer border-[var(--gold)]/50 hover:border-[var(--gold)]"
            }`}
          >
            <span className="font-sans text-xs">
              {uploading ? "Uploading…" : "+ Add photo"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={disabled || uploading}
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>

      {error && <p className="font-sans text-xs text-[var(--maroon)] mb-1">{error}</p>}
      <p className="font-sans text-xs opacity-60">
        {photos.length}/3 photos — at least 1 required. JPG, PNG, or WebP, up to 5MB each.
      </p>
    </div>
  );
}
