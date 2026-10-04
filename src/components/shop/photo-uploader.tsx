"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ExistingPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
};

export type UploaderLabels = {
  chooseFromPhone: string;
  dropzoneTitle: string;
  dropzoneHint: string;
  retry: string;
  remove: string;
  removing: string;
  counter: string;
  counterOver: string;
  quotaExceeded: string;
  fileTooLarge: string;
  unsupportedFormat: string;
  uploadFailed: string;
  quotaReached: string;
  rejected: string;
};

type Item = {
  id: string;
  name: string;
  previewUrl: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

const MAX_CONCURRENCY = 3;

let sequence = 0;
const nextId = () => `u${Date.now().toString(36)}${(sequence += 1)}`;

/**
 * Envoi des photos.
 *
 * Trois décisions qui viennent du terrain :
 *  1. l'envoi démarre **immédiatement** à la sélection, trois fichiers à la
 *     fois — pas de bouton « Envoyer » final qui ferait perdre la file
 *     d'attente construite en vingt minutes de patience ;
 *  2. la vignette est dessinée côté navigateur avant le premier octet envoyé :
 *     le client voit ses photos apparaître tout de suite, même en 3G ;
 *  3. un échec reste **local à un fichier**, avec « Réessayer ». Perdre toute
 *     une sélection sur une coupure réseau serait impardonnable ici.
 */
export function PhotoUploader({
  mode,
  quota,
  extraPriceLabel,
  maxSizeBytes,
  acceptedFormats,
  existing,
  labels,
  removeAction,
}: {
  mode: "local" | "presigned";
  quota: number;
  extraPriceLabel: string;
  maxSizeBytes: number;
  acceptedFormats: string[];
  existing: ExistingPhoto[];
  labels: UploaderLabels;
  removeAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRefs = useRef(new Map<string, XMLHttpRequest>());
  const filesRef = useRef(new Map<string, File>());

  const sentCount = existing.length + items.filter((i) => i.status === "done").length;
  const over = Math.max(0, sentCount - quota);

  useEffect(() => {
    const registry = xhrRefs.current;
    return () => {
      for (const xhr of registry.values()) xhr.abort();
    };
  }, []);

  const patch = useCallback((id: string, changes: Partial<Item>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  /** Vignette locale immédiate — sans attendre le réseau. */
  const makePreview = useCallback(async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return canvas.toDataURL("image/webp", 0.72);
    } catch {
      return "";
    }
  }, []);

  const uploadOne = useCallback(
    async (item: Item, file: File) => {
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const result =
          mode === "local"
            ? await postLocal(file, item.id, xhrRefs, (progress) =>
                patch(item.id, { progress }),
              )
            : await postPresigned(file);
        patch(item.id, { status: "done", progress: 100 });
        filesRef.current.delete(item.id);
        if (result?.id) void Promise.resolve();
        router.refresh();
      } catch (error) {
        const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
        patch(item.id, {
          status: "error",
          error:
            code === "FILE_TOO_LARGE"
              ? labels.fileTooLarge
              : code === "UNSUPPORTED_FORMAT"
                ? labels.unsupportedFormat
                : code === "QUOTA_REACHED"
                  ? labels.quotaReached
                  : labels.uploadFailed,
        });
      } finally {
        xhrRefs.current.delete(item.id);
      }
    },
    [mode, patch, router, labels],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted: File[] = [];
      let rejected = 0;

      for (const file of files) {
        const typeOk =
          acceptedFormats.length === 0 ||
          acceptedFormats.includes(file.type) ||
          file.type === "";
        if (typeOk && file.size <= maxSizeBytes) accepted.push(file);
        else rejected += 1;
      }

      const queue: Array<{ item: Item; file: File }> = [];
      for (const file of accepted) {
        const item: Item = {
          id: nextId(),
          name: file.name,
          previewUrl: await makePreview(file),
          status: "queued",
          progress: 0,
        };
        filesRef.current.set(item.id, file);
        queue.push({ item, file });
      }

      setItems((current) => [...current, ...queue.map((entry) => entry.item)]);

      if (rejected > 0) {
        setItems((current) => [
          ...current,
          {
            id: nextId(),
            name: labels.rejected.replace("{count}", String(rejected)),
            previewUrl: "",
            status: "error",
            progress: 0,
            error: labels.fileTooLarge,
          },
        ]);
      }

      // File d'attente à concurrence limitée : trois envois parallèles
      // seulement, pour ne pas écraser une connexion mobile.
      const pending = [...queue];
      const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, pending.length) }).map(
        async () => {
          for (;;) {
            const entry = pending.shift();
            if (!entry) return;
            await uploadOne(entry.item, entry.file);
          }
        },
      );
      void Promise.all(workers);
    },
    [acceptedFormats, labels, makePreview, maxSizeBytes, uploadOne],
  );

  const retry = (item: Item) => {
    const file = filesRef.current.get(item.id);
    if (file) void uploadOne(item, file);
    else patch(item.id, { status: "error", error: labels.uploadFailed });
  };

  const removeUploaded = async (assetId: string) => {
    setRemoving(assetId);
    const formData = new FormData();
    formData.set("assetId", assetId);
    await removeAction(formData);
    setRemoving(null);
    router.refresh();
  };

  const removeItem = (item: Item) => {
    xhrRefs.current.get(item.id)?.abort();
    xhrRefs.current.delete(item.id);
    filesRef.current.delete(item.id);
    setItems((current) => current.filter((i) => i.id !== item.id));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        multiple
        capture="environment"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) void addFiles(files);
          event.target.value = "";
        }}
        className="sr-only"
      />

      <Button
        type="button"
        size="lg"
        fullWidth
        onClick={() => inputRef.current?.click()}
        className="sm:hidden"
      >
        {labels.chooseFromPhone}
      </Button>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length) void addFiles(files);
        }}
        className={cn(
          "hidden cursor-pointer rounded-md border border-dashed p-12 text-center transition-editorial sm:block",
          dragging
            ? "border-champagne bg-champagne-soft/40"
            : "border-line-strong bg-cream hover:border-champagne",
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="mx-auto h-7 w-7 text-stone"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <path d="M12 16V5m0 0L8 9m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        <p className="mt-5 font-display text-[1.0625rem] text-ink">{labels.dropzoneTitle}</p>
        <p className="mt-2 text-[0.875rem] text-stone">{labels.dropzoneHint}</p>
      </div>

      {/* Compteur */}
      <div className="mt-8 flex items-center gap-5">
        <p className="text-[0.9375rem] text-graphite">
          {over > 0
            ? interpolate(labels.counterOver, { count: sentCount, over })
            : interpolate(labels.counter, { count: sentCount, quota, s: sentCount > 1 ? "s" : "" })}
        </p>
        <div className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      {over > 0 ? (
        <div className="mt-5 rounded-sm border border-champagne bg-champagne-soft/40 p-4">
          <p className="text-[0.875rem] text-ink">
            {labels.quotaExceeded
              .replace("{quota}", String(quota))
              .replace("{price}", extraPriceLabel)}
          </p>
        </div>
      ) : null}

      {/* Vignettes */}
      <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {existing.map((photo) => (
          <li key={photo.id} className="relative">
            <div className="overflow-hidden rounded-sm bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.filename}
                className="aspect-square h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <button
              type="button"
              onClick={() => void removeUploaded(photo.id)}
              disabled={removing === photo.id}
              aria-label={`${labels.remove} — ${photo.filename}`}
              className="absolute -end-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper text-stone shadow-sm transition-fast hover:border-danger hover:text-danger disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          </li>
        ))}

        {items.map((item) => (
          <li key={item.id} className="relative">
            <div className="relative overflow-hidden rounded-sm bg-sand">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className={cn(
                    "aspect-square h-full w-full object-cover transition-opacity",
                    item.status === "uploading" && "opacity-60",
                    item.status === "error" && "opacity-25",
                  )}
                />
              ) : (
                <div className="aspect-square w-full bg-sand" />
              )}

              {item.status === "uploading" ? (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-paper/50">
                  <div
                    className="h-full bg-champagne transition-[width] duration-200"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              ) : null}

              {item.status === "error" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center">
                  <p className="text-[0.6875rem] leading-tight text-danger">{item.error}</p>
                  <button
                    type="button"
                    onClick={() => retry(item)}
                    className="text-[0.6875rem] text-ink underline underline-offset-2"
                  >
                    {labels.retry}
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => removeItem(item)}
              aria-label={`${labels.remove} — ${item.name}`}
              className="absolute -end-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper text-stone shadow-sm transition-fast hover:border-danger hover:text-danger"
            >
              <CloseIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Remplace les jetons `{clé}` — le pluriel français dépend du compte. */
function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

async function postLocal(
  file: File,
  itemId: string,
  registry: { current: Map<string, XMLHttpRequest> },
  onProgress: (percent: number) => void,
): Promise<{ id: string }> {
  const body = new FormData();
  body.set("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    registry.current.set(itemId, xhr);
    xhr.open("POST", "/api/uploads/local");
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText) as { id?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.id) resolve({ id: data.id });
        else reject(new Error(data.error ?? "UPLOAD_FAILED"));
      } catch {
        reject(new Error("UPLOAD_FAILED"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("UPLOAD_FAILED")));
    xhr.addEventListener("abort", () => reject(new Error("UPLOAD_FAILED")));
    xhr.send(body);
  });
}

async function postPresigned(file: File): Promise<{ id: string }> {
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!presign.ok) throw new Error("UPLOAD_FAILED");
  const info = (await presign.json()) as {
    url: string;
    key: string;
    method: string;
    headers: Record<string, string>;
  };

  const put = await fetch(info.url, { method: info.method, headers: info.headers, body: file });
  if (!put.ok) throw new Error("UPLOAD_FAILED");

  const complete = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: info.key, filename: file.name }),
  });
  if (!complete.ok) throw new Error("UPLOAD_FAILED");
  return (await complete.json()) as { id: string };
}
