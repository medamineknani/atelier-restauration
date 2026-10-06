import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator, localePath, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { startOrder } from "@/server/actions/checkout";
import { readDraftOrderId } from "@/lib/draft";
import { getOrderWithItems } from "@/server/services/orders";
import { StepShell } from "@/components/shop/step-shell";
import { ArrowIcon } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);
  return buildMetadata({
    locale,
    path: "/commande/service",
    title: t("checkout.serviceTitle"),
    description: t("checkout.serviceLede"),
    noIndex: true,
  });
}

/**
 * Étape 1 — le service.
 *
 * Trois portes d'entrée, pas plus. Les deux premières ouvrent le tunnel ; la
 * troisième (« ajouter à une commande existante ») sort du tunnel puisqu'elle
 * concerne une commande déjà enregistrée.
 */
export default async function ServiceStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const draftId = await readDraftOrderId();
  const draft = draftId ? await getOrderWithItems(draftId) : null;
  const resumable = draft && draft.status === "draft" && draft.items.length > 0;

  return (
    <StepShell
      eyebrow={t("checkout.title")}
      title={t("checkout.serviceTitle")}
      lede={t("checkout.serviceLede")}
    >
      {resumable ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-champagne bg-champagne-soft/40 p-5">
          <div>
            <p className="font-display text-[1.0625rem] text-ink">{t("checkout.resumeTitle")}</p>
            <p className="mt-1 text-[0.875rem] text-stone">
              {draft.items[0]?.nameSnapshot} · {draft.reference}
            </p>
          </div>
          <Link
            href={localePath(locale, "/commande/photos")}
            className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink underline underline-offset-4"
          >
            {t("checkout.resumeCta")}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <ServiceCard
          action={startOrder}
          locale={locale}
          kind="digital"
          title={t("checkout.digitalTitle")}
          body={t("checkout.digitalBody")}
          cta={t("checkout.chooseServiceCta")}
        />

        <ServiceCard
          action={startOrder}
          locale={locale}
          kind="photobook"
          title={t("checkout.photobookTitle")}
          body={t("checkout.photobookBody")}
          cta={t("checkout.chooseServiceCta")}
        />

        {/* Hors tunnel : la commande existe déjà. Renvoie vers l'espace client
            dès que celui-ci sera livré (M3) ; en attendant, vers le contact. */}
        <div className="rounded-md border border-line bg-paper/60 p-7 md:col-span-2">
          <h2 className="font-display text-[1.25rem] text-ink">{t("checkout.extraTitle")}</h2>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-graphite">
            {t("checkout.extraBody")}
          </p>
          <Link
            href={localePath(locale, "/contact")}
            className="mt-5 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink underline underline-offset-4"
          >
            {t("nav.contact")}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <p className="mt-10 text-[0.8125rem] leading-relaxed text-muted">
        {t("checkout.secureNote")}
      </p>
    </StepShell>
  );
}

function ServiceCard({
  action,
  locale,
  kind,
  title,
  body,
  cta,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  kind: "digital" | "photobook";
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <form action={action} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
        className="group flex h-full w-full flex-col justify-between rounded-md border border-line bg-paper p-7 text-start transition-editorial hover:border-champagne hover:shadow-md focus-visible:border-champagne focus-visible:outline-none md:p-8"
      >
        <span>
          <span className="block font-display text-[1.375rem] text-ink">{title}</span>
          <span className="mt-3 block max-w-sm text-[0.9375rem] leading-relaxed text-graphite">
            {body}
          </span>
        </span>
        <span className="mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
          {cta}
          <ArrowIcon className="h-4 w-4 transition-transform duration-[280ms] group-hover:translate-x-1" />
        </span>
      </button>
    </form>
  );
}
