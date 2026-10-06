"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TestimonialCard } from "@/server/services/content";

/** Carrousel sobre : pas de défilement automatique, on respecte le lecteur. */
export function Testimonials({
  items,
  previousLabel,
  nextLabel,
}: {
  items: TestimonialCard[];
  previousLabel: string;
  nextLabel: string;
}) {
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;

  const current = items[Math.min(index, items.length - 1)]!;

  return (
    <div>
      <figure className="mx-auto max-w-3xl">
        <blockquote className="font-display text-[1.375rem] italic leading-[1.5] text-ink md:text-[1.625rem]">
          « {current.quote} »
        </blockquote>
        <figcaption className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem]">
          <span className="text-ink">{current.authorName}</span>
          {current.authorLocation ? (
            <>
              <span aria-hidden="true" className="text-line-strong">
                ·
              </span>
              <span className="text-stone">{current.authorLocation}</span>
            </>
          ) : null}
          {current.authorContext ? (
            <>
              <span aria-hidden="true" className="text-line-strong">
                ·
              </span>
              <span className="text-stone">{current.authorContext}</span>
            </>
          ) : null}
        </figcaption>
      </figure>

      {items.length > 1 ? (
        <div className="mt-12 flex items-center justify-center gap-6">
          <button
            type="button"
            aria-label={previousLabel}
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-stone transition-fast hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.25">
              <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <ul className="flex items-center gap-2.5">
            {items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`${i + 1} / ${items.length}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-6 bg-champagne" : "w-1.5 bg-line-strong hover:bg-stone",
                  )}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            aria-label={nextLabel}
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-stone transition-fast hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.25">
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
