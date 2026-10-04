import type { Metadata } from "next";
import { createTranslator, type Locale } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { goToDetails, removeUploadedPhoto } from "@/server/actions/checkout";
import { getExtrasForPack, orderLimits } from "@/server/services/catalog";
import { currentDraft } from "@/server/services/checkout-session";
import { listOriginals } from "@/server/services/assets";
import { env } from "@/config/env";
import { formatBytes, priceLabel } from "@/lib/utils";
import { StepShell } from "@/components/shop/step-shell";
import { OrderSummary } from "@/components/shop/order-summary";
import { PhotoUploader } from "@/components/shop/photo-uploader";
import { SubmitButton } from "@/components/shop/submit-button";

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
    path: "/commande/photos",
    title: t("checkout.photosTitle"),
    description: t("checkout.photosLede"),
    noIndex: true,
  });
}

/**
 * Étape 4 — l'envoi des photographies.
 *
 * C'est l'étape décisive : si elle échoue sur un téléphone avec une mauvaise
 * connexion, la commande n'existe pas. D'où un envoi immédiat, fichier par
 * fichier, avec reprise possible — et la possibilité de passer cette étape
 * pour revenir déposer ses photos plus tard.
 */
export default async function PhotosStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const t = createTranslator(locale);

  const order = await currentDraft(locale);
  const limits = await orderLimits();
  const originals = await listOriginals(order.id);

  // Prix de la photo supplémentaire : lu depuis le catalogue, jamais écrit ici.
  const pack = order.items.find((item) => item.itemType === "pack");
  const extras = pack?.productId ? await getExtrasForPack(pack.productId, locale) : [];
  const extraPhoto =
    extras.find((extra) => extra.pricingMode === "per_photo" && extra.extraPhotosGranted > 0) ??
    extras.find((extra) => extra.extraPhotosGranted > 0);

  const existing = originals.map((asset) => ({
    id: asset.id,
    filename: asset.originalFilename || "photo",
    thumbUrl: `/api/files/${asset.id}?variant=thumb`,
  }));

  return (
    <StepShell
      eyebrow={t("checkout.steps.photos")}
      title={t("checkout.photosTitle")}
      lede={t("checkout.photosLede")}
      wide
      aside={<OrderSummary locale={locale} order={order} />}
    >
      <PhotoUploader
        mode={env.STORAGE_DRIVER === "s3" ? "presigned" : "local"}
        quota={order.photosQuota || 0}
        extraPriceLabel={
          extraPhoto ? priceLabel(extraPhoto.priceMillimes, locale) : "—"
        }
        maxSizeBytes={limits.maxFileSizeBytes}
        acceptedFormats={limits.acceptedFormats}
        existing={existing}
        removeAction={removeUploadedPhoto}
        labels={{
          chooseFromPhone: t("checkout.chooseFromPhone"),
          dropzoneTitle: t("checkout.dropzoneTitle"),
          dropzoneHint: t("checkout.dropzoneHint"),
          retry: t("checkout.retry"),
          remove: t("checkout.removePhoto"),
          removing: t("checkout.removing"),
          counter: t("checkout.counter"),
          counterOver: t("checkout.counterOver"),
          quotaExceeded: t("checkout.quotaExceeded"),
          fileTooLarge: t("checkout.maxSize", { size: formatBytes(limits.maxFileSizeBytes) }),
          unsupportedFormat: t("errors.unsupportedFormat"),
          uploadFailed: t("checkout.uploadFailed"),
          quotaReached: t("errors.tooManyPhotos"),
          rejected: t("checkout.rejected"),
        }}
      />

      <p className="mt-8 text-[0.8125rem] leading-relaxed text-muted">
        {t("checkout.photosStepNote")} {t("checkout.maxSize", { size: formatBytes(limits.maxFileSizeBytes) })}.
      </p>

      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <form action={goToDetails}>
          <input type="hidden" name="locale" value={locale} />
          <SubmitButton
            label={existing.length > 0 ? t("common.continue") : t("checkout.sendLater")}
            pendingLabel={t("common.saving")}
            size="lg"
          />
        </form>

        <p className="text-[0.8125rem] leading-relaxed text-stone sm:max-w-xs sm:text-end">
          {t("checkout.addMoreLater")}
        </p>
      </div>
    </StepShell>
  );
}
