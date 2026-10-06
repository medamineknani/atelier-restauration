import type { Asset } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatBytes, formatShortDate } from "@/lib/utils";
import { deleteAsset } from "@/server/actions/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";

/**
 * Photographies confiées par le client.
 *
 * Les vignettes sont grandes : l'opérateur juge de l'état d'une photo à
 * l'écran, il ne lit pas sa fiche technique. Le compteur « reçues / quota »
 * est l'information qui manque le plus souvent au téléphone.
 */
export function PhotosTab({
  orderId,
  assets,
  quota,
}: {
  orderId: string;
  assets: Asset[];
  quota: number;
}) {
  const t = createTranslator("fr");

  if (assets.length === 0) {
    return (
      <Panel>
        <EmptyRow>{t("admin.noFiles")}</EmptyRow>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-graphite">
          {t("admin.photosCount", { received: assets.length, quota })}
        </p>
        <a
          href={`/api/admin/commandes/${orderId}/originaux`}
          className="text-[0.8125rem] text-graphite underline underline-offset-4 hover:text-ink"
        >
          {t("admin.downloadAllOriginals")}
        </a>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((asset) => (
          <li key={asset.id} className="overflow-hidden rounded-md border border-line bg-paper">
            <a
              href={`/api/files/${asset.id}?download=1`}
              className="block bg-sand"
              title={t("admin.downloadOriginal")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${asset.id}?variant=thumb`}
                alt={asset.originalFilename.replace(/\.[^.]+$/, "")}
                width={480}
                height={480}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover transition-fast hover:opacity-90"
              />
            </a>

            <div className="grid gap-1.5 p-3">
              <p className="truncate text-[0.8125rem] text-ink" title={asset.originalFilename}>
                {asset.originalFilename}
              </p>
              <p className="text-[0.75rem] text-muted">
                {asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ""}
                {formatBytes(asset.sizeBytes)}
              </p>
              <p className="text-[0.75rem] text-muted">
                {formatShortDate(asset.createdAt, "fr")}
              </p>

              <form action={deleteAsset} className="mt-1">
                <input type="hidden" name="assetId" value={asset.id} />
                <input type="hidden" name="orderId" value={orderId} />
                <ConfirmButton
                  label={t("admin.delete")}
                  confirm={t("admin.deleteAssetConfirm")}
                  variant="danger"
                  className="!px-3 !py-1.5 !text-[0.75rem]"
                />
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
