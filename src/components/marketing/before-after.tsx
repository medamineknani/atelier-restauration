"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Comparaison Original ↔ Restauré.
 *
 * Conçu d'abord pour le tactile : le curseur suit le doigt sans inertie
 * (on compare, on ne joue pas). Accessible au clavier via un `input[type=range]`
 * réel : flèches = 5 %, Home/End = 0/100 %. Aucune translation ne modifie la
 * taille du cadre : l'image ne provoque jamais de décalage de mise en page.
 */
export function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  beforeLabel,
  afterLabel,
  sliderLabel,
  width = 1400,
  height = 934,
  className,
  initial = 50,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  beforeLabel: string;
  afterLabel: string;
  sliderLabel: string;
  width?: number;
  height?: number;
  className?: string;
  initial?: number;
  priority?: boolean;
  sizes?: string;
}) {
  const [position, setPosition] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const updateFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <figure className={cn("relative", className)}>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className="relative touch-pan-y select-none overflow-hidden rounded-sm bg-sand"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {/* Restauré (couche de fond) */}
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          sizes={sizes}
          priority={priority}
          draggable={false}
          className="object-cover"
        />

        {/* Original (couche clippée) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            fill
            sizes={sizes}
            priority={priority}
            draggable={false}
            className="object-cover"
          />
        </div>

        {/* Légendes */}
        <span
          className={cn(
            "pointer-events-none absolute bottom-4 start-4 rounded-xs bg-paper/85 px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.16em] text-ink transition-opacity duration-200",
            dragging && "opacity-0",
          )}
        >
          {beforeLabel}
        </span>
        <span
          className={cn(
            "pointer-events-none absolute bottom-4 end-4 rounded-xs bg-ink/80 px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.16em] text-paper transition-opacity duration-200",
            dragging && "opacity-0",
          )}
        >
          {afterLabel}
        </span>

        {/* Poignée */}
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ insetInlineStart: `${position}%` }}
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-paper/90" />
          <div className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-paper/70 bg-paper/95 shadow-md backdrop-blur-[1px]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink" fill="none" stroke="currentColor" strokeWidth="1.25">
              <path d="M9.5 8.5 6 12l3.5 3.5M14.5 8.5 18 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Commande clavier */}
        <label className="sr-only" htmlFor={inputId}>
          {sliderLabel}
        </label>
        <input
          id={inputId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Home") setPosition(0);
            if (event.key === "End") setPosition(100);
          }}
          className="absolute inset-x-0 bottom-0 h-11 w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
          aria-label={sliderLabel}
          aria-valuetext={`${Math.round(position)}%`}
        />
      </div>
    </figure>
  );
}
