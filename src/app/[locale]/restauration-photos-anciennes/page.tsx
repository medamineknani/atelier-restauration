import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { getPacks } from "@/server/services/catalog";
import { getFaqs } from "@/server/services/content";
import { getServicePage } from "@/content/pages";
import { ServicePage } from "@/components/marketing/service-page";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SLUG = "restauration-photos-anciennes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const content = getServicePage(SLUG, locale);
  if (!content) return {};
  return buildMetadata({
    locale,
    path: `/${SLUG}`,
    title: content.title,
    description: content.lede,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const content = getServicePage(SLUG, locale);
  if (!content) notFound();

  const [packs, faqs] = await Promise.all([
    getPacks("digital", locale),
    getFaqs(locale, content.faqCategory),
  ]);

  return (
    <ServicePage
      locale={locale}
      content={content}
      packs={packs}
      faqs={faqs.slice(0, 6)}
    />
  );
}
