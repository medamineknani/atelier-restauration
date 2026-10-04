import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { getPacks } from "@/server/services/catalog";
import { getFaqs, getTransformations } from "@/server/services/content";
import { site } from "@/config/site";
import { buildMetadata, breadcrumbJsonLd, jsonLdScript, productJsonLd } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, CheckItem, Container, Eyebrow, Price, Reveal, Rule, Section } from "@/components/ui/primitives";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { GalleryGrid } from "@/components/marketing/gallery-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import type { ProductWithTranslation } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

type Entry = {
  slug: string;
  focus: string[];
  fr: { eyebrow: string; title: string; lede: string; items: { title: string; body: string }[] };
  en: { eyebrow: string; title: string; lede: string; items: { title: string; body: string }[] };
};

const ENTRIES: Entry[] = [
  {
    slug: "mariage",
    focus: ["wedding-revival"],
    fr: {
      eyebrow: "Photobook mariage",
      title: "L'album de mariage, offert à nouveau.",
      lede:
        "Nous restaurons les photographies du jour du mariage, puis nous les mettons en page dans l'ordre de la journée et les relions dans un livre 30 × 30 cm qui se transmet.",
      items: [
        { title: "Restauration complète", body: "Déjaunissement, suppression des traces de colle et de plastique, correction des teintes." },
        { title: "Mise en page sur mesure", body: "Le déroulé de la journée respecté : préparatifs, cérémonie, famille, soirée." },
        { title: "Format 30 × 30 cm lay-flat", body: "Pages à plat, ouverture complète, papier mat épais qui ne marque pas les plis." },
        { title: "Boîte de présentation", body: "Un écrin rigide pour protéger le livre et en faire un objet à offrir." },
      ],
    },
    en: {
      eyebrow: "Wedding photobook",
      title: "The wedding album, given again.",
      lede:
        "We restore the photographs of the wedding day, lay them out in the order of the day and bind them into a 30 × 30 cm book meant to be passed on.",
      items: [
        { title: "Full restoration", body: "De-yellowing, removal of glue and plastic traces, tone correction." },
        { title: "Bespoke layout", body: "The order of the day respected: preparations, ceremony, family, evening." },
        { title: "30 × 30 cm lay-flat", body: "Pages lie flat, full opening, thick matte paper that shows no crease." },
        { title: "Presentation box", body: "A rigid case to protect the book and make it an object to give." },
      ],
    },
  },
  {
    slug: "famille",
    focus: ["classic", "heritage-premium"],
    fr: {
      eyebrow: "Photobook famille",
      title: "Une boîte à chaussures transformée en livre.",
      lede:
        "Les photographies de famille dormaient dans un carton. Nous les restaurons, les classons et les relions pour qu'elles redeviennent un album que l'on feuillette.",
      items: [
        { title: "Classement", body: "Tri par époque et par personne, suppression des doublons, remise en ordre chronologique." },
        { title: "Restauration", body: "Chaque image traitée à la main, sans lissage des visages." },
        { title: "Plusieurs exemplaires", body: "Pour que chaque branche de la famille ait le sien, au prix d'une reproduction." },
        { title: "Fichiers livrés", body: "Les photographies restaurées vous sont également livrées en haute résolution." },
      ],
    },
    en: {
      eyebrow: "Family photobook",
      title: "A shoebox turned into a book.",
      lede:
        "The family photographs were sleeping in a box. We restore them, sort them and bind them so they become an album you leaf through again.",
      items: [
        { title: "Sorting", body: "Ordered by period and by person, duplicates removed, chronological sequence restored." },
        { title: "Restoration", body: "Every image worked on by hand, without smoothing faces." },
        { title: "Several copies", body: "So each branch of the family has its own, at reproduction price." },
        { title: "Files delivered", body: "The restored photographs are also delivered in high resolution." },
      ],
    },
  },
];

export function generateStaticParams() {
  return ENTRIES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const entry = ENTRIES.find((e) => e.slug === slug);
  if (!entry) return {};
  const copy = locale === "en" ? entry.en : entry.fr;
  return buildMetadata({
    locale,
    path: `/photobooks/${slug}`,
    title: copy.title,
    description: copy.lede,
  });
}

export default async function PhotobookCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const t = createTranslator(locale);
  const entry = ENTRIES.find((e) => e.slug === slug);
  if (!entry) notFound();

  const copy = locale === "en" ? entry.en : entry.fr;
  const [packs, faqs, transformations] = await Promise.all([
    getPacks("photobook", locale),
    getFaqs(locale, "livraison"),
    getTransformations(locale),
  ]);

  const focused: ProductWithTranslation[] = entry.focus
    .map((s) => packs.find((p) => p.slug === s))
    .filter((p): p is ProductWithTranslation => Boolean(p));
  const shown = focused.length > 0 ? focused : packs;

  const url = `${site.url}${localePath(locale, `/photobooks/${slug}`)}`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: t("nav.home"), url: `${site.url}${localePath(locale, "/")}` },
      { name: t("nav.photobooks"), url: `${site.url}${localePath(locale, "/photobooks")}` },
      { name: copy.title, url },
    ]),
    ...shown.map((pack) =>
      productJsonLd({
        name: pack.name,
        description: pack.tagline ?? pack.name,
        priceMillimes: pack.priceMillimes,
        url,
      }),
    ),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <Section tone="paper" className="!pb-10 !pt-14 md:!pt-20">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 className="heading-1 mt-6 text-ink">{copy.title}</h1>
            <p className="mt-7 body-lg text-graphite">{copy.lede}</p>
            <ButtonLink href={localePath(locale, "/commande/service")} size="lg" className="mt-9">
              {t("home.photobooks.cta")}
              <ArrowIcon />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="cream" className="!py-14 md:!py-20">
        <Container>
          <ul className="grid gap-10 sm:grid-cols-2">
            {copy.items.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 70}>
                  <div className="border-t border-line pt-6">
                    <h2 className="font-display text-[1.0625rem] text-ink">{item.title}</h2>
                    <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-graphite">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="paper">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("home.photobooks.eyebrow")}</h2>
          </Reveal>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {shown.map((pack) => (
              <li key={pack.id} className="flex">
                <Reveal className="flex w-full">
                  <article className="flex w-full flex-col rounded-md border border-line bg-paper p-7 md:p-8">
                    <h3 className="heading-3 text-ink">{pack.name}</h3>
                    <p className="mt-2 text-[0.9375rem] text-stone">{pack.tagline}</p>
                    <div className="mt-6">
                      <Price millimes={pack.priceMillimes} />
                    </div>
                    <Rule className="my-6" />
                    <ul className="flex-1 space-y-3">
                      {pack.features.map((feature) => (
                        <CheckItem key={feature}>{feature}</CheckItem>
                      ))}
                    </ul>
                    <p className="mt-6 text-[0.8125rem] text-stone">
                      {t("common.estimated")} : {pack.turnaroundDaysMin}–{pack.turnaroundDaysMax}{" "}
                      {t("common.days")}
                    </p>
                    <ButtonLink
                      href={`${localePath(locale, "/commande/service")}?pack=${pack.slug}`}
                      variant={pack.isFeatured ? "accent" : "secondary"}
                      className="mt-6 w-full"
                    >
                      {t("home.packs.cta")}
                    </ButtonLink>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="cream">
        <Container>
          <Reveal>
            <h2 className="heading-2 text-ink">{t("home.gallery.title")}</h2>
          </Reveal>
          <div className="mt-12">
            <GalleryGrid locale={locale} items={transformations.slice(0, 3)} columns={2} />
          </div>
        </Container>
      </Section>

      <Section tone="paper" className="!py-16 md:!py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="heading-2 text-ink">{t("faq.title")}</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <FaqAccordion items={faqs.slice(0, 5)} />
            </div>
          </div>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
