"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/server/services/content";

export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => {
        const expanded = open === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-button-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : item.id)}
                className="flex w-full items-start justify-between gap-6 py-6 text-start transition-fast hover:text-champagne-deep"
              >
                <span className="font-display text-[1.0625rem] leading-snug text-ink">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 shrink-0 text-champagne transition-transform duration-300",
                    expanded && "rotate-45",
                  )}
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.25">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="pb-7 ps-0 pe-10"
            >
              <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-graphite">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
