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
| M4-b  | Back-office : contenu, paramètres, équipe                     | ✔ livré   |
| M5    | Paiement à la livraison (contre-remboursement)                | ✔ livré   |
| M6    | Qualification : tests, accessibilité, performance, SEO       | ◐ en cours |

Le paiement en ligne (Konnect, Flouci, D17) n'est pas entrepris : le marché
tunisien reste majoritairement au paiement à la livraison et au virement, et
l'abstraction est déjà en place pour l'ajouter sans toucher au tunnel.

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
npm run gallery                     # paires avant/après (depuis assets/sources)
npm run db:seed                     # catalogue, FAQ, témoignages, galerie, réglages
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
| `npm run test:watch`    | Tests unitaires, relancés à chaque enregistrement          |
| `npm run db:generate`   | Génère une migration après modification du schéma          |
| `npm run gallery`       | Reconstruit les paires avant/après de la galerie           |
| `npm run db:reset`      | Repart de zéro : base + stockage, puis migre et sème       |
| `npm run e2e`           | Parcours de commande complet, sans navigateur           |
| `npm run e2e:compte`    | Espace client : lien magique, rattachement, facture...  |
| `npm run e2e:admin`     | Back-office : commande, catalogue, contenu, réglages    |
| `npm run e2e:cod`       | Paiement à la livraison : éligibilité, encaissement     |
| `npm run e2e:seo`       | Référencement : plan du site, balises, liens, JSON-LD   |
| `npm run e2e:all`       | Les quatre parcours, à la suite                         |

### Trois précautions locales

1. **PGlite est mono-processus.** Arrêtez `npm run dev` avant
   `npm run db:seed` ou `npm run db:migrate` : deux instances sur le même
   répertoire le corrompent, et chaque requête échoue alors avec
   `RuntimeError: Aborted()`. Le seul remède est `npm run db:reset`, qui
   reconstruit schéma, galerie et données de départ.

   Un arrêt normal (Ctrl-C, `SIGTERM`) ne perd rien : le serveur ferme la base
   avant de s'éteindre, et les commandes, les clients et les réglages sont
   relus tels quels au démarrage suivant. Seul un arrêt forcé — `kill -9`, ou
   un processus tué par manque de mémoire — laisse le répertoire
   irrécupérable ; supprimer `postmaster.pid` ne sert à rien dans ce cas.

   Attention aux faux positifs : une page peut répondre `200` alors que la base
   est morte, parce que certaines lectures sont rattrapées par un `try/catch`
   et remplacées par des valeurs par défaut. Pour savoir si elle vit
   réellement, vérifiez qu'un contenu semé s'affiche — les prix sur `/tarifs`,
   les légendes sur `/galerie` — plutôt que le seul code HTTP.
2. **`npm run gallery` avant `npm run db:seed`.** La galerie fabrique les
   images puis un `manifest.json` que le seed lit pour créer les fiches.
   Semer avant de construire la galerie donne un site qui fonctionne, avec
   une page « Galerie » vide.
3. **Les fichiers ne vont jamais dans un répertoire nommé `storage/`.** Ce nom
   est exclu des sauvegardes d'environnement sur plusieurs hébergeurs : son
   contenu disparaît silencieusement. Le stockage local est donc dans
   `.data/files` (`STORAGE_LOCAL_DIR`) et les images sources, versionnées, dans
   `assets/sources`.

PGlite émet parfois `Unhandled Rejection: RuntimeError: Aborted()` dans les
journaux du serveur de développement, à l'arrêt d'une requête. C'est un bruit
connu de l'émulateur WASM, pas une erreur applicative : la requête répond
normalement et aucun travail n'est perdu.

### Tests unitaires

`npm run test` lance Vitest sur les fichiers `src/**/*.test.ts`. Aucune base,
aucun réseau : seules les fonctions pures sont couvertes — le calcul des
montants, le formatage des prix et les délais. `npm run test:watch` relance à
chaque enregistrement.

Le module `server-only`, fourni par Next et absent hors de Next, est remplacé
par un module vide dans `vitest.config.ts` : dans un test Node, tout est
serveur.

### Accessibilité

Le socle est conforme à WCAG 2.2 niveau AA sur les points mesurables sans
navigateur, et ces points sont verrouillés par des tests.

- **Contrastes.** `src/design-system/contrast.test.ts` relit la palette dans
  `theme.css` et vérifie chaque couple texte/fond réellement employé : 4,5:1
  pour le texte, 3:1 pour les éléments non textuels. Changer une teinte sans
  tenir les seuils fait échouer la suite. Trois teintes ont été assombries à
  cette occasion (`muted`, `warning`, `champagne-deep`).
- **Contour de focus.** Aucune couleur unique ne tient 3:1 à la fois sur le
  papier et sur l'encre : le contour est une variable CSS (`--focus-ring`),
  champagne profond par défaut et champagne clair sur les surfaces sombres.
- **Structure.** Un seul `h1` par page et aucun saut de niveau, vérifié page
  par page sur le site public. Les repères `header` / `nav` / `main#contenu` /
  `footer` sont posés, avec un lien d'évitement et des `nav` nommés.
- **Clavier.** Les zones de dépôt de fichiers sont de vrais boutons ou des
  `role="button"` avec gestion d'`Entrée` et d'`Espace` ; le champ de fichier
  masqué est retiré de l'ordre de tabulation pour ne pas doubler l'arrêt.
- **Images.** Aucune balise sans `alt`. Les deux `alt=""` du projet sont
  décoratifs et doublés d'un `aria-hidden`.

Restent à auditer avec un lecteur d'écran réel et un navigateur : les messages
d'erreur de formulaire (annonce et rattachement aux champs), les régions
`aria-live` pendant les téléversements, et le parcours complet au clavier.

### Performance

Mesuré sur un build de production (`npm run build && npm run start`), les
chiffres du mode développement n'étant pas représentatifs.

| Poste                        | Accueil            |
| ---------------------------- | ------------------ |
| HTML                         | 26 Kio             |
| Feuille de style             | 11 Kio             |
| Javascript (React + Next)    | 183 Kio            |
| Images chargées d'emblée     | 20 Kio             |
| Images en différé            | 501 Kio            |

Dépendances volontairement réduites à React, Next, Drizzle, Zod et Sharp :
ni librairie d'animation, ni librairie de dates, ni kit d'interface. Les
183 Kio de Javascript sont donc pour l'essentiel le socle React et Next.

Les images passent par l'optimiseur de Next, en AVIF puis WebP : 23 Kio
au lieu de 47 Kio en JPEG à largeur égale. Les fichiers originaux sont servis
avec `max-age=31536000, immutable`, et les images optimisées avec un cache
d'un an. Une seule image est chargée d'emblée — celle de l'accueil, en
`priority` — les treize autres sont différées.

**Le poids des polices a été divisé par deux sur le chemin critique.** Les
trois fichiers étaient préchargés, soit 343 Kio, dont 150 Kio d'italique pour
les seules citations des témoignages. L'italique est désormais déclaré à part
et non préchargé : 189 Kio au démarrage, et l'italique n'arrive qu'en
atteignant la citation. Il faut le nommer explicitement, sinon le navigateur
se contente de pencher le romain.

### Référencement

`npm run e2e:seo` parcourt le site comme le ferait un moteur et vérifie : le
plan du site (toutes les URL répondent, aucune date de modification
uniforme), l'exclusion du back-office et de l'espace client dans
`robots.txt`, l'absence de lien interne cassé, un titre et une description
propres à chaque page, un `canonical` qui se réfère à la page elle-même, la
présence de `hreflang` dont `x-default`, et des données structurées en JSON
valide.

Deux choses trouvées et corrigées ainsi :

- Le plan du site datait les 52 URL de l'heure du build. Tout paraissait neuf
  à chaque déploiement, ce qui pousse les moteurs à tout réexplorer et rend
  la date inopérante. Les pages éditoriales n'ont plus de date, et les fiches
  galerie portent leur date réelle.
- `/contact` et `/devis` partageaient la même description : deux pages qui se
  disputaient la même requête sans que le moteur puisse les départager.

Les longueurs de titres et de descriptions sont rapportées sans faire échouer
la suite, parce que c'est de la rédaction. À reprendre, les plus éloignées du
compte :

| Page                        | Ce qui dépasse                    |
| --------------------------- | --------------------------------- |
| `/`                         | titre de 90 caractères            |
| `/restauration-photo`       | titre de 76                       |
| `/confidentialite`          | titre de 71                       |
| `/politique-confidentialite`| description de 223                |
| `/galerie/medina-1957`      | description de 199                |
| `/conditions-vente`         | description de 197                |
| `/photobooks`               | description de 184                |
| `/tarifs`                   | description de 54                 |

### Tunnel de commande

Les sept étapes vivent sous `/commande` : service, pack, options, photos,
coordonnées, récapitulatif, puis confirmation et suivi. Le brouillon est
identifié par un cookie signé (`ar_draft`), jamais par un identifiant devinable.

`scripts/e2e-checkout.py` rejoue ce parcours **sans JavaScript** — c'est
aussi un test d'amélioration progressive : si le tunnel cesse de fonctionner
sans JS, le script échoue.

Le référencement est servi par `/sitemap.xml` et `/robots.txt`, générés à la
demande : pages éditoriales, fiches galerie publiées et pages photobooks, avec
`hreflang` `fr-TN` / `en-GB` et `x-default`. Le back-office, l'espace client,
le tunnel de commande et l'API sont exclus de l'indexation.

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
| `/admin/contenu`          | Hub : FAQ, témoignages, galerie, demandes reçues      |
| `/admin/parametres`       | Marque, commercial, paiement, stockage, notifications, équipe |
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
statut, dépôt et publication des résultats, facture, journal, contenu,
réglages — ainsi que la frontière client ↔ administration.

### Réglages

`/admin/parametres` réunit six sections. Trois sont ouvertes à tout
administrateur — marque et coordonnées, commercial, notifications. Trois sont
réservées au superadministrateur — paiement, stockage, équipe — parce qu'une
erreur là ne coûte pas une page, elle coûte l'encaissement ou les fichiers.

Le refus est appliqué **côté serveur**, et pas seulement en masquant le
formulaire : le script e2e rejoue un appel avec un identifiant d'action volé
à la session du superadministrateur, et vérifie qu'il échoue.

Quelques choix qui se défendent :

- **Les secrets ne sont jamais dans la base.** Les clés d'API sont affichées
  masquées (`sk_live_••••8f2`) avec le nom de la variable d'environnement
  attendue, jamais saisissables depuis un écran web. Une clé entrée dans un
  formulaire finit dans un export, un ticket ou un historique de navigateur.
- **Le pilote de stockage ne se change pas depuis l'écran.** Pointer le
  stockage vers un autre bucket par erreur rendrait tous les originaux
  introuvables d'un coup.
- **On ne se rétrograde ni ne se désactive soi-même.** C'est le piège classique
  qui laisse une installation sans superadministrateur.
- **Un compte désactivé n'est pas supprimé.** Ses commandes, ses notes et ses
  entrées de journal restent lisibles et cohérentes.

Les coordonnées de marque alimentent le pied de page, la page Contact, la
facture, la signature des emails et les données structurées : ce que l'atelier
saisit est ce que le site affiche, et ce que les moteurs lisent.

### Paiement à la livraison

Le contre-remboursement n'est pas une variante du virement : c'est le seul
moyen de règlement où l'atelier **avance le travail avant d'être payé**. Trois
conséquences, toutes vérifiées par `npm run e2e:cod` :

1. **Il n'est proposé que là où un colis sera livré.** Sans expédition, il n'y
   a rien contre quoi remettre l'argent. Le contrôle est serveur : forcer le
   champ ne passe pas.
2. **La commande démarre aussitôt.** Elle entre directement en production au
   lieu d'attendre dans « en attente de paiement » — il n'y a rien à attendre.
3. **`paidAt` reste vide jusqu'à l'encaissement.** La date de paiement est
   celle de la remise du colis, constatée par l'atelier depuis l'onglet
   Facture. C'est elle qui déclenche la facture et les indicateurs.

Deux garde-fous : un plafond par colis, au-delà duquel le moyen n'est plus
proposé (les transporteurs plafonnent le contre-remboursement), et la
possibilité de déclarer un encaissement manqué — colis refusé, client absent —
sans perdre la commande.

Un colis refusé peut être mis en attente (`shipped → on_hold`) : sans cette
transition, une commande expédiée ne pouvait plus redevenir qu'« expédiée » ou
« terminée ».

Le paiement en ligne n'est pas entrepris. L'abstraction est prête : un
prestataire est un pilote qui implémente `PaymentDriver` et se déclare dans le
registre, activé par `PAYMENT_PROVIDERS`. Rien de plus, ni route ni branche
dans le tunnel.

### Webhook de paiement

Une seule route sert tous les prestataires :
`POST /api/webhooks/paiement/{prestataire}`. C'est le pilote — et lui seul —
qui sait lire et authentifier le corps de la requête. Ajouter une passerelle
n'ajoute donc ni route, ni contrôleur, ni branche dans le tunnel de commande.

Deux règles y tiennent : le montant n'est jamais lu depuis la requête, il est
relu depuis la commande ; et une requête non reconnue répond `200`, pas `400`,
pour qu'un prestataire qui réessaie en boucle ne finisse pas par nous noyer.

---

## Décisions en attente de validation

Voir la section « Questions ouvertes » du document de synthèse, et les arbitrages à confirmer avant le jalon M0 :

- nom définitif de la marque ;
- transporteur et frais de contre-remboursement : facturés au client ou
  absorbés ? C'est une colonne à ajouter à la commande, ce n'est pas fait ;
- plafond de contre-remboursement pratiqué par le transporteur retenu ;
- hébergeur et stockage cibles ;
- tarifs des trois extras numériques (proposés : 4 / 25 / 15 DT).
