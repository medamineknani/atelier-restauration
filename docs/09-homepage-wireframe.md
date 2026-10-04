# 09 — Wireframe & structure de la homepage

> **PHASE 3** — Structure section par section, avant habillage UI.
> Mobile d'abord : chaque section est décrite dans sa version 390 px, puis en 1280 px.

---

## 10.1 Logique d'ensemble

La homepage n'est pas une succession de blocs : c'est **un argument en cinq temps**.

```
1. ÉMOTION      « Donnez une nouvelle vie à vos souvenirs. »           → Hero
2. PREUVE       « Regardez ce que nous avons fait d'une photo ruinée. » → Avant/Après
3. RAISON       « Voici comment ça marche, voici ce que vous recevez. » → Process + Services
4. CHOIX        « Voici nos packs. »                                     → Packs + Photobooks
5. CONFIANCE    « Vous pouvez nous confier ça. »                         → Galerie + Témoignages + FAQ + CTA
```

Chaque temps se termine par une **sortie** vers le suivant. Aucune section ne se termine sans une raison de continuer.

---

## 10.2 Sections détaillées

---

### ① HERO

**Objectif** : en moins de 5 secondes, faire comprendre le service, le positionnement, et la promesse de sécurité.

#### Mobile (390 px)

```
┌───────────────────────────────────────┐
│ [logo]                        [ ☰ ]   │  ← header transparent sur l'image
├───────────────────────────────────────┤
│                                       │
│                                       │
│         ┌───────────────────┐         │
│         │                   │         │
│         │   PHOTOGRAPHIE    │         │  ← image plein écran,
│         │   ARGENTIQUE      │         │    légèrement dégradée
│         │   (grand format,  │         │    en bas pour la lisibilité
│         │    recadrée)      │         │
│         │                   │         │
│         └───────────────────┘         │
│                                       │
│  ── ATELIER DE RESTAURATION ──        │  ← eyebrow champagne
│                                       │
│  Donnez une nouvelle vie              │  ← h1, Fraunces 44px, 3 lignes
│  à vos souvenirs.                     │     texte-wrap: balance
│                                       │
│  Nous restaurons vos photographies    │  ← chapô, 17px, stone
│  abîmées, décolorées ou floues —      │     max 3 lignes
│  sans jamais trahir l'original.       │
│                                       │
│  ┌───────────────────────────────┐    │
│  │   Restaurer mes photos      ▸ │    │  ← primary, pleine largeur, 52px
│  └───────────────────────────────┘    │
│  ┌───────────────────────────────┐    │
│  │   Découvrir les photobooks    │    │  ← secondary (contour)
│  └───────────────────────────────┘    │
│                                       │
│  🔒 Vos photos restent privées.       │  ← 1 ligne, 13px, avec petite
│     Jamais partagées. Jamais vendues. │     icône cadenas au trait
│                                       │
└───────────────────────────────────────┘
```

**Notes de conception**
- Pas de slider dans le hero : l'image LCP doit être **une seule** image optimisée, `priority`, ratio verrouillé.
- L'image montre une photographie **ancienne** (pas un "avant/après" à manipuler ici) : c'est l'émotion d'abord.
- La ligne de confidentialité dans le hero n'est pas négociable : c'est le premier frein du visiteur.
- Les deux CTA sont empilés, pleine largeur — le pouce ne doit pas viser.

#### Desktop (1280 px)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [logo]     Restauration  Photobooks  Galerie  Tarifs  FAQ  À propos   [☎]│
├────────────────────────────────────────────────────────────────────────────┤
│                                                    │                       │
│                                                    │                       │
│   ── ATELIER DE RESTAURATION ──                    │                       │
│                                                    │   PHOTOGRAPHIE        │
│   Donnez une nouvelle vie                          │   ARGENTIQUE          │
│   à vos souvenirs.                                 │                       │
│                                                    │   (portrait vertical  │
│   Nous restaurons vos photographies abîmées,       │    ou détail,         │
│   décolorées ou floues — sans jamais               │    cadrage serré,     │
│   trahir l'original.                               │    bord perdu à       │
│                                                    │    droite = breakout) │
│   [ Restaurer mes photos ▸ ]                       │                       │
│   [ Découvrir les photobooks ]                     │                       │
│                                                    │                       │
│   🔒 Vos photos restent privées. Jamais partagées. │                       │
│                                                    │                       │
└────────────────────────────────────────────────────────────────────────────┘
```
Colonne texte : 6/12 colonnes. Image : 6/12, **sortant du conteneur** vers la droite (effet éditorial).

---

### ② PROPOSITION DE VALEUR

**Objectif** : dire en une phrase ce qu'on fait, et en trois points pourquoi c'est différent.

```
        ── NOTRE MÉTIER ──

   Certaines photographies racontent une
   histoire qu'aucun fichier numérique
   ne pourra remplacer.

   Nous restaurons vos images pour préserver
   ces histoires — et leur donner une nouvelle vie.

   ┌─────────────────────────────────────────┐
   │  ┌────┐                                 │
   │  │ ◇  │  Un travail humain,              │  ← 3 colonnes desktop,
   │  └────┘  photo par photo                 │     empilé mobile
   │          Aucun traitement automatique.   │
   │          Chaque image est regardée,      │
   │          corrigée, vérifiée à la main.   │
   ├─────────────────────────────────────────┤
   │  ┌────┐                                 │
   │  │ ◇  │  L'original préservé             │
   │  └────┘  Nous restaurons, nous ne        │
   │          réinventons pas. Les visages,   │
   │          les lumières, les défauts qui   │
   │          font la photo restent.          │
   ├─────────────────────────────────────────┤
   │  ┌────┐                                 │
   │  │ ◇  │  Vos souvenirs vous appartiennent│
   │  └────┘  Stockage privé, suppression     │
   │          après traitement, aucune         │
   │          utilisation commerciale.        │
   └─────────────────────────────────────────┘
                                    → /a-propos
```

Icônes : **au trait, 1,25 px**, jamais de pictogrammes pleins. Le trait fin est un marqueur de luxe discret.

---

### ③ AVANT / APRÈS

**Objectif** : la section qui vend. Doit être la deuxième chose visible après le hero.

```
      ── LE RÉSULTAT ──

   Glissez pour voir la différence.

   ┌───────────────────────────────────────────────────┐
   │                      ║                            │
   │                      ║                            │
   │    ORIGINAL          ║       RESTAURÉ             │
   │    (photo tachée,    ║       (nette,              │
   │     rayée, pâlie)    ║        contrastée)         │
   │                      ║                            │
   │                     ◉║                            │  ← poignée : filet
   │                      ║                            │     1px + disque 44px
   └───────────────────────────────────────────────────┘
      ← glissez ──────────────────────────→

   Mariage · 1968 · Rayures, taches d'humidité, décoloration
   Restauration complète : dépoussiérage, correction des
   contrastes, récupération des détails du visage.

   ┌───────────────┐  ┌───────────────┐  ┌──────────────┐
   │ [ vignette ]  │  │ [ vignette ]  │  │ [ vignette ] │  ← 2 autres exemples
   │  Famille 1954 │  │  Portrait N&B │  │  Photo déchi-│     en petites cartes
   └───────────────┘  └───────────────┘  └──────────────┘
                                          → Voir toute la galerie
```

**Comportement**
- Le curseur démarre à **50 %** sur mobile (on voit immédiatement les deux états).
- Accessibilité : le composant contient un `<input type="range">` réel (invisible mais opérable au clavier, flèches = pas de 5 %), `role="slider"`, `aria-valuenow`.
- `prefers-reduced-motion` : la transition de suivi est supprimée, le déplacement reste instantané.
- La légende sous l'image est **aussi importante que l'image** : elle dit ce qui a été fait.

---

### ④ COMMENT ÇA MARCHE

**Objectif** : lever la peur « c'est compliqué ».

```
        ── COMMENT ÇA MARCHE ──

   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │   01                                                    │
   │   ──                                                    │
   │   Vous nous envoyez vos photos                          │
   │   Par téléphone, depuis votre ordinateur, ou en nous    │
   │   les déposant à l'atelier. Tirages ou fichiers.        │
   │                                                         │
   ├─────────────────────────────────────────────────────────┤
   │   02                                                    │
   │   ──                                                    │
   │   Nous les restaurons à la main                         │
   │   Nettoyage, reconstitution, correction des couleurs,   │
   │   amélioration de la netteté. Photo par photo.          │
   │                                                         │
   ├─────────────────────────────────────────────────────────┤
   │   03                                                    │
   │   ──                                                    │
   │   Vous recevez vos souvenirs                            │
   │   En haute résolution, à télécharger — ou reliés dans   │
   │   un photobook, livré chez vous.                        │
   │                                                         │
   └─────────────────────────────────────────────────────────┘

   Durée : 5 à 12 jours ouvrés selon le pack.
```

Desktop : 3 colonnes. Mobile : empilé, avec le **numéro en grand** (Fraunces 40 px, gris clair) et un filet court en dessous — c'est le repère qui rend la lecture rapide.

Variante proposée : un **4e encart** « Et si ma photo est irrécupérable ? — Nous vous le disons franchement, et vous n'êtes pas facturé. » (excellent levier de confiance).

---

### ⑤ NOS SERVICES

**Objectif** : montrer l'étendue, rassurer sur les cas difficiles.

```
      ── NOS SERVICES ──

   ┌──────────────────────────┐ ┌──────────────────────────┐
   │  [ image ]               │ │  [ image ]               │
   │                          │ │                          │
   │  Restauration numérique  │ │  Photobooks premium      │
   │  Rayures, taches, déchi- │ │  Vos photos restaurées,  │
   │  rures, décoloration,    │ │  mises en page et reliées│
   │  flou, basse résolution. │ │  dans un livre d'exception│
   │                          │ │                          │
   │  À partir de 99 DT    ▸  │ │  À partir de 449 DT   ▸  │
   └──────────────────────────┘ └──────────────────────────┘

   ┌──────────────────────────┐ ┌──────────────────────────┐
   │  [ image ]               │ │  [ image ]               │
   │  Colorisation de photos  │ │  Numérisation d'albums   │
   │  noir & blanc            │ │  entiers                 │
   │  Des teintes justes,     │ │  Album, boîte à chaussures,│
   │  documentées, jamais     │ │  classeur. On s'occupe   │
   │  inventées.           ▸  │ │  de tout.             ▸  │
   └──────────────────────────┘ └──────────────────────────┘
```

2 × 2 sur desktop, 1 colonne sur mobile. Le prix « à partir de » est en `eyebrow`, discret — jamais en gros.

---

### ⑥ PACKS NUMÉRIQUES

**Objectif** : faire choisir sans pressure.

```
        ── RESTAURATION NUMÉRIQUE ──

   Choisissez le nombre de photos. Nous faisons le reste.

   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │                │ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│ │                │  ← liseré champagne
   │   BASIC        │ │  LE PLUS CHOISI│ │   COMPLETE     │     1px sur PREMIUM
   │   Pour commencer│ │   PREMIUM     │ │   Pour les     │
   │                │ │   Pour les     │ │   archives     │
   │                │ │   albums de    │ │   familiales   │
   │                │ │   famille      │ │                │
   │   99 DT        │ │   199 DT       │ │   349 DT       │
   │   ───────────  │ │   ───────────  │ │   ───────────  │
   │   ✓ 20 photos  │ │   ✓ 50 photos  │ │   ✓ 100 photos │
   │   ✓ Amélioration│ │   ✓ Restauration│ │   ✓ Restauration│
   │     qualité /  │ │     avancée    │ │     avancée    │
   │     couleurs   │ │   ✓ Correction │ │   ✓ Photos     │
   │   ✓ Fichiers HD│ │     résolution │ │     endommagées│
   │                │ │     / couleurs │ │   ✓ Upscale HD │
   │                │ │                │ │                │
   │   3 à 5 jours  │ │   5 à 7 jours  │ │   8 à 12 jours │
   │  ┌──────────┐  │ │  ┌──────────┐  │ │  ┌──────────┐  │
   │  │ Choisir  │  │ │  │ Choisir  │  │ │  │ Choisir  │  │
   │  └──────────┘  │ │  └──────────┘  │ │  └──────────┘  │
   └────────────────┘ └────────────────┘ └────────────────┘

   Options disponibles sur chaque pack :
   photo supplémentaire · restauration complexe · colorisation N&B
                                                    → /tarifs
```

- Mobile : les 3 cartes sont empilées ; la deuxième est mise en avant. Un sélecteur horizontal (onglets) peut remplacer l'empilement pour éviter un scroll trop long — **à tester en A/B**.
- Les trois cartes ont la **même hauteur** (alignement des CTA) : c'est ce qui rend la comparaison confortable.

---

### ⑦ PHOTOBOOKS PREMIUM

**Objectif** : montée en gamme émotionnelle (le panier moyen passe de 199 à 699 DT).

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                                          │                       │
   │   ── PHOTOBOOKS ──                       │   [ PHOTOBOOK OUVERT ]│
   │                                          │                       │
   │   Un album, pas un fichier.              │   photographie du     │
   │                                          │   livre : papier      │
   │   Nous restaurons vos photographies,     │   épais, couverture,  │
   │   puis nous les mettons en page et les   │   tranche, lumière    │
   │   faisons relier dans un livre que       │   rasante             │
   │   l'on feuillette, que l'on transmet,    │                       │
   │   que l'on pose sur une table.           │                       │
   │                                          │                       │
   │   ┌────────────────────────────────┐     │                       │
   │   │ CLASSIC        449 DT       ▸  │     │                       │
   │   │ 30-40 photos · couverture rigide│     │                       │
   │   ├────────────────────────────────┤     │                       │
   │   │ WEDDING REVIVAL 699 DT      ▸  │     │                       │
   │   │ 50-80 photos · 30×30 lay-flat  │     │                       │
   │   ├────────────────────────────────┤     │                       │
   │   │ HERITAGE PREMIUM 949 DT     ▸  │     │                       │
   │   │ 80-120 photos · boîte écrin    │     │                       │
   │   └────────────────────────────────┘     │                       │
   │                                          │                       │
   │   Options : pages supplémentaires ·      │                       │
   │   deuxième exemplaire · mini-film · boîte│                       │
   │                                          │                       │
   │   [ Découvrir les photobooks ▸ ]         │                       │
   └──────────────────────────────────────────────────────────────────┘
```

Section sur fond `cream` pour marquer le changement de registre. Sur mobile : image d'abord, puis la liste.

---

### ⑧ GALERIE DE TRANSFORMATIONS

**Objectif** : « ma photo est pire que ça, et ils l'ont sauvée. »

```
      ── GALERIE ──

   Mariage   Famille   Enfance   Portraits   N&B   Très abîmées   Basse résolution
   ───────   ───────   ───────   ─────────   ───   ────────────   ────────────────
                       ↑ filtre actif : filet champagne sous l'item

   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ [avant│apr]│ │ [avant│apr]│ │ [avant│apr]│
   │           │ │           │ │           │
   │ Famille   │ │ Mariage   │ │ Portrait  │
   │ 1962      │ │ 1974      │ │ 1951      │
   │ Déchirure │ │ Décolora- │ │ N&B       │
   │ recollée  │ │ tion      │ │ colorisé  │
   └───────────┘ └───────────┘ └───────────┘
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ [avant│apr]│ │ [avant│apr]│ │ [avant│apr]│
   └───────────┘ └───────────┘ └───────────┘

              [ Voir toute la galerie ▸ ]
```

- Mosaïque **irrégulière** (hauteurs variables) — une grille parfaite fait « template ».
- Chaque carte affiche une **mini comparaison** au survol (desktop) ; au clic, ouverture de la fiche avec le grand slider.
- Catégorie « Très abîmées » en premier dans l'ordre d'affichage par défaut : c'est la preuve la plus forte.

---

### ⑨ TÉMOIGNAGES

**Objectif** : la preuve sociale locale. Un témoignage de Tunis vaut dix témoignages génériques.

```
        ── ILS NOUS ONT CONFIÉ LEURS PHOTOS ──

   ┌────────────────────────────────────────────────────────┐
   │                                                        │
   │   « Je n'avais plus qu'une photo de ma mère            │
   │     jeune. Elle était fendue en deux. Je ne            │
   │     pensais pas qu'on puisse la récupérer.             │
   │     Quand je l'ai vue, j'ai pleuré. »                  │
   │                                                        │
   │     ── Leïla B. · Tunis                                │
   │        Photos de famille, 1958                         │
   │                                                        │
   └────────────────────────────────────────────────────────┘

              ● ○ ○ ○ ○        ← 5 témoignages, carrousel sobre
```

- Citation en **Fraunces italique, 22 px**, beaucoup d'air autour.
- Fond `cream`, filet d'1 px, **pas de guillemets géants**, pas de photo de banque.
- Carrousel : pas de défilement automatique (respect du lecteur), flèches fines + indicateurs en points.
- Sur mobile : une seule carte à la fois, swipe natif.

---

### ⑩ FAQ

**Objectif** : répondre aux 7 questions du brief avant qu'elles ne bloquent.

```
        ── QUESTIONS FRÉQUENTES ──

   ┌────────────────────────────────────────────────────────┐
   │  Mes photos sont très abîmées. Est-ce récupérable ?  ＋ │
   ├────────────────────────────────────────────────────────┤
   │  Comment vous envoyer mes photos ?                   ＋ │
   ├────────────────────────────────────────────────────────┤
   │  Combien de temps cela prend-il ?                    ＋ │
   ├────────────────────────────────────────────────────────┤
   │  Que deviennent mes originaux ?                      ＋ │
   ├────────────────────────────────────────────────────────┤
   │  Puis-je commander un album après la restauration ?  ＋ │
   ├────────────────────────────────────────────────────────┤
   │  Comment se fait le paiement ?                       ＋ │
   └────────────────────────────────────────────────────────┘

                  [ Voir toutes les questions ▸ ]
```

- 6 questions sur la homepage, la FAQ complète sur `/faq` (12-15 questions, catégorisées).
- Balisage `FAQPage` en JSON-LD (bénéfice SEO direct).
- Accordéon : une seule ouverte à la fois sur mobile, animation 280 ms.

---

### ⑪ CTA FINAL

**Objectif** : la dernière impulsion, sur fond sombre — rupture de rythme assumée.

```
┌──────────────────────────────────────────────────────────────┐
│                    (fond ink — noir profond)                 │
│                                                              │
│                                                              │
│        ── UN PREMIER PAS ──                                  │
│                                                              │
│        Envoyez-nous une seule photo.                         │
│        Regardez ce que nous en faisons.                      │
│                                                              │
│        Vous déciderez ensuite.                               │
│                                                              │
│        ┌────────────────────────────────┐                    │
│        │   Restaurer mes photos      ▸  │                    │
│        └────────────────────────────────┘                    │
│                                                              │
│        ────────────────────────────────────                  │
│                                                              │
│        Ou parlez-nous-en d'abord :                           │
│        📞 +216 XX XXX XXX      ✉ bonjour@…      [WhatsApp]   │
│                                                              │
│        Réponse sous 24 h · Devis gratuit · Devis sans engagement│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- « Envoyez-nous une seule photo » abaisse spectaculairement le seuil psychologique. C'est l'argument le plus efficace de la page.
- Les coordonnées directes rassurent énormément sur un marché où le paiement en ligne fait encore hésiter.

---

## 10.3 Récapitulatif de la homepage

| # | Section | Fond | Hauteur mobile (approx.) | Données |
|---|---|---|---|---|
| ① | Hero | image | 100 vh | statique |
| ② | Proposition de valeur | `paper` | ~90 vh | `page_blocks` |
| ③ | Avant / après | `paper` | ~85 vh | `transformations` |
| ④ | Comment ça marche | `cream` | ~80 vh | `page_blocks` |
| ⑤ | Nos services | `paper` | ~110 vh | statique |
| ⑥ | Packs numériques | `paper` | ~200 vh | `products` (family=digital) |
| ⑦ | Photobooks | `cream` | ~120 vh | `products` (family=photobook) |
| ⑧ | Galerie | `paper` | ~130 vh | `transformations` |
| ⑨ | Témoignages | `cream` | ~70 vh | `testimonials` |
| ⑩ | FAQ | `paper` | ~80 vh | `faq_items` |
| ⑪ | CTA final | `ink` | ~70 vh | `page_blocks` |

Alternance `paper` / `cream` : **jamais deux sections de même fond qui se suivent**, sauf ⑤→⑥ (volontaire, pour regrouper l'offre).

---

## 10.4 Header & Footer

### Header
- **Desktop** : logo à gauche, 6 liens au centre, téléphone + CTA discret à droite. Devient opaque avec un filet bas au scroll (> 80 px).
- **Mobile** : logo + menu hamburger. Le menu plein écran contient les liens **et** les deux CTA en bas (toujours accessibles au pouce).
- Le CTA du header reste secondaire (contour) : le vrai CTA est dans le hero et à la fin de chaque section.

### Footer
```
┌──────────────────────────────────────────────────────────────┐
│  [logo]                    Services      L'atelier   Contact  │
│                            Restauration  À propos    Tél      │
│  Une phrase de marque.     Photobooks    Galerie     Email    │
│                            Colorisation  FAQ         WhatsApp │
│                                          Confidentialité      │
│  ──────────────────────────────────────────────────────────   │
│  © 2026 · Mentions légales · CGV · Confidentialité · Cookies  │
│                                            [ FR ▾ ]           │
└──────────────────────────────────────────────────────────────┘
```
Le sélecteur de langue en bas à droite, discret, prêt pour `en` / `ar`.

---

## 10.5 Ce que la homepage ne contient **pas**

Volontairement absents, pour préserver la sensation premium :

- ❌ Compteur de clients satisfaits (chiffre inventé = perte de confiance)
- ❌ Logos de partenaires fictifs
- ❌ Fenêtre modale d'inscription à la newsletter à l'arrivée
- ❌ Chat en direct qui apparaît en bas à droite
- ❌ Bandeau « livraison gratuite »
- ❌ Chronomètre ou urgence artificielle
