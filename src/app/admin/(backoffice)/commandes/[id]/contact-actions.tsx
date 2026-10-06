"use client";

export function ContactActions({
  email,
  phone,
  whatsapp,
  labels,
}: {
  email: string;
  phone: string;
  whatsapp: string;
  labels: { call: string; email: string; whatsapp: string };
}) {
  const tel = phone.replace(/[^+\d]/g, "");

  const base =
    "inline-flex items-center justify-center rounded-sm border border-line-strong px-4 py-2 text-[0.8125rem] text-ink transition-fast hover:border-champagne hover:bg-cream";

  return (
    <div className="flex flex-wrap gap-2">
      {tel ? (
        <a href={`tel:${tel}`} className={base}>
          {labels.call}
        </a>
      ) : null}
      <a href={`mailto:${email}`} className={base}>
        {labels.email}
      </a>
      {tel ? (
        <a
          href={`https://wa.me/${tel.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
          className={base}
        >
          {labels.whatsapp}
        </a>
      ) : null}
      <span className="sr-only">{whatsapp}</span>
    </div>
  );
}
