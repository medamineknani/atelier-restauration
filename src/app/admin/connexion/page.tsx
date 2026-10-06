import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/admin";
import { AdminSignInForm } from "./form";

export const metadata: Metadata = {
  title: "Connexion — Administration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string }>;
}) {
  const { suivant } = await searchParams;

  // Déjà connecté : inutile de refaire le parcours.
  if (await currentAdmin()) redirect(suivant || "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-champagne-deep">
          Atelier Restauration
        </p>
        <h1 className="mt-3 font-display text-[1.75rem] leading-tight text-ink">
          Administration
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone">
          Accès réservé à l’équipe. Toute connexion est journalisée.
        </p>

        <div className="mt-8 rounded-md border border-line bg-paper p-6">
          <AdminSignInForm next={suivant || "/admin"} />
        </div>
      </div>
    </main>
  );
}
