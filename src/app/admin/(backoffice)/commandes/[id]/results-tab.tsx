import type { Asset, OrderStatusCode } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatBytes } from "@/lib/utils";
import { publishResults, unpublishResults } from "@/server/actions/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ResultsUploader } from "@/components/admin/results-uploader";

const PUBLISHED: OrderStatusCode[] = ["ready", "shipped", "completed"];
const PUBLISHABLE: OrderStatusCode[] = ["received", "processing", "restoring", "checking"];

/**
 * Résultats de la restauration.
 *
 * Le dépôt et la publication sont deux gestes distincts, et c'est volontaire :
 * on dépose au fil de l'eau, on publie quand tout est vérifié. Une seule
 * commande ne doit jamais rendre visibles des fichiers à moitié déposés.
 */
export function ResultsTab({
  orderId,
  restored,
  originals,
  status,
}: {
  orderId: string;
  restored: Asset[];
  originals: Asset[];
  status: OrderStatusCode;
}) {
  const t = createTranslator("fr");

  const pairedIds = new Set(restored.map((asset) => asset.pairedAssetId).filter(Boolean));
  const covered = originals.filter((asset) => pairedIds.has(asset.id)).length;
  const published = PUBLISHED.includes(status);

  return (
    <div className="grid gap-4">
      <Panel title={t("admin.uploadResults")}>
        <ResultsUploader
          orderId={orderId}
          labels={{
            dropzone: t("admin.dropzoneResults"),
            hint: t("admin.dropzoneResultsHint"),
            failed: t("admin.uploadFailed"),
            progress: t("admin.uploadingCount"),
            retry: t("admin.retry"),
          }}
        />
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-graphite">
          {t("admin.resultsCount", { count: restored.length })}
          {originals.length > 0
            ? ` · ${t("admin.pairingCovered", { covered, total: originals.length })}`
            : ""}
        </p>

        {restored.length > 0 ? (
          <div className="flex items-center gap-2">
            {published ? (
              <form action={unpublishResults}>
                <input type="hidden" name="orderId" value={orderId} />
                <ConfirmButton
                  label={t("admin.unpublish")}
                  confirm={t("admin.unpublishConfirm")}
                  variant="secondary"
                />
              </form>
            ) : PUBLISHABLE.includes(status) ? (
              <form action={publishResults}>
                <input type="hidden" name="orderId" value={orderId} />
                <ConfirmButton
                  label={t("admin.publish")}
                  confirm={t("admin.publishResultsConfirm")}
                />
              </form>
            ) : (
              <span className="text-[0.8125rem] text-muted">{t("admin.errorTransition")}</span>
            )}
          </div>
        ) : null}
      </div>

      {restored.length === 0 ? (
        <Panel>
          <EmptyRow>{t("admin.noFiles")}</EmptyRow>
        </Panel>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {restored.map((asset) => {
            const original = originals.find((entry) => entry.id === asset.pairedAssetId);

            return (
              <li
                key={asset.id}
                className="overflow-hidden rounded-md border border-line bg-paper"
              >
                {/* Côte à côte : c'est la seule façon de valider une
                    restauration sans ouvrir deux onglets. */}
                <div className="grid grid-cols-2 gap-px bg-line">
                  <div className="bg-sand">
                    {original ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/files/${original.id}?variant=thumb`}
                        alt="Avant"
                        width={480}
                        height={480}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-[0.6875rem] text-muted">
                        non apparié
                      </div>
                    )}
                  </div>
                  <a href={`/api/files/${asset.id}?download=1`} className="block bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${asset.id}?variant=thumb`}
                      alt="Après"
                      width={480}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover transition-fast hover:opacity-90"
                    />
                  </a>
                </div>

                <div className="grid gap-1 p-3">
                  <p className="truncate text-[0.8125rem] text-ink" title={asset.originalFilename}>
                    {asset.originalFilename}
                  </p>
                  <p className="text-[0.75rem] text-muted">{formatBytes(asset.sizeBytes)}</p>
                  <p
                    className={`text-[0.75rem] ${
                      asset.pairedAssetId ? "text-success" : "text-warning"
                    }`}
                  >
                    {asset.pairedAssetId ? t("admin.pairingAuto") : t("admin.pairingManual")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
