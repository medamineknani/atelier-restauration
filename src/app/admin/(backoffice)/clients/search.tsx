"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { adminInputClass } from "@/components/admin/ui";

export function ClientsSearch({ value }: { value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        const q = String(formData.get("q") ?? "").trim();
        startTransition(() => router.push(q ? `/admin/clients?q=${encodeURIComponent(q)}` : "/admin/clients"));
      }}
      className="flex gap-2"
    >
      <input
        name="q"
        type="search"
        defaultValue={value}
        placeholder="Nom, email, téléphone…"
        className={adminInputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-sm bg-ink px-4 py-2 text-[0.8125rem] font-medium text-paper transition-fast hover:bg-ink-soft disabled:opacity-50"
      >
        Chercher
      </button>
    </form>
  );
}
