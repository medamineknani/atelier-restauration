# Atelier Restauration

> Site e-commerce premium de restauration, reconstruction et amélioration de photographies, avec une offre de photobooks haut de gamme.
> Marché principal : **Tunisie** · Langue principale : **français** · Architecture prête pour `en` et `ar`.

---

## Statut du projet

**PHASES 1 & 2 terminées** — analyse, architecture, sitemap, parcours, schéma de données et design system sont documentés et soumis à validation. Le développement (PHASES 3 à 6) démarre après arbitrage des décisions listées en fin de ce fichier.

---

## Documentation

| Document | Contenu |
|---|---|
| [`docs/00-analyse-et-synthese.md`](docs/00-analyse-et-synthese.md) | Lecture du business, personas, risques, décisions structurantes |
| [`docs/01-architecture-technique.md`](docs/01-architecture-technique.md) | Stack, frontend, backend, auth, stockage, upload, paiement, notifications, i18n, déploiement |
| [`docs/02-sitemap-et-seo.md`](docs/02-sitemap-et-seo.md) | Sitemap complet, slugs, metadata, JSON-LD, mots-clés, Core Web Vitals, accessibilité |
| [`docs/03-parcours-utilisateur.md`](docs/03-parcours-utilisateur.md) | Flux d'achat, upload, machine à états des commandes, règles de prix, cas limites |
| [`docs/04-schema-base-de-donnees.md`](docs/04-schema-base-de-donnees.md) | Modèle Postgres complet, énumérations, invariants, rétention |
| [`docs/05-design-system.md`](docs/05-design-system.md) | Typographie, couleurs, grille, mouvement, composants, interdits |
| [`docs/06-dashboard-admin.md`](docs/06-dashboard-admin.md) | Back-office : écrans, fichiers, catalogue, contenu, rôles |
| [`docs/07-securite-confidentialite.md`](docs/07-securite-confidentialite.md) | Menaces, parades, conformité INPDP, engagements publics |
| [`docs/08-roadmap.md`](docs/08-roadmap.md) | 7 jalons, définition de « terminé », tests, mise en production |
| [`docs/09-homepage-wireframe.md`](docs/09-homepage-wireframe.md) | Wireframe section par section (mobile + desktop) |

---

## Résumé des choix techniques

| Sujet | Choix |
|---|---|
| Framework | **Next.js 16** (App Router, RSC, Turbopack, PPR, `use cache`, Server Actions) + React 19 + TypeScript strict |
| Styles | **Tailwind CSS v4** (CSS-first `@theme`), design system en variables CSS |
| Base de données | **PostgreSQL** + **Drizzle ORM** · **PGlite** en développement (Postgres en WASM, sans Docker) |
| Authentification | **Better Auth** — email/mot de passe + lien magique, rôles `client` / `admin` / `superadmin` |
| Stockage | Interface `StorageDriver` : `local` (dev) · **S3-compatible** (prod). Bucket **privé**, upload direct par URL présignée, URLs signées de courte durée |
| Paiement | Interface `PaymentProvider` + drivers (`manual` actif au lancement, puis `konnect`, `flouci`, `d17`…). Rien de câblé en dur |
| Internationalisation | **next-intl**, `fr` sans préfixe (défaut), `/en`, `/ar` (RTL) |
| Emails | Interface `Mailer` + templates **React Email** (Resend en prod, Mailpit en dev) |
| Images | `sharp` — miniatures, blur placeholders, suppression EXIF à l'ingest |
| Tests | Vitest (unit) + Playwright (e2e) + Lighthouse CI |

### Trois règles non négociables

1. **Aucune photo client n'est jamais publique ni exposée.** Bucket privé, URLs signées, aucun fichier dans `/public`.
2. **Aucun prix n'est codé en dur.** Tout prix, pack, extra, FAQ, témoignage et transformation vit en base de données et se modifie dans le back-office, sans redéploiement.
3. **Aucun texte visible n'est écrit dans un composant.** Copy d'interface → fichiers de traduction ; contenu commercial → tables de traduction en base.

---

## Démarrer (développement)

> Le socle applicatif n'est pas encore généré (PHASE 3). Cette section sera complétée au jalon M0.

Prérequis : **Node 22+** et **npm 10+**. Aucune base de données ni Docker requis en local : PGlite fournit un Postgres embarqué.

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:3000
```

---

## Décisions en attente de validation

Voir la section « Questions ouvertes » du document de synthèse, et les arbitrages à confirmer avant le jalon M0 :

- nom définitif de la marque ;
- provider(s) de paiement à connecter en premier ;
- hébergeur et stockage cibles ;
- tarifs des trois extras numériques (proposés : 4 / 25 / 15 DT).
