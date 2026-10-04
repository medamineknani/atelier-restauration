import Link from "next/link";
import { desc, inArray } from "drizzle-orm";

import { env } from "@/config/env";
import { site } from "@/config/site";
import { createTranslator } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { AdminButton, AdminLabel, EmptyRow, Panel, adminInputClass } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import {
  getBrandSettings,
  getCommercialSettings,
  getPaymentSettings,
  getStorageSettings,
} from "@/server/services/settings";
import { listPaymentDrivers } from "@/lib/payments";
import {
  changeTeamRole,
  createTeamMember,
  disableTeamMember,
  enableTeamMember,
  revokeTeamSessions,
  saveBrandSettings,
  saveCommercialSettings,
  savePaymentSettings,
  saveStorageSettings,
  sendTestEmail,
} from "@/server/actions/admin-settings";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "marque", label: "Marque & coordonnées" },
  { id: "commercial", label: "Commercial" },
  { id: "paiement", label: "Paiement" },
  { id: "stockage", label: "Stockage" },
  { id: "notifications", label: "Notifications" },
  { id: "equipe", label: "Équipe" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Sections dont la modification est réservée au superadministrateur. */
const SUPERADMIN_SECTIONS: SectionId[] = ["paiement", "stockage", "equipe"];

/* -------------------------------------------------------------------------- */
/* Secrets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Variables d'environnement attendues par domaine.
 *
 * Les secrets **ne sont jamais** stockés en base : une clé d'API dans un
 * formulaire web finit dans un export, un ticket ou un historique de
 * navigateur. L'écran indique donc ce qui est configuré, sans jamais
 * permettre la lecture ni la saisie de la valeur.
 */
const SECRET_VARS: { section: SectionId; varName: string; note: string }[] = [
  { section: "paiement", varName: "KONNECT_API_KEY", note: "Konnect · clé d'API" },
  { section: "paiement", varName: "KONNECT_WEBHOOK_SECRET", note: "Konnect · secret webhook" },
  { section: "paiement", varName: "FLOUCI_APP_ID", note: "Flouci · identifiant" },
  { section: "paiement", varName: "FLOUCI_APP_SECRET", note: "Flouci · secret" },
  { section: "paiement", varName: "D17_API_KEY", note: "D17 · clé d'API" },
  { section: "stockage", varName: "STORAGE_S3_ACCESS_KEY_ID", note: "S3 · identifiant" },
  { section: "stockage", varName: "STORAGE_S3_SECRET_ACCESS_KEY", note: "S3 · secret" },
  { section: "notifications", varName: "RESEND_API_KEY", note: "Resend · clé d'API" },
];

/** `sk_live_8f2a…9c1` → `sk_live_••••9c1`. Jamais plus de 3 caractères visibles. */
function maskSecret(value: string | undefined): string {
  if (!value || value.length < 8) return "non configuré";
  const prefixMatch = /^[a-z]+_[a-z]+_/.exec(value);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  return `${prefix}••••${value.slice(-3)}`;
}

/* -------------------------------------------------------------------------- */
/* Petites briques                                                             */
/* -------------------------------------------------------------------------- */

function Field({
  name,
  label,
  defaultValue,
  hint,
  type = "text",
  disabled,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  hint?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <AdminLabel htmlFor={name} hint={hint}>
        {label}
      </AdminLabel>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className={adminInputClass}
      />
    </div>
  );
}

/** Valeur technique non modifiable, affichée pour information ou copie. */
function ReadOnlyValue({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={undefined}
        className={`${adminInputClass} cursor-default bg-sand text-stone`}
      />
      {hint ? <span className="text-[0.75rem] text-muted">{hint}</span> : null}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-sm border border-line bg-sand/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-graphite">
      {children}
    </p>
  );
}

const MESSAGES: Record<string, string> = {
  permissions: "Cette action est réservée au superadministrateur.",
  envoye: "Email de test envoyé.",
  "email-invalide": "Adresse destinataire invalide.",
  echec: "L'envoi a échoué : vérifiez la configuration du service d'envoi.",
  cree: "Compte créé.",
  existant: "Cette adresse possède déjà un compte.",
  invalide: "Informations invalides.",
  erreur: "La création a échoué.",
  "soi-meme": "Impossible de vous modifier ou de vous désactiver vous-même.",
  dernier: "C'est le dernier superadministrateur : créez-en un second avant de désactiver celui-ci.",
  role: "Rôle mis à jour.",
  sessions: "Sessions révoquées : le compte est déconnecté de tous les appareils.",
  desactive: "Accès désactivé.",
  active: "Accès rétabli.",
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; etat?: string }>;
}) {
  const admin = await requireAdminPage("/admin/parametres");
  const t = createTranslator("fr");
  const params = await searchParams;

  const requested = SECTIONS.find((s) => s.id === params.section)?.id ?? "marque";
  const locked = SUPERADMIN_SECTIONS.includes(requested) && admin.role !== "superadmin";

  const [brand, commercial, payment, storage] = await Promise.all([
    getBrandSettings(),
    getCommercialSettings(),
    getPaymentSettings(),
    getStorageSettings(),
  ]);

  const isSuperadmin = admin.role === "superadmin";
  const drivers = listPaymentDrivers();

  const team = isSuperadmin
    ? await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(inArray(users.role, ["admin", "superadmin"]))
        .orderBy(desc(users.createdAt))
    : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.5rem] text-ink">{t("admin.settingsTitle")}</h1>
        <p className="text-[0.8125rem] text-stone">
          Connecté en tant que <span className="text-ink">{admin.email}</span> ·{" "}
          {admin.role === "superadmin" ? "superadministrateur" : "administrateur"}
        </p>
      </div>

      <nav aria-label="Sections" className="flex flex-wrap gap-1 border-b border-line pb-3">
        {SECTIONS.map((section) => {
          const active = section.id === requested;
          return (
            <Link
              key={section.id}
              href={`/admin/parametres?section=${section.id}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-sm bg-ink px-3 py-1.5 text-[0.8125rem] text-paper"
                  : "rounded-sm px-3 py-1.5 text-[0.8125rem] text-graphite transition-fast hover:bg-cream hover:text-ink"
              }
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      {params.etat && MESSAGES[params.etat] ? (
        <p className="rounded-sm border border-champagne bg-cream px-4 py-3 text-[0.8125rem] text-ink">
          {MESSAGES[params.etat]}
        </p>
      ) : null}

      {locked ? (
        <Panel>
          <p className="text-[0.875rem] text-graphite">
            Cette section est réservée au superadministrateur. Vous pouvez consulter les valeurs,
            mais pas les modifier.
          </p>
        </Panel>
      ) : null}

      {requested === "marque" ? (
        <Panel title="Marque &amp; coordonnées">
          <form action={saveBrandSettings} className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Nom de l'atelier" defaultValue={brand.name} />
            <Field name="email" label="Email de contact" type="email" defaultValue={brand.email} />
            <Field
              name="phone"
              label="Téléphone"
              defaultValue={brand.phone}
              hint="Le lien « appeler » est dérivé de ce numéro."
            />
            <Field name="whatsapp" label="WhatsApp" defaultValue={brand.whatsapp} />
            <Field name="street" label="Adresse" defaultValue={brand.street} />
            <div className="grid grid-cols-2 gap-4">
              <Field name="postalCode" label="Code postal" defaultValue={brand.postalCode} />
              <Field name="city" label="Ville" defaultValue={brand.city} />
            </div>
            <Field name="region" label="Gouvernorat" defaultValue={brand.region} />
            <Field name="country" label="Pays" defaultValue={brand.country} />
            <Field
              name="openingHours"
              label="Horaires"
              defaultValue={brand.openingHours}
              hint="Une seule ligne, affichée en pied de page."
            />
            <Field name="instagram" label="Instagram" defaultValue={brand.instagram} />
            <Field name="facebook" label="Facebook" defaultValue={brand.facebook} />
            <div className="sm:col-span-2">
              <Note>
                Ces coordonnées alimentent le pied de page, la page Contact, la facture, la signature
                des emails et les données structurées transmises aux moteurs de recherche. Le nom de
                domaine reste fixé par la configuration technique.
              </Note>
            </div>
            <div className="sm:col-span-2">
              <AdminButton type="submit">{t("admin.saveChanges")}</AdminButton>
            </div>
          </form>
        </Panel>
      ) : null}

      {requested === "commercial" ? (
        <Panel title="Commercial">
          <form action={saveCommercialSettings} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="shippingFlat"
                label="Frais de port forfaitaires (DT)"
                defaultValue={(commercial.shippingFlatMillimes / 1000).toFixed(3)}
                hint="0 = livraison numérique offerte."
              />
              <ReadOnlyValue label="Devise" value="TND · dinar tunisien" hint="Non modifiable." />
            </div>

            <label className="flex items-start gap-3 rounded-sm border border-line bg-sand/40 px-4 py-3">
              <input
                type="checkbox"
                name="requirePhotos"
                defaultChecked={commercial.requirePhotosBeforeSubmit}
                className="mt-0.5"
              />
              <span className="text-[0.8125rem] text-ink">
                Exiger au moins une photo avant de valider une commande
                <span className="mt-1 block text-[0.75rem] text-muted">
                  Évite les commandes vides. Décochez seulement pour un dépôt physique à l&apos;atelier.
                </span>
              </span>
            </label>

            <div className="grid gap-1.5">
              <AdminLabel htmlFor="acceptedFormats" hint="Types MIME, séparés par des virgules.">
                Formats acceptés à l&apos;envoi
              </AdminLabel>
              <textarea
                id="acceptedFormats"
                name="acceptedFormats"
                rows={3}
                defaultValue={commercial.acceptedFormats.join(", ")}
                className={adminInputClass}
              />
            </div>

            <Note>
              Les délais annoncés sont portés par chaque pack : modifiez-les depuis le{" "}
              <Link href="/admin/catalogue" className="text-ink underline underline-offset-2">
                catalogue
              </Link>
              . Les prix aussi, pour qu&apos;un changement de tarif laisse les commandes en cours
              intactes.
            </Note>

            <div>
              <AdminButton type="submit">{t("admin.saveChanges")}</AdminButton>
            </div>
          </form>
        </Panel>
      ) : null}

      {requested === "paiement" ? (
        <div className="grid gap-6">
          <Panel title="Moyens de règlement activés">
            <ul className="grid gap-2">
              {drivers.map((driver) => (
                <li
                  key={driver.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-line px-4 py-3"
                >
                  <div>
                    <p className="text-[0.875rem] text-ink">{driver.id}</p>
                    <p className="text-[0.75rem] text-muted">
                      {driver.isOnline ? "Encaissement en ligne" : "Règlement hors ligne"}
                    </p>
                  </div>
                  <span className="text-[0.75rem] uppercase tracking-[0.12em] text-success">
                    Actif
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Note>
                L&apos;activation d&apos;un prestataire se fait par variable d&apos;environnement
                (<code>PAYMENT_PROVIDERS</code>), puis redéploiement. C&apos;est volontaire : une
                clé d&apos;API ne doit jamais pouvoir être saisie depuis un formulaire web, où elle
                finirait dans un export ou un historique de navigateur.
              </Note>
            </div>
          </Panel>

          <Panel title="Règlement hors ligne (virement, espèces)">
            <form action={savePaymentSettings} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="manualHolder"
                  label="Titulaire du compte"
                  defaultValue={payment.manualHolder}
                  disabled={locked}
                />
                <Field
                  name="manualBank"
                  label="Banque"
                  defaultValue={payment.manualBank}
                  disabled={locked}
                />
              </div>
              <Field
                name="manualIban"
                label="IBAN"
                defaultValue={payment.manualIban}
                disabled={locked}
                hint="Affiché au client sur la page de confirmation de commande."
              />
              <Field
                name="providerOrder"
                label="Ordre d'affichage des moyens de paiement"
                defaultValue={payment.providerOrder.join(", ")}
                disabled={locked}
                hint="Identifiants séparés par des virgules."
              />
              <div className="border-t border-line pt-4">
                <h3 className="text-[0.8125rem] text-ink">Contre-remboursement</h3>
                <label className="mt-3 flex items-start gap-3 rounded-sm border border-line bg-sand/40 px-4 py-3">
                  <input
                    type="checkbox"
                    name="codEnabled"
                    defaultChecked={payment.codEnabled}
                    disabled={locked}
                    className="mt-0.5"
                  />
                  <span className="text-[0.8125rem] text-ink">
                    Proposer le paiement à la livraison
                    <span className="mt-1 block text-[0.75rem] text-muted">
                      Uniquement pour les commandes livrées : sans colis, il n&apos;y a rien
                      contre quoi remettre l&apos;argent.
                    </span>
                  </span>
                </label>
                <div className="mt-4 max-w-xs">
                  <Field
                    name="codMax"
                    label={t("admin.codMax")}
                    defaultValue={payment.codMaxMillimes ? (payment.codMaxMillimes / 1000).toFixed(3) : ""}
                    disabled={locked}
                    hint="0 = pas de plafond. Au-delà, le moyen n'est pas proposé."
                  />
                </div>
              </div>

              {!locked ? <AdminButton type="submit">{t("admin.saveChanges")}</AdminButton> : null}
            </form>
          </Panel>

          <Panel title="Clés d'API">
            <dl className="grid gap-3">
              {SECRET_VARS.filter((s) => s.section === "paiement").map((secret) => (
                <div
                  key={secret.varName}
                  className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0"
                >
                  <dt className="text-[0.8125rem] text-stone">
                    {secret.note}
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted">
                      {secret.varName}
                    </span>
                  </dt>
                  <dd
                    className={
                      process.env[secret.varName]
                        ? "font-mono text-[0.8125rem] text-ink"
                        : "text-[0.8125rem] text-muted"
                    }
                  >
                    {maskSecret(process.env[secret.varName])}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <ReadOnlyValue
                label="URL de webhook à communiquer au prestataire"
                value={`${site.url}/api/webhooks/paiement/{prestataire}`}
                hint="Remplacez {prestataire} par l'identifiant du moyen de paiement. Une seule route sert tous les prestataires."
              />
            </div>
          </Panel>
        </div>
      ) : null}

      {requested === "stockage" ? (
        <div className="grid gap-6">
          <Panel title="Emplacement des fichiers">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyValue
                label="Pilote"
                value={env.STORAGE_DRIVER === "s3" ? "S3 (compatible)" : "Disque local"}
              />
              <ReadOnlyValue
                label="Répertoire / bucket"
                value={
                  env.STORAGE_DRIVER === "s3"
                    ? (env.STORAGE_S3_BUCKET ?? "non configuré")
                    : env.STORAGE_LOCAL_DIR
                }
              />
              <ReadOnlyValue
                label="Région"
                value={env.STORAGE_DRIVER === "s3" ? (env.STORAGE_S3_REGION ?? "—") : "—"}
                hint="Choisissez une région européenne : les photographies de vos clients ne sortent pas du continent."
              />
              <ReadOnlyValue
                label="Point de terminaison"
                value={env.STORAGE_S3_ENDPOINT ?? "—"}
              />
            </div>
            <div className="mt-4">
              <Note>
                Le pilote se choisit par configuration technique, pas depuis cet écran : pointer le
                stockage vers un autre bucket par erreur rendrait tous les originaux introuvables
                d&apos;un coup.
              </Note>
            </div>
          </Panel>

          <Panel title="Limites et rétention">
            <form action={saveStorageSettings} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="maxFileSizeMb"
                  label="Taille maximale par fichier (Mo)"
                  defaultValue={Math.round(storage.maxFileSizeBytes / 1024 / 1024)}
                  disabled={locked}
                />
                <Field
                  name="maxFilesPerOrder"
                  label="Nombre maximal de fichiers par commande"
                  defaultValue={storage.maxFilesPerOrder}
                  disabled={locked}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  name="retentionOriginals"
                  label="Originaux conservés (jours)"
                  defaultValue={storage.retentionOriginalsDays}
                  disabled={locked}
                />
                <Field
                  name="retentionRestored"
                  label="Résultats conservés (jours)"
                  defaultValue={storage.retentionRestoredDays}
                  disabled={locked}
                />
                <Field
                  name="retentionDraft"
                  label="Brouillons conservés (jours)"
                  defaultValue={storage.retentionDraftDays}
                  disabled={locked}
                />
              </div>

              <dl className="grid gap-3">
                {SECRET_VARS.filter((s) => s.section === "stockage").map((secret) => (
                  <div
                    key={secret.varName}
                    className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0"
                  >
                    <dt className="text-[0.8125rem] text-stone">
                      {secret.note}
                      <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted">
                        {secret.varName}
                      </span>
                    </dt>
                    <dd
                      className={
                        process.env[secret.varName]
                          ? "font-mono text-[0.8125rem] text-ink"
                          : "text-[0.8125rem] text-muted"
                      }
                    >
                      {maskSecret(process.env[secret.varName])}
                    </dd>
                  </div>
                ))}
              </dl>

              {!locked ? <AdminButton type="submit">{t("admin.saveChanges")}</AdminButton> : null}
            </form>
          </Panel>
        </div>
      ) : null}

      {requested === "notifications" ? (
        <div className="grid gap-6">
          <Panel title="Service d'envoi">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyValue
                label="Pilote"
                value={env.MAILER_DRIVER === "resend" ? "Resend" : "Console (fichiers locaux)"}
                hint={
                  env.MAILER_DRIVER === "resend"
                    ? undefined
                    : "En développement, les emails sont écrits dans .data/mail au lieu de partir."
                }
              />
              <ReadOnlyValue label="Expéditeur" value={env.MAILER_FROM} />
            </div>
            <div className="mt-4">
              <dl className="grid gap-3">
                {SECRET_VARS.filter((s) => s.section === "notifications").map((secret) => (
                  <div
                    key={secret.varName}
                    className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0"
                  >
                    <dt className="text-[0.8125rem] text-stone">
                      {secret.note}
                      <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted">
                        {secret.varName}
                      </span>
                    </dt>
                    <dd
                      className={
                        process.env[secret.varName]
                          ? "font-mono text-[0.8125rem] text-ink"
                          : "text-[0.8125rem] text-muted"
                      }
                    >
                      {maskSecret(process.env[secret.varName])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>

          <Panel title="Déclencheurs">
            <ul className="grid gap-2 text-[0.8125rem]">
              {[
                ["Commande enregistrée", "Récapitulatif et lien de suivi, envoyé dès la validation."],
                ["Commande reçue", "Confirmation de la prise en charge par l'atelier."],
                ["Résultats prêts", "Lien de téléchargement des photographies restaurées."],
                ["Changement de statut", "Chaque avancement, avec le message de l'atelier s'il y en a un."],
                ["Commande expédiée", "Transporteur et numéro de suivi."],
                ["Lien de connexion", "Accès à l'espace client sans mot de passe."],
                ["Nouvelle commande", "Alerte interne à l'atelier."],
              ].map(([title, body]) => (
                <li key={title} className="border-b border-line/60 pb-2.5 last:border-0">
                  <p className="text-ink">{title}</p>
                  <p className="text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Envoi de test">
            <form action={sendTestEmail} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-1.5">
                <AdminLabel htmlFor="to" hint="Le message part immédiatement.">
                  Envoyer un email de test à
                </AdminLabel>
                <input
                  id="to"
                  name="to"
                  type="email"
                  defaultValue={admin.email}
                  className={adminInputClass}
                />
              </div>
              <AdminButton type="submit" variant="secondary">
                Envoyer le test
              </AdminButton>
            </form>
          </Panel>
        </div>
      ) : null}

      {requested === "equipe" && isSuperadmin ? (
        <div className="grid gap-6">
          <Panel title="Comptes d'administration">
            <div className="grid gap-3">
              {team.length === 0 ? (
                <EmptyRow>Aucun compte.</EmptyRow>
              ) : (
                team.map((member) => {
                  const disabled = member.deletedAt !== null;
                  const isSelf = member.id === admin.id;
                  return (
                    <details
                      key={member.id}
                      className="rounded-sm border border-line px-4 py-3"
                      open={false}
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                        <span className="text-[0.875rem] text-ink">
                          {member.email}
                          {disabled ? (
                            <span className="ml-2 text-[0.75rem] text-danger">désactivé</span>
                          ) : null}
                          {isSelf ? (
                            <span className="ml-2 text-[0.75rem] text-muted">c&apos;est vous</span>
                          ) : null}
                        </span>
                        <span className="text-[0.75rem] uppercase tracking-[0.12em] text-stone">
                          {member.role === "superadmin"
                            ? "Superadministrateur"
                            : "Administrateur"}
                        </span>
                      </summary>

                      <div className="mt-4 grid gap-4 border-t border-line pt-4">
                        <dl className="grid gap-2 text-[0.8125rem] sm:grid-cols-2">
                          <div>
                            <dt className="text-stone">Nom</dt>
                            <dd className="text-ink">{member.name || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-stone">Dernière connexion</dt>
                            <dd className="text-ink">
                              {member.lastLoginAt
                                ? new Date(member.lastLoginAt).toLocaleString("fr-TN")
                                : "jamais"}
                            </dd>
                          </div>
                        </dl>

                        <form
                          action={changeTeamRole}
                          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                        >
                          <input type="hidden" name="id" value={member.id} />
                          <div className="grid gap-1.5">
                            <AdminLabel htmlFor={`role-${member.id}`}>Rôle</AdminLabel>
                            <select
                              id={`role-${member.id}`}
                              name="role"
                              defaultValue={member.role}
                              disabled={isSelf}
                              className={adminInputClass}
                            >
                              <option value="admin">Administrateur</option>
                              <option value="superadmin">Superadministrateur</option>
                            </select>
                          </div>
                          <AdminButton type="submit" variant="secondary" disabled={isSelf}>
                            Appliquer
                          </AdminButton>
                        </form>

                        <div className="flex flex-wrap gap-2">
                          <form action={revokeTeamSessions}>
                            <input type="hidden" name="id" value={member.id} />
                            <ConfirmButton
                              label="Révoquer les sessions"
                              confirm={`Déconnecter ${member.email} de tous les appareils ?`}
                              variant="secondary"
                            />
                          </form>

                          {disabled ? (
                            <form action={enableTeamMember}>
                              <input type="hidden" name="id" value={member.id} />
                              <AdminButton type="submit" variant="secondary">
                                Rétablir l&apos;accès
                              </AdminButton>
                            </form>
                          ) : (
                            <form action={disableTeamMember}>
                              <input type="hidden" name="id" value={member.id} />
                              <ConfirmButton
                                label="Désactiver l'accès"
                                confirm={`Désactiver l'accès de ${member.email} ? Ses commandes et ses notes restent conservées.`}
                                variant="danger"
                              />
                            </form>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </Panel>

          <Panel title="Nouveau compte">
            <form action={createTeamMember} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="name" label="Nom" />
                <Field name="email" label="Email" type="email" />
                <div className="grid gap-1.5">
                  <AdminLabel
                    htmlFor="role"
                    hint="Seul un superadministrateur peut modifier les prix, le paiement, le stockage et les comptes."
                  >
                    Rôle
                  </AdminLabel>
                  <select id="role" name="role" defaultValue="admin" className={adminInputClass}>
                    <option value="admin">Administrateur</option>
                    <option value="superadmin">Superadministrateur</option>
                  </select>
                </div>
                <Field
                  name="password"
                  label="Mot de passe provisoire"
                  type="password"
                  hint="12 caractères minimum. À changer à la première connexion."
                />
              </div>
              <div>
                <AdminButton type="submit">Créer le compte</AdminButton>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
