# 01 — Architecture technique

> **PHASE 2** — Choix techniques, justifications, arborescence.
> Versions vérifiées le 2026-10-04 sur le registre npm.

---

## 2.1 Principes directeurs

1. **Un seul dépôt, un seul déploiement.** Pas de backend séparé, pas de micro-service, pas de queue lourde tant que le volume ne le justifie pas.
2. **Le serveur fait le travail, pas le téléphone du client.** Les pages marketing sont rendues côté serveur ; le JavaScript client est réservé aux interactions qui ne peuvent pas être serveur (upload, slider avant/après, lightbox, wizard).
3. **Tout ce qui est commercial est éditable.** Prix, packs, extras, FAQ, témoignages, galerie → base de données + back-office. Aucun redeploy pour changer un tarif (exigence §6).
4. **Tout ce qui est externe est derrière une interface.** Paiement, stockage, email, SMS : une interface TypeScript + des drivers sélectionnés par variable d'environnement. Rien n'est câblé en dur (exigence §7-5).
5. **Les fichiers clients ne traversent jamais notre code applicatif en production.** Upload direct vers le stockage objet via URL présignée.
6. **Mobile-first mesuré, pas déclaré.** Budget JS strict, images responsive, zéro dépendance lourde.

---

## 2.2 Stack retenue

| Couche | Choix | Version | Rôle |
|---|---|---|---|
| Framework | **Next.js** (App Router, Turbopack) | 16.3.x | Front + back, RSC, Server Actions, PPR, `after()`, routes API |
| UI | **React** | 19.3.x | — |
| Langage | **TypeScript** (`strict`) | 5.x | Un seul langage, types partagés front↔back |
| Styles | **Tailwind CSS v4** (config CSS-first via `@theme`) | 4.3.x | Design system = variables CSS, pas de JS |
| Composants | **Primitives maison** + Radix UI pour les besoins d'accessibilité complexes (dialog, accordion, dropdown) | — | Contrôle total sur l'esthétique ; accessibilité déléguée là où c'est critique |
| Base de données | **PostgreSQL** | 16+ | Relationnel, contraintes, transactions |
| ORM | **Drizzle ORM** + `drizzle-kit` | 0.45.x / 0.31.x | SQL explicite, migrations lisibles, types inférés, pas de runtime lourd |
| DB en développement | **PGlite** (`@electric-sql/pglite`, Postgres compilé en WASM, in-process) | 0.5.x | **Même dialecte SQL qu'en production, sans Docker ni serveur** |
| Authentification | **Better Auth** | 1.7.x | Email+mot de passe, lien magique, sessions en base, rôles |
| Validation | **Zod** | 4.6.x | Une seule source de vérité pour la forme des données (formulaires, Server Actions, webhooks) |
| Images | **sharp** | 0.35.x | Thumbnails, transcodage, blur placeholders, redimensionnement au traitement |
| i18n | **next-intl** | 4.14.x | Routage `[locale]`, messages JSON, formatage date/nombre, RTL |
| Email | Interface `Mailer` → **Resend** (prod) / **Nodemailer + Mailpit** (dev) | — | Templates **React Email** |
| Stockage | Interface `StorageDriver` → **S3-compatible** (prod) / **filesystem local** (dev) | `@aws-sdk/client-s3` 3.x | Upload direct présigné, URLs signées |
| Paiement | Interface `PaymentProvider` → drivers `manual`, `konnect`, `flouci`, `d17`, `stripe` | — | Sélection par `PAYMENT_PROVIDERS` (liste ordonnée) |
| Tests | **Vitest** (unit) + **Playwright** (e2e : checkout, upload, admin) | — | Voir `08-roadmap.md` |
| Qualité | ESLint (flat config) + Prettier + `tsc --noEmit` en CI | — | — |

### Alternatives écartées

| Option | Pourquoi écartée |
|---|---|
| **Prisma** | Version 8 encore en RC au moment de l'analyse, runtime lourd en serverless, migrations moins lisibles. Drizzle couvre le besoin avec moins de magie |
| **NextAuth / Auth.js** | Historiquement instable entre les majeures de Next. Better Auth est plus simple à posséder et stocke tout en base |
| **Supabase (Auth + Storage + DB)** | Excellente solution, mais on délègue la sécurité de fichiers *irremplaçables* à un tiers et on s'enferme. On garde Postgres managé + stockage S3, deux briques remplaçables |
| **Sanity / Strapi / Payload (CMS headless)** | Un CMS complet est surdimensionné : le back-office métier (§06) est plus spécifique et plus simple à écrire qu'à configurer |
| **Monorepo Turborepo (apps/web + apps/api)** | Aucun bénéfice à ce stade, double la complexité de déploiement |
| **UploadThing / Cloudinary** | UploadThing impose son infra ; Cloudinary facture au volume et expose les originaux. Le besoin (stockage privé + URLs signées) est couvert par 2 drivers maison |
| **Vue / Nuxt / SvelteKit** | Écosystème de déploiement et de talents moins favorable pour ce projet ; Next 16 + RSC répond exactement au besoin SEO + mobile |

---

## 2.3 Architecture frontend

### Modèle de rendu

```
┌──────────────────────────────────────────────────────────────┐
│  Page (Server Component)                                     │
│  • récupère les données (Drizzle, directement)               │
│  • génère metadata, JSON-LD, hreflang                        │
│  • streamé : <Suspense> autour des blocs non critiques        │
└───────────────┬──────────────────────────────────────────────┘
                │  props sérialisables
┌───────────────▼──────────────────────────────────────────────┐
│  Îlots client ("use client") — volontairement peu nombreux    │
│  • <BeforeAfter>       • <UploadDropzone>                    │
│  • <GalleryLightbox>   • <CheckoutWizard> (états locaux)     │
│  • <FaqAccordion>      • <RevealOnScroll> (IntersectionObs.) │
└──────────────────────────────────────────────────────────────┘
```

- **PPR (Partial Prerendering, stable dans Next 16)** activé sur les pages marketing : le shell statique est servi immédiatement, les blocs dynamiques (témoignages, stock) sont streamés.
- **`use cache`** pour les données peu volatiles (packs, FAQ, galerie) avec tags `revalidateTag('catalog')` déclenché par le back-office → un prix modifié est visible instantanément, sans rebuild.
- **Server Actions** pour toutes les mutations (formulaire de contact, wizard de commande, actions admin). Pas de REST interne inutile.
- **Routes API** réservées à ce qui ne peut pas être une Server Action : webhooks paiement, présignation d'upload, streaming de fichiers, jobs cron, santé.

### État client

Volontairement minimal :

| Besoin | Solution |
|---|---|
| Formulaire multi-étapes (wizard) | URL comme état (`/commande/[step]`) + brouillon persisté **en base** (cookie signé `ar_draft`) — pas de store global |
| Upload | état local du composant + refetch des assets |
| UI éphémère (modales, accordéons) | `useState` local |
| Cache serveur | `use cache` + `revalidateTag` |

→ **Pas de Redux, pas de Zustand, pas de TanStack Query en V1.** Le serveur est la source de vérité.

### Budget de performance (non négociable)

| Ressource | Budget par page |
|---|---|
| JS client total (gzippé) | **< 130 Ko** sur les pages marketing, **< 220 Ko** sur le wizard |
| Polices | 2 familles max, `next/font` auto-hébergé, `display: swap`, sous-ensembles `latin` + `latin-ext` (+ `arabic` pour la locale ar) |
| Images | WebP/AVIF via `next/image`, `sizes` renseigné partout, blur placeholder obligatoire, `priority` uniquement sur l'image LCP |
| Requêtes réseau bloquantes | 0 tiers (analytics différé, pas de chat en ligne) |

---

## 2.4 Architecture backend

Architecture en **trois couches**, appliquée strictement :

```
src/app/**            → couche présentation (RSC, Server Actions, Route Handlers)
        │               : validation Zod, authZ, formatting
        ▼
src/server/services/  → couche métier (orderService, pricingService, assetService,
        │               notificationService, paymentService, catalogService)
        │               : règles métier, orchestration, transactions
        ▼
src/server/repositories/ → accès données (Drizzle), requêtes réutilisables
        │
        ▼
     Postgres
```

Règles :
- Une Server Action **ne** fait jamais de requête Drizzle directe : elle appelle un service.
- Un service **ne** connaît ni `NextRequest` ni `next/headers` : il reçoit des objets typés. (Testable sans serveur.)
- Les règles de prix sont **centralisées** dans `pricingService` — jamais recalculées côté client. Le client affiche ce que le serveur a calculé.

### Modules transverses (`src/lib/`)

| Module | Responsabilité |
|---|---|
| `lib/db` | Client Drizzle (PGlite en dev, `postgres.js`/Neon en prod), schéma, migrations |
| `lib/auth` | Better Auth : config, helpers `requireUser()`, `requireAdmin()` |
| `lib/storage` | `StorageDriver` + drivers `local` / `s3`, URLs présignées PUT (upload) et GET (lecture) |
| `lib/payments` | `PaymentProvider` + registre + drivers |
| `lib/mailer` | `Mailer` + drivers `resend` / `smtp`, templates React Email localisés |
| `lib/i18n` | `next-intl` : routing, namespaces, formatage |
| `lib/seo` | Helpers metadata, hreflang, JSON-LD (Organization, Service, Product, FAQPage, BreadcrumbList) |
| `lib/jobs` | Table `jobs` + worker exécuté par cron (`/api/jobs/run`) |
| `lib/rate-limit` | Limitation par IP/session (auth, upload, checkout, contact) |
| `lib/audit` | Journal d'audit des actions sensibles |
| `lib/ids` | Références de commande lisibles (`AR-2026-0142`) + UUID internes |

---

## 2.5 Authentification & autorisation

| Décision | Détail |
|---|---|
| Bibliothèque | **Better Auth**, tables `users` / `sessions` / `accounts` / `verifications` en base |
| Méthodes V1 | Email + mot de passe (hashé, Argon2/bcrypt) ; **lien magique** pour l'espace client (le cœur de cible n'est pas à l'aise avec les mots de passe) |
| Commande sans compte | **Autorisé et encouragé.** La commande est rattachée à un `user` si connecté, sinon à `guest_email` + `access_token` (hashé) envoyé par email. Un lien « créer mon mot de passe » apparaît sur la confirmation ; à l'inscription, les commandes du même email sont **rattachées automatiquement** |
| Rôles | `client` (défaut) · `admin` · `superadmin` — en colonne `users.role`, vérifié côté serveur systématiquement |
| Sessions | Cookie `httpOnly`, `secure`, `SameSite=lax`, rotation à l'élévation de privilège, durée 30 j (utilisateur) / 8 h (admin) |
| Admin | Accès à `/admin/*` protégé par middleware (pré-filtre) **et** par une vérification de rôle dans chaque layout/action (contrôle effectif). Rate-limit renforcé sur `/admin/login` |
| V2 prévue | 2FA TOTP pour les comptes admin (optionnel au lancement) |

---

## 2.6 Stockage & upload

### Pourquoi l'upload direct est indispensable

Un original scanné peut peser 25 à 60 Mo. Faire transiter 100 photos (500 Mo) par une fonction serverless = timeouts, coûts et échecs sur une connexion tunisienne moyenne. En production, **le navigateur envoie le fichier directement au stockage objet** via une URL présignée de courte durée.

### Séquence d'upload (production)

```
┌────────┐  1. demande de présignation          ┌──────────┐
│ Client │  POST /api/uploads/presign           │  Next    │
│        │  { draftToken, filename, mime, size }│  Server  │
│        │ ───────────────────────────────────► │          │
│        │                                      │  2. authZ (draft valide, quota non atteint)
│        │                                      │  3. contrôles (mime, taille, extension)
│        │                                      │  4. création ligne `assets` (status: pending)
│        │  ◄─────────────────────────────────── │  5. URL PUT présignée (TTL 10 min, clé UUID)
│        │  { assetId, uploadUrl, key }         └──────────┘
│        │
│        │  6. PUT direct (ProgressEvent → barre de progression réelle)
│        │ ─────────────────────────────────────►  ┌────────────┐
│        │                                        │  Stockage  │
│        │  7. POST /api/uploads/complete         │  objet     │
│        │     { assetId }                        │  (privé)   │
│        │ ─────────────────────────────────────► └─────┬──────┘
│        │                                      ┌──────▼──────┐
│        │  ◄─ asset.status = ready, thumb prêt │  Next :     │
│        │                                      │  after() →  │
│        │                                      │  sharp :    │
│        │                                      │  thumb +    │
│        │                                      │  blur +     │
│        │                                      │  EXIF strip │
│        │                                      └─────────────┘
```

En **développement**, le driver `local` remplace l'étape 6 par un `POST /api/uploads/local` (stream vers `./storage/`, gitignoré). Le code client est identique : seule l'URL change, fournie par le serveur.

### Pipeline de traitement à l'ingest (`after()`)

1. Vérification des **magic bytes** (jamais se fier au `Content-Type` envoyé par le client).
2. Contrôle des dimensions (min 200 px, max 20 000 px) et du ratio de pixels.
3. **Suppression des métadonnées EXIF/IPTC** — dont la géolocalisation (confidentialité).
4. Génération : miniature 480 px WebP + blur placeholder base64 (24 px) + dimensions réelles.
5. Calcul d'un checksum SHA-256 → déduplication possible.
6. `assets.status = 'ready'`, l'UI reçoit la vignette.

> Tous les dérivés sont régénérables : **l'original n'est jamais réencodé, jamais écrasé, jamais déplacé.**

### Arborescence du stockage

```
{bucket}/
├── orders/{orderId}/
│   ├── originals/{assetId}.{ext}          # privé, immuable
│   ├── thumbs/{assetId}.webp              # 480 px, interface
│   ├── restored/{assetId}.{ext}           # livrable admin
│   └── restored/thumbs/{assetId}.webp
├── gallery/{transformationId}/
│   ├── before.webp  after.webp  before-thumb.webp  after-thumb.webp
├── avatars/{id}.webp
├── invoices/{orderId}/{invoiceId}.pdf
└── tmp/{uploadSessionId}/{uuid}.{ext}     # purge < 24 h
```

### Sécurité d'accès aux fichiers

- Bucket **privé**, listing public désactivé, chiffrement at-rest activé côté fournisseur.
- Aucun fichier dans `/public`. **Aucun.**
- Lecture via `/api/files/[assetId]` : vérification de session → l'utilisateur est-il le propriétaire de la commande, ou admin authentifié ? → puis redirection vers une URL signée **TTL 5 min** (jamais l'URL signée n'est envoyée au client à l'avance).
- Les liens de téléchargement « restauration terminée » utilisent des **jetons à usage limité** (table `download_tokens` : TTL, compteur, révoquables).
- `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` sur tous les téléchargements.

### Formats acceptés (V1)

| Format | Accepté | Note |
|---|---|---|
| JPEG / JPG | ✅ | cœur de cible |
| PNG | ✅ | |
| WebP | ✅ | |
| TIFF | ✅ | scans haute qualité — conservé tel quel |
| HEIC / HEIF | ✅ (avec réserve) | Très courant sur iPhone. Accepté à l'upload, transcodé en JPEG serveur. Nécessite `sharp` compilé avec HEIF — à valider au déploiement, sinon message clair « convertissez en JPEG depuis votre téléphone » |
| PDF | ⚠️ | Autorisé uniquement si le client envoie un album déjà numérisé en un seul fichier |
| RAW (CR2/NEF/ARW) | ❌ V1 | Redirection vers le formulaire « demande sur mesure » |

Limites : **60 Mo / fichier**, **200 fichiers / commande** (configurables en back-office).

---

## 2.7 Paiement — architecture modulaire

Exigence du brief : *« Ne hardcode aucune solution si elle n'est pas encore définie. »*

```ts
// src/lib/payments/types.ts
export interface PaymentProvider {
  /** Identifiant stable, utilisé en base et dans l'URL de webhook. */
  readonly id: string;
  readonly label: string;                       // clé i18n, pas une chaîne littérale
  readonly isOnline: boolean;                   // false => confirmation manuelle requise
  /** Crée une intention de paiement. */
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Vérifie l'authenticité du webhook et normalise l'événement. */
  parseWebhook(req: Request): Promise<PaymentEvent | null>;
  /** Optionnel : remboursement total/partiel. */
  refund?(input: RefundInput): Promise<RefundResult>;
}

export type CheckoutInput = {
  orderId: string;
  reference: string;      // AR-2026-0142
  amountMillimes: number;
  currency: 'TND';
  customer: { name: string; email: string; phone?: string };
  returnUrl: string; cancelUrl: string; locale: Locale;
};

export type CheckoutResult =
  | { kind: 'redirect'; url: string }                 // passerelle hébergée / QR / lien
  | { kind: 'instructions'; body: string; iban?: string } // virement, espèces, à la livraison
  | { kind: 'form'; url: string; fields: Record<string,string> }; // POST auto-submit

export type PaymentEvent = {
  providerRef: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  amountMillimes: number;
  receivedAt: Date;
  raw?: unknown;
};
```

**Registre** : `src/lib/payments/index.ts` expose `getPaymentProviders()` qui lit `PAYMENT_PROVIDERS=manual,konnect` (ordre = ordre d'affichage). Ajouter un provider = écrire un fichier + l'enregistrer. **Aucun import conditionnel ailleurs dans le code.**

### Drivers prévus

| Driver | Statut | Particularités marché tunisien |
|---|---|---|
| `manual` | **Actif au lancement** | Virement bancaire / espèces au dépôt / **paiement à la livraison**. Génère des instructions (RIB/IBAN), la commande passe en `awaiting_payment`, l'admin confirme manuellement. Indispensable : le paiement à la livraison reste le premier moyen de paiement en Tunisie |
| `konnect` | Prévu | Passerelle e-commerce tunisienne la plus outillée : API REST, cartes locales + internationales, liens de paiement, dashboard. Webhook signé |
| `flouci` | Prévu | Wallet mobile le plus diffusé (2 M+ utilisateurs), API REST, QR code, idéal clientèle jeune |
| `d17` | Prévu | Wallet La Poste, utile pour la clientèle non bancarisée (souvent la cible « gardien de mémoire ») |
| `edinar` | Éventuel | e-wallet La Poste |
| `stripe` | Éventuel | Uniquement si ouverture d'une entité à l'étranger ; permet les cartes internationales et la diaspora |

> ⚠️ Paymee, historiquement cité, était signalé suspendu mi-2026 — à re-vérifier au moment de l'intégration. L'architecture permet d'activer/désactiver un driver sans toucher au reste.

### Règles de conception du paiement

- Le montant **n'est jamais** pris depuis le client : recalculé serveur depuis la base au moment de `createCheckout`.
- Toute tentative de paiement crée une ligne `payments` (statut, provider, payload brut) → traçabilité totale.
- Le webhook est **idempotent** (clé d'unicité `provider + providerRef`) et vérifie la signature.
- Statut commande mis à jour **uniquement** par un événement de paiement valide ou par un admin.
- Aucune donnée de carte ne transite ni n'est stockée chez nous (redirection hébergée).

---

## 2.8 Notifications

Interface `Mailer` + templates **React Email** localisés (FR/EN/AR), envoyés via Resend en prod, Mailpit (SMTP local) en dev.

| Déclencheur | Destinataire | Contenu |
|---|---|---|
| Commande créée (paiement en ligne) | Client | Récapitulatif, référence, lien de suivi, prochaines étapes, rappel confidentialité |
| Commande créée (paiement manuel) | Client | Instructions de virement / livraison, référence à rappeler |
| Paiement confirmé | Client + Admin | Confirmation + alerte nouvelle commande |
| Changement de statut | Client | Nouveau statut, message associé, délai restant estimé |
| **Résultats prêts** | Client | Lien de téléchargement (jeton limité), durée de disponibilité |
| Photobook expédié | Client | Numéro de suivi, transporteur |
| Note interne / message | Client (si coché) | Message libre de l'admin |
| Relance brouillon abandonné (J+2) | Client | Lien de reprise du panier — uniquement si email explicite |
| Demande de contact | Admin | Notification |

**V2** : interface `SmsProvider` (SMS/WhatsApp) pour les notifications de statut — très pertinent en Tunisie où l'email est moins consulté que WhatsApp.

---

## 2.9 Jobs & tâches asynchrones

Pas de broker en V1 : une table `jobs` + une route cron.

| Job | Déclencheur | Traitement |
|---|---|---|
| `process_asset` | après upload complet | `after()` — synchrone, < 2 s (thumb + blur + EXIF strip) |
| `generate_invoice` | paiement confirmé | asynchrone via cron — PDF |
| `bundle_restored_zip` | passage au statut `ready` | asynchrone — ZIP des livrables (TTL 7 j) |
| `purge_tmp` | cron quotidien | suppression des `tmp/` de plus de 24 h |
| `enforce_retention` | cron quotidien | application de la politique de rétention (§07) |
| `draft_reminder` | cron horaire | relance panier abandonné J+2 |
| `send_email` | file d'attente | retry exponentiel, 3 tentatives |

Le worker : `POST /api/jobs/run` protégé par un secret, idempotent, verrouillé (`SELECT … FOR UPDATE SKIP LOCKED`).

---

## 2.10 Internationalisation

| Aspect | Décision |
|---|---|
| Routage | `/` = français (défaut, sans préfixe), `/en/…`, `/ar/…` — `localePrefix: 'as-needed'` |
| Langue par défaut | Détection `Accept-Language` + cookie persisté, **jamais** de redirection automatique agressive (SEO) |
| RTL | `dir="rtl"` sur `<html>` pour `ar`, via `next-intl` + mirroring Tailwind (logical properties : `ms-`/`me-`/`ps-`/`pe-`, `text-start/end`) — anticipé dès les premiers composants pour éviter une refonte |
| Copy d'interface | `messages/{fr,en,ar}.json`, namespaces : `nav`, `home`, `services`, `packs`, `gallery`, `faq`, `trust`, `checkout`, `account`, `admin`, `emails`, `seo`, `errors` |
| Contenu éditable | Tables de traduction en base (`product_translations`, `faq_translations`, …) — jamais de texte commercial dans le code |
| Nombres / dates | `Intl` via `next-intl` ; prix formatés en TND (3 décimales, virgule décimale, espace fine insécable) ; chiffres arabes optionnels pour `ar` |
| Slugs | Traduits par locale (meilleur SEO) : `/restauration-photo` ↔ `/en/photo-restoration` ↔ `/ar/...` |

**Règle** : aucun texte visible n'est écrit directement dans un composant. Chaque chaîne passe par `useTranslations()` / `getTranslations()` ou par la base.

---

## 2.11 Observabilité & exploitation

| Besoin | Solution V1 |
|---|---|
| Erreurs applicatives | Capture centralisée dans `lib/errors` + log structuré JSON ; **Sentry** en option (à activer — fortement recommandé pour un site transactionnel) |
| Logs | `console` structuré (JSON) avec `requestId` ; conservés par la plateforme |
| Analytics | **Plausible** ou **Umami** (léger, pas de cookie banner obligatoire) — différé après l'interaction |
| Supervision | `/api/health` (DB + stockage + file de jobs) appelé par un cron externe (UptimeRobot) |
| Backup | Postgres : sauvegarde quotidienne automatisée + réplication du provider. Stockage : versionnage activé sur le bucket des originaux |
| Alertes | Email admin sur : échec de job critique, quota stockage > 80 %, échec de webhook paiement |

---

## 2.12 Environnements & configuration

| Env | Usage |
|---|---|
| `local` | PGlite (fichier `.data/pg`), stockage `./storage`, mailer Mailpit, paiement `manual` |
| `preview` | Branche de prévisualisation : Postgres de staging, bucket de staging |
| `production` | Postgres managé, bucket S3 privé, Resend, providers de paiement réels |

**Toute** la configuration passe par `src/config/env.ts` validé par Zod au démarrage — l'application refuse de démarrer avec une configuration invalide plutôt que de planter à l'exécution.

Secrets : variables d'environnement de la plateforme, jamais dans le dépôt. `.env.example` documenté et maintenu.

---

## 2.13 Déploiement

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| **Vercel** + Neon/Supabase Postgres + stockage S3 | Déploiement trivial, preview par PR, CDN mondial, PPR/`use cache` natifs | Coût à l'échelle ; données hébergées hors Tunisie | **Recommandé pour le lancement** |
| **VPS / Coolify** (OVH ou hébergeur tunisien) + Postgres + MinIO | Coût fixe, données plus proches (latence Tunisie), souveraineté | À administrer (backups, TLS, mises à jour) | Recommandé en **phase 2** ou si contrainte de données locales |
| VPS en Tunisie | Latence locale, paiement en DT, proximité | Bande passante internationale parfois irrégulière pour l'admin | À étudier pour le marché purement local |

**Schéma cible (Vercel)** :

```
Utilisateur (Tunisie, mobile)
   │ HTTPS
   ▼
Cloudflare (DNS, cache, WAF de base)
   ▼
Vercel — Next.js 16 (edge : statique / node : pages + actions)
   ├──► Postgres managé (Neon / Supabase, région EU)
   ├──► Stockage objet S3 (OVH Roubaix/Gravelines, Cloudflare R2 ou Backblaze B2)
   │       └── originaux : versionnage + chiffrement at-rest
   ├──► Resend (emails transactionnels)
   └──► Konnect / Flouci / D17 (paiement)
```

> Région serveur : **Europe de l'Ouest** (Francfort/Paris) — meilleur compromis latence Tunisie ↔ services tiers. Un VPS tunisien reste possible en phase 2 si la latence ou la souveraineté devient un sujet.

---

## 2.14 Arborescence du dépôt

```
atelier-restauration/
├── docs/                          # cette documentation
├── messages/                      # copy d'interface (i18n)
│   ├── fr.json  en.json  ar.json
├── drizzle/                       # migrations SQL générées
├── scripts/                       # seed, outils, export
├── storage/                       # driver local UNIQUEMENT (gitignored)
├── .data/                         # PGlite (gitignored)
├── public/                        # uniquement AVIF/WebP du site + favicons
│   └── (aucune photo client — jamais)
└── src/
    ├── app/
    │   ├── layout.tsx  globals.css  robots.ts  sitemap.ts  not-found.tsx
    │   ├── (marketing)/[locale]/          # pages publiques → 02-sitemap
    │   ├── (shop)/[locale]/commande/      # wizard
    │   ├── (account)/[locale]/compte/     # espace client
    │   ├── admin/                         # back-office (hors i18n public)
    │   └── api/
    │       ├── uploads/presign|complete|local
    │       ├── files/[assetId]
    │       ├── payments/[provider]/webhook
    │       ├── jobs/run
    │       ├── contact
    │       └── health
    ├── components/
    │   ├── ui/            # primitives du design system
    │   ├── marketing/     # sections de pages
    │   ├── shop/          # wizard, upload, récapitulatif
    │   ├── account/
    │   └── admin/
    ├── design-system/     # tokens.css, typographie, documentation vivante
    ├── lib/               # db, auth, storage, payments, mailer, i18n, seo, jobs
    ├── server/
    │   ├── services/      # règles métier
    │   └── repositories/  # accès données
    ├── config/            # env.ts (Zod), site.ts (marque), retention.ts
    └── types/
```

---

## 2.15 Ce que cette architecture ne fait **pas** (assumé)

- Pas de scalabilité « infinie » : elle absorbe confortablement quelques centaines de commandes/mois, ce qui est l'objectif réaliste à 12-18 mois.
- Pas de traitement automatique des images : la restauration est **humaine** (c'est le positionnement). Les jobs servent la plomberie (thumbnails, ZIP, PDF, emails).
- Pas de multi-tenant, pas d'API publique, pas d'app mobile en V1.
