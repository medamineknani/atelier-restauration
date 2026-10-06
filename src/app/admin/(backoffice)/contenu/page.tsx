import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/admin/contenu/faq",
    title: "Questions fréquentes",
    hint: "Catégories, questions et réponses par langue, ordre, publication.",
  },
  {
    href: "/admin/contenu/temoignages",
    title: "Témoignages",
    hint: "Modération : aucun témoignage n’apparaît sans approbation explicite.",
  },
  {
    href: "/admin/contenu/galerie",
    title: "Galerie avant / après",
    hint: "Légende du travail effectué, catégorie, ordre, mise en avant.",
  },
  {
    href: "/admin/demandes",
    title: "Demandes reçues",
    hint: "Messages du formulaire de contact et demandes de devis.",
  },
];

export default async function AdminContentPage() {
  const t = createTranslator("fr");

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-[1.5rem] text-ink">{t("admin.contentTitle")}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Panel className="h-full transition-fast hover:border-champagne">
              <h2 className="text-[0.9375rem] text-ink">{section.title}</h2>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-stone">{section.hint}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
