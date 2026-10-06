# 04 — Schéma de base de données

> **PHASE 2** — Modèle de données. Postgres + Drizzle ORM.
> Convention : `snake_case` en base, `camelCase` en TypeScript (mapping Drizzle).

---

## 5.1 Conventions

| Décision | Règle |
|---|---|
| Clés primaires | `uuid` générés par l'application (`gen_random_uuid()` par défaut en base) — non devinables, nécessaires pour des fichiers privés |
| Horodatages | `timestamptz` partout, `created_at` / `updated_at` systématiques |
| Argent | `integer` **en millimes** (`99000` = 99,000 DT). Jamais de flottant |
| Suppression | **Jamais de `DELETE` physique** sur les données métier : `deleted_at` (soft delete) + purge différée |
| Textes traduisibles | Tables de traduction dédiées (`*_translations`) avec PK composite `(entity_id, locale)` |
| Références lisibles | `orders.reference` (`AR-2026-0142`) générée par séquence annuelle, unique, **jamais** utilisée comme clé d'URL d'admin |
| Audit | `audit_logs` pour toute action sensible (accès fichier, changement de statut, suppression) |

---

## 5.2 Énumérations

```sql
CREATE TYPE user_role          AS ENUM ('client', 'admin', 'superadmin');
CREATE TYPE order_status       AS ENUM ('draft','awaiting_payment','received','processing',
                                        'restoring','checking','ready','shipped','completed',
                                        'on_hold','cancelled','refunded');
CREATE TYPE order_kind         AS ENUM ('digital','photobook','extra');
CREATE TYPE product_kind       AS ENUM ('pack','extra');
CREATE TYPE product_family     AS ENUM ('digital','photobook');
CREATE TYPE extra_pricing_mode AS ENUM ('flat','per_photo','per_page','per_copy');
CREATE TYPE asset_kind         AS ENUM ('original','restored','gallery_before','gallery_after',
                                        'avatar','invoice','preview');
CREATE TYPE asset_status       AS ENUM ('pending','processing','ready','failed','deleted');
CREATE TYPE payment_status     AS ENUM ('pending','succeeded','failed','refunded','partially_refunded');
CREATE TYPE job_status         AS ENUM ('queued','running','done','failed');
CREATE TYPE locale_code        AS ENUM ('fr','en','ar');
```

---

## 5.3 Table par table

### 5.3.1 Authentification & comptes

**`users`**
| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | citext unique | contrainte d'unicité en minuscules |
| `email_verified` | bool | défaut `false` |
| `name` | text | |
| `phone` | text nullable | format tunisien normalisé (+216) |
| `password_hash` | text nullable | null si compte créé en lien magique seul |
| `role` | user_role | défaut `client` |
| `preferred_locale` | locale_code | défaut `fr` |
| `notify_email` / `notify_sms` | bool | défaut `true` / `false` |
| `last_login_at` | timestamptz nullable | |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | |

**`sessions`** · **`accounts`** (OAuth futur) · **`verifications`** (liens magiques, reset) — tables standards Better Auth, avec `user_id FK ON DELETE CASCADE`.

**`addresses`** — adresses de livraison réutilisables.
`id`, `user_id` FK, `label`, `line1`, `line2`, `city`, `governorate` (enum texte : 24 gouvernorats), `postal_code`, `country` (défaut `TN`), `is_default`, horodatages.

### 5.3.2 Catalogue (éditable en back-office)

**`product_categories`**
`id`, `slug` unique, `family` (product_family), `sort_order`, `is_active`.

> Exemples : `restauration-numerique`, `photobooks`, `extras-numeriques`, `extras-photobook`.

**`products`** — packs **et** extras dans une seule table (même cycle de vie, même admin).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | `basic`, `premium`, `complete`, `classic`, `wedding-revival`, `heritage-premium`, `extra-photo`, … |
| `kind` | product_kind | `pack` \| `extra` |
| `family` | product_family | `digital` \| `photobook` |
| `category_id` | uuid FK nullable | |
| `price_millimes` | integer not null | **prix de référence, modifiable** |
| `currency` | char(3) | défaut `TND` |
| `photos_included` | integer nullable | `20`, `50`, `100` ; `null` pour un extra |
| `photos_min` / `photos_max` | integer nullable | pour les photobooks (30-40, 50-80, 80-120) |
| `pages_included` | integer nullable | photobook (`null` si non pertinent) |
| `turnaround_days_min` / `turnaround_days_max` | integer | délai estimatif affiché |
| `extra_photos_granted` | integer | pour l'extra « photo supplémentaire » : `1` |
| `extra_pages_granted` | integer | `4` ou `8` |
| `pricing_mode` | extra_pricing_mode | `flat` pour les packs |
| `max_quantity` | integer nullable | limite de sélection d'un extra |
| `requires_shipping` | bool | `true` pour les photobooks |
| `is_active` | bool | retrait commercial sans suppression |
| `is_featured` | bool | badge « Le plus choisi » |
| `sort_order` | integer | |
| horodatages + `deleted_at` | | |

**`product_translations`** — PK composite `(product_id, locale)`
`name`, `tagline` (courte), `description` (texte riche Markdown léger), `features` (jsonb : liste de puces), `seo_title`, `seo_description`, `cta_label`.

**`product_extras`** — quels extras sont proposés avec quel pack.
`(pack_id, extra_id)` PK composite, `sort_order`, `is_recommended`.

**`price_history`** — traçabilité.
`id`, `product_id`, `old_price_millimes`, `new_price_millimes`, `changed_by` (user id), `reason`, `created_at`.

**`settings`** — configuration commerciale éditable.
`key` PK (`shipping_flat_millimes`, `retention_originals_days`, `retention_restored_days`, `max_file_size_bytes`, `max_files_per_order`, `contact_phone`, `whatsapp_number`, `brand_name`, …), `value` jsonb, `updated_by`, `updated_at`.

### 5.3.3 Commandes

**`orders`**

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `reference` | text unique | `AR-2026-0142` |
| `user_id` | uuid FK nullable | null = commande invité |
| `guest_email` | citext nullable | |
| `guest_access_token_hash` | text nullable | accès sans compte (hashé, jamais stocké en clair) |
| `kind` | order_kind | `digital` \| `photobook` \| `extra` |
| `status` | order_status | défaut `draft` |
| `locale` | locale_code | langue de la commande (pour les emails) |
| `currency` | char(3) | défaut `TND` |
| `subtotal_millimes` | integer | pack + extras |
| `shipping_millimes` | integer | défaut 0 |
| `discount_millimes` | integer | défaut 0 |
| `total_millimes` | integer | |
| `photos_quota` | integer | quota recalculé (pack + extras) |
| `photos_count` | integer | nb réel d'originaux uploadés (dénormalisé, maintenu par trigger/service) |
| `estimated_ready_at` | date nullable | calculé à la confirmation |
| `customer_snapshot` | jsonb | **fige** nom, téléphone, email, adresse au moment de la commande (traçabilité, même si le client modifie son profil) |
| `customer_notes` | text nullable | instructions du client |
| `internal_notes` | text nullable | notes admin (doublon léger avec `order_notes`, pour l'affichage rapide) |
| `shipping_carrier` / `shipping_tracking` | text nullable | photobook |
| `draft_expires_at` | timestamptz nullable | purge des brouillons à 30 j |
| `submitted_at` / `paid_at` / `completed_at` | timestamptz nullable | |
| horodatages + `deleted_at` | | |

Index : `(status, created_at desc)`, `(user_id, created_at desc)`, `(guest_email)`, `unique(reference)`.

**`order_items`** — le snapshot tarifaire.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK | |
| `product_id` | uuid FK | |
| `item_type` | product_kind | `pack` \| `extra` |
| `name_snapshot` | text | nom **au moment de la commande** |
| `unit_price_millimes` | integer | prix **figé** |
| `quantity` | integer | `1` pour un pack, N pour « photo supplémentaire ×3 » |
| `total_millimes` | integer | |
| `meta` | jsonb | `photos_granted`, `pages_granted`, détails du pack |

Index : `(order_id)`.

**`order_status_events`** — la timeline.

`id`, `order_id` FK, `from_status` (nullable), `to_status`, `message` (texte client optionnel), `visible_to_client` bool, `actor_id` (user FK nullable — null = système), `created_at`.
Index : `(order_id, created_at)`.

**`order_notes`** — notes internes + messages client.
`id`, `order_id`, `author_id`, `body`, `is_internal` bool, `created_at`.

### 5.3.4 Fichiers

**`assets`** — **la table la plus sensible.**

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | sert de nom de fichier dans le stockage |
| `order_id` | uuid FK nullable | null pour galerie/avatars |
| `transformation_id` | uuid FK nullable | pour les images de galerie |
| `uploaded_by` | uuid FK nullable | user (client ou admin) |
| `kind` | asset_kind | `original` \| `restored` \| `gallery_before` \| … |
| `status` | asset_status | `pending` → `ready` |
| `storage_driver` | text | `local` \| `s3` (permet une migration progressive) |
| `storage_bucket` | text | |
| `storage_key` | text | chemin complet, **jamais exposé** |
| `original_filename` | text | nom d'origine, pour l'affichage uniquement (jamais utilisé comme chemin) |
| `mime_type` | text | validé par magic bytes |
| `size_bytes` | integer | |
| `width` / `height` | integer nullable | |
| `checksum_sha256` | text | déduplication + intégrité |
| `thumb_key` | text nullable | miniature 480 px WebP |
| `blur_placeholder` | text nullable | base64 24 px |
| `exif_stripped` | bool | preuve de la suppression des métadonnées |
| `position` | integer | ordre d'affichage |
| `paired_asset_id` | uuid FK nullable | original ↔ restauré |
| `released_at` | timestamptz nullable | date de mise à disposition du livrable |
| `retain_until` | timestamptz nullable | purge planifiée (politique de rétention) |
| `created_at` / `deleted_at` | | |

Index : `(order_id, kind, position)`, `(checksum_sha256)`, `(retain_until)`.

**`download_tokens`** — liens de téléchargement à usage limité.
`id`, `order_id`, `asset_id` nullable (null = ZIP complet), `token_hash`, `expires_at`, `max_downloads`, `download_count`, `revoked_at`, `created_at`.

**`upload_sessions`** — groupe d'uploads d'un brouillon (utile pour le nettoyage des `tmp/`).
`id`, `order_id`, `created_at`, `expires_at`.

### 5.3.5 Paiements & factures

**`payments`**
`id`, `order_id` FK, `provider` (text : `manual`, `konnect`, …), `provider_ref` (text nullable), `status` (payment_status), `amount_millimes`, `currency`, `raw_payload` jsonb, `failure_reason` text nullable, `confirmed_by` (user FK nullable — admin pour le manuel), `created_at`, `updated_at`.
**Contrainte** : `UNIQUE (provider, provider_ref)` → idempotence des webhooks.
Index : `(order_id)`.

**`invoices`**
`id`, `order_id`, `number` unique (`F-2026-0142`), `amount_millimes`, `vat_millimes`, `issued_at`, `pdf_asset_id` FK nullable, `snapshot` jsonb (fige le détail au moment de l'émission).

### 5.3.6 Contenu du site (éditable)

**`transformations`** (galerie avant/après)
`id`, `slug` unique, `category` (`mariage`, `famille`, `enfance`, `portrait`, `nb`, `tres-endommage`, `basse-resolution`), `before_asset_id` FK, `after_asset_id` FK, `is_featured`, `is_published`, `sort_order`, `duration_label`, horodatages.

**`transformation_translations`** — `(transformation_id, locale)` : `title`, `work_description` (ce qui a été fait), `alt_before`, `alt_after`.

**`testimonials`**
`id`, `author_name`, `author_location` (ville), `author_context` (« Photos de mariage de ses grands-parents »), `rating` (1-5, nullable), `avatar_asset_id` nullable, `is_approved`, `is_featured`, `source`, `sort_order`, horodatages.

**`testimonial_translations`** — `(testimonial_id, locale)` : `quote`.

**`faq_items`**
`id`, `category` (`service`, `prix`, `upload`, `confidentialite`, `livraison`, `qualite`), `sort_order`, `is_published`.

**`faq_translations`** — `(faq_id, locale)` : `question`, `answer` (Markdown léger).

**`page_blocks`** — blocs éditoriaux éditables par page sans redéploiement.
`id`, `page_key` (`home.hero`, `home.trust`, `about.story`, …), `block_key`, `sort_order`, `data` jsonb.

**`page_block_translations`** — `(page_block_id, locale)` : `content` jsonb.

### 5.3.7 Technique

**`jobs`**
`id`, `type` (text), `payload` jsonb, `status` (job_status), `attempts` int (défaut 0), `max_attempts` int (défaut 3), `run_after` timestamptz, `locked_at` nullable, `last_error` text nullable, `created_at`, `completed_at`.
Index : `(status, run_after)`.

**`audit_logs`**
`id`, `actor_id` (user nullable), `actor_role`, `action` (`order.status_changed`, `asset.downloaded`, `asset.deleted`, `product.price_updated`, `admin.login`, …), `entity_type`, `entity_id`, `metadata` jsonb, `ip` inet, `user_agent` text, `created_at`.
Index : `(entity_type, entity_id, created_at desc)`, `(actor_id, created_at desc)`.

**`rate_limits`** — compteurs (ou Redis si disponible).
`key` PK, `count`, `window_start`.

**`contact_requests`** et **`quote_requests`**
`id`, `name`, `email`, `phone`, `message`, `source_page`, `locale`, `status` (`new`/`handled`), `handled_by`, horodatages.

---

## 5.4 Diagramme relationnel (simplifié)

```
users ─┬─< sessions                    products ──< product_translations
       ├─< addresses                       ├──< product_extras >── products (extras)
       ├─< orders ──┬─< order_items >── products      └──< price_history
       │            ├─< order_status_events
       │            ├─< order_notes
       │            ├─< assets >── (self) paired_asset_id
       │            ├─< download_tokens
       │            ├─< payments
       │            ├─< invoices
       │            └─< upload_sessions
       └─< audit_logs

transformations ──< transformation_translations
                └──< assets (before / after / thumbs)

testimonials ──< testimonial_translations
faq_items    ──< faq_translations
page_blocks  ──< page_block_translations
```

---

## 5.5 Invariants à garantir en base

1. Une commande contient **au plus un** `order_item` de type `pack` (contrainte partielle unique).
2. `orders.total_millimes` = somme des `order_items.total_millimes` + `shipping` − `discount` (vérifié par test, et par un trigger optionnel).
3. `assets.storage_key` **unique** — deux commandes ne partagent jamais un chemin.
4. Aucun `asset` de `kind = 'original'` ne peut passer à `status='deleted'` sans ligne correspondante dans `audit_logs` (contrôle applicatif + test).
5. `orders.reference` et `invoices.number` sont générés par séquence **sans trou garanti** (transaction dédiée).
6. `products.price_millimes ≥ 0` et `photos_included ≥ 0`.
7. Une session admin (`users.role IN ('admin','superadmin')`) expire après 8 h (contrôle applicatif).

---

## 5.6 Migrations, seed et sauvegarde

| Sujet | Décision |
|---|---|
| Outil | `drizzle-kit generate` → SQL versionné dans `drizzle/`, appliqué par `drizzle-kit migrate` |
| Règle | Toute migration doit être **rétro-compatible** (ajout de colonne nullable, jamais de `DROP` immédiat) — déploiement sans interruption |
| Seed | `scripts/seed.ts` : les 3 packs numériques, 3 photobooks, 6 extras, FAQ de départ, catégories, settings par défaut, 1 compte superadmin (email depuis l'env) |
| Sauvegarde | Dump quotidien automatisé (provider) + réplication ; test de restauration **une fois par mois** (procédure documentée) |
| Environnements | `local` (PGlite, fichier `.data/pg`) · `staging` · `production` |

---

## 5.7 Politique de rétention (implémentée par `enforce_retention`)

| Donnée | Durée | Action |
|---|---|---|
| Fichiers `tmp/` | 24 h | suppression |
| Brouillons (`draft`) inactifs | 30 j | purge + fichiers associés |
| **Originaux clients** | **90 j après `completed`** | suppression (configurable) — avec email de prévenance à J-7 |
| Fichiers restaurés | **12 mois après `completed`** | suppression ; le client est prévenu à J-30 et J-7 |
| Factures (PDF) | 10 ans | obligation comptable |
| Données de commande (sans fichiers) | 10 ans | obligation comptable |
| Logs d'audit | 24 mois | |
| Compte inactif | 36 mois | suppression ou anonymisation, après relance |

Toute suppression est **logique** (`deleted_at`) puis **physique** après un délai de grâce de 7 jours, et toujours tracée dans `audit_logs`.
