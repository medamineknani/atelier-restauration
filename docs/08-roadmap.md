# 08 — Feuille de route & définition de « terminé »

> **PHASES 3 → 6** — Comment on passe de ce document à un site en production.

---

## 9.1 Découpage

Le travail est séquencé en **7 jalons**. Chaque jalon produit quelque chose de **montrable et testable** — jamais une branche de trois semaines sans démo.

| # | Jalon | Livrable | Durée estimée |
|---|---|---|---|
| **M0** | **Fondations** | Repo initialisé, Next 16 + TS + Tailwind 4, design system (tokens + primitives), page `/dev/design-system`, layout, header/footer, PGlite + Drizzle + première migration, seed, CI (lint + typecheck + build) | 3-4 j |
| **M1** | **Pages marketing** | Homepage complète (11 sections) + pages piliers (`restauration-photo`, `photobooks`, `amelioration-photo`, `restauration-photos-anciennes`, `restauration-photo-mariage`) + `galerie`, `faq`, `confidentialite`, `a-propos`, `contact` — contenu depuis la base | 5-7 j |
| **M2** | **Composants clés** | `<BeforeAfter>` (desktop + mobile + clavier), `<GalleryGrid>` + lightbox, `<Testimonial>`, `<FAQAccordion>`, animations de révélation, OG images dynamiques, SEO complet (metadata, JSON-LD, sitemap, robots, hreflang) | 3-4 j |
| **M3** | **Tunnel de commande** | Wizard 6 étapes, brouillon persisté, sélection pack/extras, **upload** (présigné + driver local, progression, reprise, quota, samples), informations client, récapitulatif, provider `manual`, confirmation + emails | 6-8 j |
| **M4** | **Espace client** | Auth (lien magique + mot de passe), rattachement des commandes invité, liste, timeline de statut, téléchargement des résultats (jetons), factures, paramètres, suppression de compte | 4-5 j |
| **M5** | **Back-office** | Dashboard, liste, **écran de détail complet** (fichiers, upload des résultats, appariement, statut, notes, journal), catalogue & prix, contenu (galerie/témoignages/FAQ/pages), paramètres, équipe | 6-8 j |
| **M6** | **Paiement & durcissement** | Driver `konnect` (ou celui retenu) + webhook idempotent, facturation PDF, jobs (ZIP, rétention, relance), durcissement sécurité, tests e2e, optimisation perf, recette | 4-6 j |

**Total estimé : 30 à 42 jours-homme** pour une V1 complète et sérieuse. Les jalons M0→M2 donnent déjà un site public convaincant (sans tunnel d'achat).

---

## 9.2 Ordre de priorité si le temps est contraint

1. Le **slider avant/après** et la **galerie** (ils vendent le service).
2. Le **tunnel de commande avec upload mobile** (c'est là que l'argent se joue).
3. Le **back-office de traitement des commandes** (sans lui, on ne peut pas produire).
4. L'espace client (important, mais le suivi par email peut temporairement suffire).
5. Les pages de contenu secondaires.

---

## 9.3 Définition de « terminé » (DoD) — applicable à chaque jalon

Une fonctionnalité n'est « terminée » que si **toutes** ces conditions sont réunies :

- [ ] **Design** : conforme au design system §05 (tokens uniquement, aucune valeur arbitraire)
- [ ] **Responsive** : testé à 360 / 390 / 768 / 1280 / 1920 px — mobile d'abord
- [ ] **Accessibilité** : navigation clavier complète, contraste AA, `aria` correct, `prefers-reduced-motion` respecté
- [ ] **i18n** : aucune chaîne en dur ; clés ajoutées dans `fr` (et dans `en`/`ar` si la locale est active)
- [ ] **Performance** : budget JS respecté, images `next/image` avec `sizes` et blur, pas de régression LCP/CLS
- [ ] **Erreurs** : cas d'échec gérés et **visibles** (réseau coupé, fichier refusé, quota dépassé, paiement refusé)
- [ ] **Sécurité** : validation Zod en entrée, contrôle d'autorisation explicite, journalisation si action sensible
- [ ] **Données** : migration écrite et rétro-compatible, seed mis à jour
- [ ] **Tests** : au minimum un test de non-régression sur le chemin critique concerné
- [ ] **SEO** : metadata, canonical, `alt`, JSON-LD si pertinent
- [ ] **Revue** : relecture du code par une deuxième personne (ou auto-revue documentée)

---

## 9.4 Stratégie de test

| Niveau | Outil | Cible |
|---|---|---|
| **Types** | `tsc --noEmit` en CI | 0 erreur |
| **Lint** | ESLint + Prettier | 0 erreur |
| **Unitaires** | Vitest | `pricingService` (tous les calculs), machine à états des commandes (transitions autorisées/interdites), formatage, helpers de sécurité (`assertOrderAccess`) |
| **Intégration** | Vitest + PGlite temporaire | Repositories, services avec vraie base |
| **E2E** | Playwright (Chrome + **mobile Safari/WebKit**) | 8 parcours critiques (ci-dessous) |
| **Sécurité** | Tests dédiés | Accès à la commande d'un autre utilisateur → 404 ; accès à `/admin` sans rôle → 403 ; bucket non listable ; webhook sans signature → rejeté |
| **Performance** | Lighthouse CI | Seuils bloquants : Perf ≥ 90 mobile, A11y ≥ 95, SEO = 100 |
| **Visuel** | Recette manuelle sur `/dev/design-system` | Conformité au §05 |

### Les 8 parcours E2E obligatoires

1. Homepage → galerie → page service → début de commande
2. **Commande digitale complète** (pack PREMIUM + 2 extras + upload de 3 fichiers + coordonnées + paiement manuel + confirmation)
3. **Commande photobook complète** (avec adresse et frais de port)
4. Upload : fichier refusé (mauvais format) → message clair ; fichier trop lourd → refus avant upload
5. Upload : quota dépassé → ajout automatique de l'extra « photo supplémentaire »
6. Espace client : lien magique → suivi → téléchargement d'un résultat
7. Admin : connexion → ouvrir une commande → uploader les résultats → `ready` → le client reçoit l'email
8. Admin : modifier un prix → vérifier la mise à jour sur le site **et** l'immutabilité du prix d'une commande en cours

---

## 9.5 Environnements & branches

| Branche | Environnement | Usage |
|---|---|---|
| `main` | Production | Déployé automatiquement après validation |
| `arena/*` | Preview | Déployé à chaque push ; URL de prévisualisation partageable |
| locale | `local` | PGlite + stockage local + Mailpit |

Règles :
- Un jalon = une branche = une PR = une prévisualisation validée avant fusion.
- **Interdiction de pousser directement sur `main`.**
- Les migrations sont appliquées **avant** le déploiement du code qui les utilise.

---

## 9.6 Mise en production (checklist)

### Technique
- [ ] Variables d'environnement de production définies et vérifiées
- [ ] Base de données migrée, sauvegarde automatique activée, test de restauration effectué
- [ ] Bucket privé créé, versionnage activé, CORS configuré pour l'upload direct
- [ ] Domaine + DNS + TLS + redirection `www` → apex
- [ ] Emails : domaine vérifié (SPF, DKIM, DMARC), tous les templates testés
- [ ] Paiement : provider en mode production, webhook déclaré et testé, **une vraie transaction de 1 DT effectuée puis remboursée**
- [ ] `/api/health` supervisé
- [ ] Lighthouse CI au vert sur la homepage et une page service
- [ ] `robots.txt` vérifié (le tunnel et l'admin bien bloqués)

### Contenu & légal
- [ ] 6 à 12 transformations avant/après réelles (c'est le cœur de la conversion)
- [ ] 4 à 6 témoignages réels, avec autorisation
- [ ] FAQ de 12-15 questions
- [ ] Pages légales validées par un juriste tunisien
- [ ] Charte de restauration rédigée (ce qu'on fait / ce qu'on ne fait pas)
- [ ] Coordonnées réelles : téléphone, WhatsApp, email, adresse

### Exploitation
- [ ] Compte superadmin créé, 2FA activée
- [ ] Procédure de réponse à incident écrite
- [ ] Procédure de sauvegarde/restauration écrite et testée
- [ ] Formation d'une heure à l'usage du back-office (capture vidéo)
- [ ] Search Console configuré, sitemap soumis

---

## 9.7 Après la V1 (backlog priorisé)

| Priorité | Évolution |
|---|---|
| **P1** | Locales `en` et `ar` (RTL) activées |
| **P1** | Notifications WhatsApp/SMS (pertinence forte en Tunisie) |
| **P1** | Deuxième provider de paiement (Konnect **et** Flouci en parallèle, au choix du client) |
| **P2** | Codes promo et parrainage |
| **P2** | Galerie privée partageable avec la famille (lien protégé) — excellent levier de bouche-à-oreille |
| **P2** | Module « impression » : tirages d'art, cadres, agrandissements |
| **P2** | Blog / journal de l'atelier (restaurations commentées) — très bon pour le SEO longue traîne |
| **P3** | Portail pour les sous-traitants/restaurateurs |
| **P3** | Application mobile de scan (numériser un album avec son téléphone, détection automatique des contours) |
| **P3** | Cartes cadeaux (usage évident : « offrir la restauration de l'album de mamie ») |

---

## 9.8 Risques de planning

| Risque | Atténuation |
|---|---|
| L'upload direct présigné est plus long à mettre au point que prévu | Le driver `local` permet de livrer M3 sans attendre ; le driver S3 se substitue sans changer le client |
| Manque de vraies photos avant/après au moment du lancement | Prévoir des exemples dégradés **synthétiques** clairement identifiés comme « exemples de démonstration », remplacés dès les premières commandes |
| Les textes légaux bloquent la mise en production | Page légale en structure dès M1, contenu définitif externalisé en parallèle dès M0 |
| Le paiement tunisien prend du retard | Le driver `manual` couvre le lancement ; l'interface est prête |
| Dérive du périmètre (on veut tout) | Le DoD et la priorisation §9.2 servent d'arbitrage |
