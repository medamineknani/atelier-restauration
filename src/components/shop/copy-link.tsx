"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lien de suivi copiable.
 *
 * Le suivi se fait par lien, sans compte : le client vient d'Instagram ou de
 * Facebook, il ne créera pas un mot de passe pour une commande unique. Il faut
 * donc que ce lien soit facile à mettre de côté.
 */
export function CopyLink({
  url,
  label,
  copiedLabel,
}: {
  url: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Anciens navigateurs : on sélectionne le texte à la place.
      const field = document.createElement("textarea");
      field.value = url;
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
      } catch {
        /* rien de plus à tenter */
      }
      field.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="rounded-sm border border-line bg-paper p-4">
      <p className="truncate text-[0.8125rem] text-stone" dir="ltr">
        {url}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(
          "mt-3 text-[0.875rem] font-medium underline underline-offset-4 transition-fast",
          copied ? "text-success" : "text-ink hover:text-champagne-deep",
        )}
      >
        {copied ? copiedLabel : label}
      </button>
    </div>
  );
}
