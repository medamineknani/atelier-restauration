"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Révélation au scroll : 10 px de translation, 520 ms.
 *
 * Deux choix délibérés :
 *
 * 1. **Aucun état React.** L'apparition est une classe ajoutée au nœud, pas un
 *    `setState` dans un effet : pas de rendu en cascade, et le HTML envoyé par
 *    le serveur est identique à celui du premier rendu client.
 * 2. **L'information n'est jamais masquée.** Sans JavaScript, une règle
 *    `<noscript>` (voir `globals.css`) rétablit l'opacité ; avec
 *    `prefers-reduced-motion`, l'animation est neutralisée par le design
 *    system. Un contenu invisible parce qu'un script n'a pas chargé est un
 *    défaut inacceptable sur un site vitrine.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const show = () => node.classList.add("reveal-in");

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}
