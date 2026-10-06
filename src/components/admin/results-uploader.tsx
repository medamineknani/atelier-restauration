"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { name: string; state: "pending" | "done" | "error"; message?: string };

/**
 * Dépôt par lot des photographies restaurées.
 *
 * Trois envois en parallèle, reprise individuelle en cas d'échec, et rien à
 * valider à la fin : chaque fichier est enregistré dès qu'il arrive. Un
 * opérateur qui dépose cent photos ne doit pas surveiller une barre de
 * progression.
 */
export function ResultsUploader({
  orderId,
  labels,
}: {
  orderId: string;
  labels: {
    dropzone: string;
    hint: string;
    failed: string;
    progress: string;
    retry: string;
  };
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const send = async (files: File[]) => {
    const queue = files.map((file) => ({ file, name: file.name }));
    setItems(queue.map((entry) => ({ name: entry.name, state: "pending" as const })));

    const update = (name: string, patch: Partial<Item>) =>
      setItems((current) =>
        current.map((item) => (item.name === name ? { ...item, ...patch } : item)),
      );

    const worker = async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        const body = new FormData();
        body.append("file", next.file);

        try {
          const response = await fetch(`/api/admin/commandes/${orderId}/resultats`, {
            method: "POST",
            body,
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            update(next.name, {
              state: "error",
              message: payload?.message ?? labels.failed.replace("{name}", next.name),
            });
            continue;
          }
          update(next.name, { state: "done" });
        } catch {
          update(next.name, { state: "error", message: labels.failed.replace("{name}", next.name) });
        }
      }
    };

    await Promise.all([worker(), worker(), worker()]);
    router.refresh();
  };

  const onFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    void send(Array.from(fileList));
  };

  const done = items.filter((item) => item.state === "done").length;
  const failed = items.filter((item) => item.state === "error");

  return (
    <div className="grid gap-4">
      {/* Un vrai bouton, pas un `div` cliquable : le clavier et les lecteurs
          d'écran l'atteignent alors sans Javascript supplémentaire. */}
      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`w-full cursor-pointer rounded-md border-2 border-dashed px-6 py-10 text-center transition-fast ${
          dragging ? "border-champagne bg-cream" : "border-line bg-paper hover:border-line-strong"
        }`}
      >
        <span className="block text-[0.9375rem] text-ink">{labels.dropzone}</span>
        <span className="mt-2 block text-[0.8125rem] text-muted">{labels.hint}</span>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/tiff"
          className="hidden"
          tabIndex={-1}
          onChange={(event) => onFiles(event.target.files)}
        />
      </button>

      {items.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-[0.8125rem] text-stone">
            {labels.progress.replace("{done}", String(done)).replace("{total}", String(items.length))}
          </p>

          <ul className="grid gap-1">
            {items.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-[3px] px-3 py-1.5 text-[0.8125rem]"
              >
                <span className="truncate text-graphite">{item.name}</span>
                <span className="shrink-0">
                  {item.state === "pending" ? (
                    <span className="text-muted">…</span>
                  ) : item.state === "done" ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <span className="text-danger">{item.message ?? "✗"}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {failed.length > 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-fit text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink"
            >
              {labels.retry}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
