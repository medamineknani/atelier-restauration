# 02 — Sitemap, architecture d'URL & SEO

> **PHASE 2/3** — Structure des pages, slugs, métadonnées, données structurées.

---

## 3.1 Sitemap complet

### 3.1.1 Pages publiques / marketing — `(marketing)/[locale]`

| Route FR | Rôle | Type de contenu | Priorité |
|---|---|---|---|
| `/` | **Homepage** — hero, promesse, avant/après, services, packs, photobooks, galerie, témoignages, FAQ, CTA | Éditorial + blocs dynamiques (packs, FAQ, témoignages depuis la base) | P0 |
| `/restauration-photo` | **Page pilier** — le service de restauration numérique | Éditorial long + FAQ dédiée | P0 |
| `/amelioration-photo` | Amélioration de la qualité/netteté/résolution | Éditorial | P1 |
| `/restauration-photo-mariage` | Restauration d'albums de mariage | Éditorial + upsell photobook | P0 |
| `/restauration-photos-anciennes` | Photos de famille, N&B, argentiques | Éditorial | P0 |
| `/colorisation-photos` | Colorisation de photos noir & blanc | Éditorial | P2 |
| `/photobooks` | **Page pilier Photobooks** — gamme, papier, formats, process | Éditorial + grille de packs | P0 |
| `/photobooks/mariage` | Photobook Wedding Revival | Éditorial | P1 |
| `/photobooks/famille` | Photobook Heritage / Classic | Éditorial | P1 |
| `/tarifs` | Vue d'ensemble prix packs + extras | Dynamique (base) | P0 |
| `/galerie` | **Galerie de transformations** (avant → après, filtrable) | Dynamique (base) | P0 |
| `/galerie/[slug]` | Fiche détaillée d'une transformation | Dynamique | P1 |
| `/temoignages` | Témoignages clients | Dynamique | P2 |
| `/faq` | FAQ complète (catégorisée) | Dynamique | P0 |
| `/confidentialite` | **Confiance & confidentialité** — la page la plus importante pour la conversion | Éditorial | P0 |
| `/a-propos` | Notre atelier, notre charte de restauration, l'équipe | Éditorial | P1 |
| `/contact` | Formulaire + WhatsApp + téléphone + horaires | Formulaire | P0 |
| `/devis` | Demande sur mesure (gros volumes, associations, archives) | Formulaire | P2 |

### 3.1.2 Tunnel d'achat — `(shop)/[locale]/commande`

| Route | Étape | Notes |
|---|---|---|
| `/commande` | Point d'entrée / redirection intelligente | Si un brouillon existe en cookie, reprise ; sinon étape 1 |
| `/commande/service` | **1 — Choisir le service** (restauration · photobook · extra) | Création du brouillon de commande |
| `/commande/pack` | **2 — Choisir le pack** (+ récap prix, photos incluses, délai) | Fusionnable avec l'étape 1 sur mobile |
| `/commande/extras` | **3 — Options supplémentaires** | Étape skippable |
| `/commande/photos` | **4 — Upload** | Îlot client lourd, chargé à la demande |
| `/commande/coordonnees` | **5 — Informations client** | Adresse conditionnelle (photobook uniquement) |
| `/commande/recapitulatif` | **6 — Récapitulatif & paiement** | Prix recalculé serveur |
| `/commande/confirmation/[reference]` | **7 — Confirmation** | Accessible sans connexion via jeton |

### 3.1.3 Espace client — `(account)/[locale]/compte`

| Route | Rôle |
|---|---|
| `/compte` | Connexion / création (lien magique) |
| `/compte/tableau-de-bord` | Vue d'ensemble : commandes en cours, livrables disponibles |
| `/compte/commandes` | Liste des commandes |
| `/compte/commandes/[reference]` | Détail : statut (timeline), photos envoyées, livrables, factures, messages |
| `/compte/commandes/[reference]/photos` | Les photos envoyées + les restaurées |
| `/compte/factures` | Factures PDF |
| `/compte/parametres` | Profil, mot de passe, langue, préférences de notification, **suppression de compte & données** |
| `/suivi/[token]` | Suivi sans compte (lien email) — même contenu, accès par jeton |

### 3.1.4 Back-office — `/admin` (hors i18n public, interface en FR)

| Route | Rôle |
|---|---|
| `/admin` | Tableau de bord (KPI, commandes à traiter, SLA) |
| `/admin/commandes` | Liste filtrable (statut, type, date, recherche) |
| `/admin/commandes/[id]` | **Écran principal** : client, fichiers, pipeline de statut, upload des restaurées, notes internes, messages, facture, journal |
| `/admin/clients` | Fiches clients + historique |
| `/admin/catalogue` | Packs, extras, catégories, traductions, prix, délais |
| `/admin/contenu/galerie` | Transformations avant/après |
| `/admin/contenu/temoignages` | Témoignages (modération) |
| `/admin/contenu/faq` | FAQ |
| `/admin/contenu/pages` | Blocs éditoriaux éditables par page |
| `/admin/parametres` | Marque, devise, rétention, emails, providers de paiement, transporteurs |
| `/admin/journal` | Journal d'audit |

### 3.1.5 Pages légales & techniques

`/mentions-legales` · `/conditions-vente` · `/politique-confidentialite` · `/cookies` · `/sitemap.xml` · `/robots.txt` · `/404` · `/500`

> ⚠️ Les pages légales devront être relues par un juriste tunisien (droit de la consommation, INPDP — loi n°2004-63). Le site fournira la structure et le contenu de départ, pas un texte juridique validé.

---

## 3.2 Stratégie i18n & URL

| Locale | Préfixe | Exemple | Statut |
|---|---|---|---|
| `fr` | aucun (défaut) | `/restauration-photo` | **V1** |
| `en` | `/en` | `/en/photo-restoration` | V1.1 (structure prête) |
| `ar` | `/ar` + `dir="rtl"` | `/ar/...` | V2 |

Règles :
- `hreflang` auto-référencé + `x-default` sur **toutes** les pages indexables.
- Les slugs sont **traduits** (pas de `/en/restauration-photo`) : meilleur signal sémantique.
- Pas de redirection automatique par géolocalisation qui empêcherait l'indexation d'une locale.
- Cookie `NEXT_LOCALE` pour mémoriser le choix.

---

## 3.3 Métadonnées

Chaque route expose une fonction `generateMetadata({ params })` construite par un helper central (`lib/seo`) qui garantit la cohérence :

```ts
// Résultat type
{
  title: { absolute: "Restauration de photos anciennes | {MARQUE}" },
  description: "…",
  alternates: {
    canonical: "https://…/restauration-photo",
    languages: { fr: "…", en: "…/en/photo-restoration", ar: "…", 'x-default': "…" }
  },
  openGraph: {
    type: 'website' | 'article',
    locale: 'fr_TN', alternateLocale: ['en_US','ar_TN'],
    images: [{ url, width: 1200, height: 630, alt }]   // généré dynamiquement
  },
  twitter: { card: 'summary_large_image', images: […] },
  robots: { index: true, follow: true }
}
```

Règles éditoriales :
- Titre ≤ 60 caractères, description ≤ 155, uniques par page.
- **Aucune page ne partage le même `<h1>`** ; un seul `h1` par page, hiérarchie `h2`/`h3` stricte.
- Pages non indexables : tunnel de commande, espace client, admin, confirmation, recherche.
- Images Open Graph **générées dynamiquement** (`next/og`, `ImageResponse`) avec la typographie de la marque : cohérent, toujours à jour, aucune maintenance manuelle.

---

## 3.4 Données structurées (JSON-LD)

| Type schema.org | Emplacement | Contenu |
|---|---|---|
| `Organization` (+ `LocalBusiness`) | Toutes les pages (dans le layout) | Nom, logo, adresse, téléphone, horaires, `areaServed: TN`, réseaux sociaux |
| `WebSite` + `SearchAction` | Layout | Nom, URL, recherche (si recherche de galerie) |
| `Service` | Pages piliers (`/restauration-photo`, `/photobooks`, …) | `serviceType`, `provider`, `areaServed`, `offers` |
| `Product` + `Offer` | Pages packs & `/tarifs` | `name`, `description`, `price: "99.000"`, `priceCurrency: "TND"`, `availability` — **alimenté par la base**, donc toujours synchronisé avec le back-office |
| `FAQPage` | `/faq` + blocs FAQ des pages piliers | Questions/réponses depuis la base |
| `BreadcrumbList` | Toutes les pages sauf l'accueil | Fil d'Ariane réel (visible à l'écran) |
| `ImageObject` | Fiches galerie | Image avant / après, licence, description du travail |
| `Review` / `AggregateRating` | Homepage + `/temoignages` | **Uniquement** si les avis sont réels et vérifiables ; sinon abstention (risque de pénalité) |
| `HowTo` | `/restauration-photo` | Les 4 étapes du processus — utile pour les riches résultats |

> Les prix en JSON-LD sont injectés depuis la base de données : modifier un tarif dans le back-office met à jour le balisage sans redéploiement.

---

## 3.5 Recherche de mots-clés (marché tunisien, francophone)

### Intention « service » (pages piliers — volume + valeur)

- `restauration photo Tunisie`
- `restaurer vieille photo Tunisie`
- `restauration photo ancienne`
- `réparation photo déchirée`
- `retouche photo ancienne Tunisie`
- `restauration photo mariage Tunisie`
- `numérisation photo Tunisie` *(intention proche — capter avec un paragraphe dédié)*
- `photobook Tunisie` · `album photo mariage Tunisie` · `impression album photo Tunisia`

### Intention « solution » (pages secondaires)

- `améliorer qualité photo floue`
- `coloriser photo noir et blanc`
- `agrandir photo basse résolution`
- `supprimer rayures photo`
- `photo abîmée restauration`
- `récupérer photo abîmée`

### Intention « question » (FAQ + blog à terme)

- `combien coûte restaurer une photo`
- `comment restaurer une vieille photo`
- `peut-on restaurer une photo déchirée`
- `comment numériser un album photo`
- `restaurer photo sans perdre l'original`

**Règle de répartition** : 1 intention principale = 1 page. Pas de cannibalisation entre `/restauration-photo` et `/restauration-photos-anciennes` (la première = le service, la seconde = le cas d'usage « argentique/famille »).

### Maillage interne

```
                    ┌──────────────┐
                    │  ACCEUIL (/) │
                    └──┬────┬────┬─┘
        ┌──────────────┘    │    └──────────────┐
        ▼                   ▼                   ▼
/restauration-photo   /photobooks          /galerie
   │   │   │              │   │                │
   │   │   └──► /colorisation-photos      ┌────┴─────┐
   │   └──────► /amelioration-photo       ▼          ▼
   ├──────────► /restauration-photos-anciennes   /galerie/[slug]
   └──────────► /restauration-photo-mariage ──► /photobooks/mariage
                                                  │
        /faq ◄── (liens depuis chaque page)       ▼
        /confidentialite ◄── (depuis hero, upload, checkout)  /photobooks/famille
        /tarifs ◄── (depuis chaque page service)  → /commande
```

Chaque page service termine par un CTA vers `/commande/service` ; chaque page « cas d'usage » renvoie vers sa page pilier ; la galerie renvoie vers les pages de cas d'usage correspondantes.

---

## 3.6 Performance & Core Web Vitals — budget

Le trafic tunisien est majoritairement mobile, souvent 3G/4G, parfois limité en data. Le budget est une contrainte produit.

| Métrique | Cible | Moyens |
|---|---|---|
| **LCP** | < 2,0 s (4G simulée) | Image hero `priority` + `preload`, AVIF/WebP, serveur en Europe, PPR (shell statique instantané), police auto-hébergée |
| **CLS** | < 0,05 | `width`/`height` ou `aspect-ratio` sur **toutes** les images, polices `display: swap` + métriques de fallback, pas d'injection de bannière tardive |
| **INP** | < 200 ms | Îlots client minimaux, Server Actions, pas de grosse librairie d'animation, `content-visibility` sur les sections basses |
| **TTFB** | < 600 ms depuis Tunis | PPR + cache CDN + `use cache` sur les données catalogue |

Pratiques obligatoires :
- **Toutes** les images en `next/image` avec `sizes` réel (jamais `100vw` par défaut).
- Blur placeholder (base64 24 px) généré à l'ingest ou au build.
- `loading="lazy"` + `decoding="async"` partout sauf LCP.
- Chargement à la demande (`next/dynamic`) de l'uploader, de la lightbox et du slider avant/après en dessous de la ligne de flottaison.
- Aucune vidéo en lecture automatique ; si une vidéo de métier est ajoutée : poster + clic pour lancer, et `< 2 Mo`.
- Pas de police Google chargée par `<link>` : `next/font` uniquement (auto-hébergement, pas de requête DNS tierce).

---

## 3.7 Accessibilité (SEO technique autant qu'éthique)

| Exigence | Détail |
|---|---|
| Contraste | Ratio ≥ 4.5:1 pour le texte courant, ≥ 3:1 pour les grands textes et les éléments d'interface. **Le champagne sur crème est proscrit pour du texte** (réservé aux accents non porteurs d'information) |
| Navigation clavier | Tout parcourable : slider avant/après opérable aux flèches, lightbox fermable par `Échap`, piège de focus dans les modales |
| Formulaires | `<label>` associé, `aria-describedby` pour l'aide, erreurs annoncées (`role="alert"`), focus déplacé sur la première erreur |
| Images | `alt` descriptif et utile ; `alt=""` si décorative. Les images avant/après ont un `alt` qui décrit **le résultat** |
| Mouvement | `prefers-reduced-motion` respecté (aucune animation de révélation, transitions réduites) |
| Structure | Skip-link, landmarks (`header`/`main`/`footer`/`nav`), titres hiérarchiques |
| Cibles tactiles | ≥ 44 × 44 px sur toutes les actions |

---

## 3.8 Checklist SEO « prête au lancement »

- [ ] `generateMetadata` sur **chaque** route (aucun titre par défaut)
- [ ] `hreflang` complet + `x-default`
- [ ] `sitemap.xml` généré dynamiquement (pages statiques + galerie + packs), soumis à Search Console
- [ ] `robots.txt` : blocage de `/admin`, `/commande`, `/compte`, `/api`
- [ ] JSON-LD validé (test Rich Results)
- [ ] OG images dynamiques testées sur Facebook, Instagram, WhatsApp, LinkedIn
- [ ] Fil d'Ariane visible + `BreadcrumbList`
- [ ] Redirections 301 depuis l'ancien site éventuel
- [ ] Search Console + Bing Webmaster Tools configurés
- [ ] Suivi des positions sur 20 mots-clés cibles
- [ ] Pages légales relues
