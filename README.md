# Atelier Restauration

> Site e-commerce premium de restauration, reconstruction et amélioration de photographies, avec une offre de photobooks haut de gamme.
> Marché principal : **Tunisie** · Langue principale : **français** · Architecture prête pour `en` et `ar`.

---

## Statut du projet

**PHASES 1 & 2 terminées** — analyse, architecture, sitemap, parcours, schéma de
données et design system sont documentés et validés.

**Jalons livrés**

| Jalon | Contenu                                                     | État      |
| ----- | ----------------------------------------------------------- | --------- |
| M0    | Socle : schéma, migrations, seed, stockage, emails, i18n     | ✔ livré   |
| M1    | Site public : 11 sections d'accueil, services, tarifs, FAQ   | ✔ livré   |
| M2    | Tunnel de commande en 7 étapes + confirmation et suivi invité| ✔ livré   |
| M3    | Espace client : lien magique, suivi, résultats, factures     | ✔ livré   |
| M4-a  | Back-office : file de production, écran de commande, catalogue | ✔ livré   |
| M4-b  | Back-office : contenu, paramètres, équipe                     | ☐ en cours |
| M5    | Paiement en ligne (Konnect / Flouci / D17)                   | ☐ à venir |
| M6    | Qualification : tests, accessibilité, performance, SEO       | ☐ à venir |

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

Prérequis : **Node 22+** et **npm 10+**. Aucune base de données ni Docker requis
en local : PGlite fournit un Postgres embarqué, sans serveur à installer.

```bash
npm install
cp .env.example .env.local          # facultatif : les défauts suffisent en local
npm run db:migrate                  # schéma (Postgres embarqué dans .data/pg)
npm run db:seed                     # catalogue, FAQ, témoignages, réglages
npm run gallery                     # paires avant/après (depuis assets/sources)
npm run dev                         # http://localhost:3000
```

Le seed crée un compte administrateur : `admin@atelier-restauration.tn` /
`changeme-please` (surchargeable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### Scripts utiles

| Commande                | Rôle                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `npm run typecheck`     | Types TypeScript, sans émettre                             |
| `npm run lint`          | ESLint (configuration Next, format « flat config »)        |
| `npm run test`          | Tests unitaires (Vitest)                                   |
| `npm run db:generate`   | Génère une migration après modification du schéma          |
| `npm run db:reset`      | Repart de zéro : base + stockage, puis migre et sème       |
| `npm run gallery`       | Reconstruit les paires avant/après de la galerie           |
| `npm run e2e`           | Parcours de commande complet, sans navigateur           |
| `npm run e2e:compte`    | Espace client : lien magique, rattachement, facture...  |

### Deux précautions locales

1. **PGlite est mono-processus.** Arrêtez `npm run dev` avant `npm run db:seed`
   ou `npm run db:migrate` : deux instances sur le même répertoire se marchent
   dessus. Si la base refuse de démarrer, supprimez `.data/pg/postmaster.pid`,
   ou repartez de `npm run db:reset`.
2. **Les fichiers ne vont jamais dans un répertoire nommé `storage/`.** Ce nom
   est exclu des sauvegardes d'environnement sur plusieurs hébergeurs : son
   contenu disparaît silencieusement. Le stockage local est donc dans
   `.data/files` (`STORAGE_LOCAL_DIR`) et les images sources, versionnées, dans
   `assets/sources`.

### Tunnel de commande

Les sept étapes vivent sous `/commande` : service, pack, options, photos,
coordonnées, récapitulatif, puis confirmation et suivi. Le brouillon est
identifié par un cookie signé (`ar_draft`), jamais par un identifiant devinable.

`scripts/e2e-checkout.py` rejoue ce parcours **sans JavaScript** — c'est
aussi un test d'amélioration progressive : si le tunnel cesse de fonctionner
sans JS, le script échoue.

### Espace client

L'entrée se fait par **lien magique** : pas de mot de passe à inventer pour
suivre une commande. Le compte est créé à la première demande de lien, et les
commandes passées en invité avec la même adresse sont rattachées
automatiquement — c'est le point le plus fragile du dispositif, donc le premier
que `scripts/e2e-compte.py` vérifie.

| Route                                    | Rôle                                     |
| ---------------------------------------- | ---------------------------------------- |
| `/connexion`                             | Lien magique (+ mot de passe en repli)    |
| `/connexion/lien?t=…`                    | Consommation du lien, ouverture de session |
| `/compte`                                | Tableau de bord : en cours, prêtes        |
| `/compte/commandes`                      | Toutes les commandes                      |
| `/compte/commandes/[reference]`           | Suivi, photos, résultats, messages, facture |
| `/compte/parametres`                     | Identité, langue, notifications, suppression |

Deux routes privées servent les documents, en lecture seule et après contrôle
du propriétaire :

- `GET /api/compte/commandes/[reference]/facture` — facture HTML imprimable,
  numérotée une seule fois puis figée ;
- `GET /api/compte/commandes/[reference]/resultats` — archive ZIP des
  photographies restaurées, reconstruite à la volée (rien n'est stocké).

En développement, `POST /api/dev/order` fait avancer une commande et dépose des
fichiers restaurés : de quoi vérifier ces deux routes sans jouer l'atelier à la
main. Neutralisée en production (404).

### Back-office

Accessible en `/admin`, en français, hors du site public. L'accès est vérifié
dans la coque du groupe de routes : un compte **client valide n'ouvre jamais
l'administration**, même en tapant l'URL. Un seul compte est créé par le seed
(`admin@atelier-restauration.tn`), surchargeable par `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`.

| Route                     | Rôle                                                  |
| ------------------------- | ----------------------------------------------------- |
| `/admin`                  | File de production, répartition, indicateurs          |
| `/admin/commandes`        | Liste filtrable (statut, type, recherche, retard)     |
| `/admin/commandes/[id]`   | ★ L'écran principal : six onglets, une seule page      |
| `/admin/clients`          | Fiches, historique, commandes invitées non rattachées |
| `/admin/catalogue`        | Packs et options — **prix éditables sans redéploiement** |
| `/admin/journal`          | Journal d'audit, lecture seule                        |

Trois règles tiennent l'ensemble :

1. **Une commande, un écran.** Client, fichiers, statut, notes, facture et
   journal sont dans `/admin/commandes/[id]`. L'opérateur ne navigue pas.
2. **Le statut ne s'invente pas.** Seules les transitions autorisées par la
   machine à états sont proposées ; une transition refusée s'affiche en
   message, jamais en erreur 500.
3. **Rien ne s'efface sans trace.** Chaque dépôt, téléchargement d'original,
   changement de prix et changement de statut est journalisé.

Le prix d'un produit est saisi en dinars et enregistré en millimes. Il est
visible sur le site dès l'enregistrement, et son historique garde qui a changé
quoi, quand, et pourquoi. **Un prix modifié ne change jamais celui d'une
commande déjà passée** : chaque ligne de commande porte son propre cliché.

`npm run e2e:admin` vérifie le parcours complet — connexion, changement de
statut, dépôt et publication des résultats, facture, journal — ainsi que la
frontière client ↔ administration.

---

## Décisions en attente de validation

Voir la section « Questions ouvertes » du document de synthèse, et les arbitrages à confirmer avant le jalon M0 :

- nom définitif de la marque ;
- provider(s) de paiement à connecter en premier ;
- hébergeur et stockage cibles ;
- tarifs des trois extras numériques (proposés : 4 / 25 / 15 DT).
