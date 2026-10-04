# 05 — Design System

> **PHASE 2/4** — Les fondations visuelles. « Premium / Elegant / Emotional / Editorial / Timeless ».
> Implémentation : Tailwind CSS v4, `@theme` en CSS-first, variables CSS natives.

---

## 6.1 Intention

Le site doit donner l'impression d'entrer dans un **atelier d'artisan**, pas dans une application.

Trois mots tiennent toute la direction artistique :

| Mot | Ce que ça interdit | Ce que ça impose |
|---|---|---|
| **Patrimoine** | Les dégradés violets, les néons, les illustrations « tech » | Papiers texturés, serif, noir profond, photographie argentique |
| **Précieux** | Les grosses bordures, les rubans « -30 % », les ombres portées marquées | Des filets d'un pixel, beaucoup de vide, un accent doré rare |
| **Calme** | Les animations rebondissantes, les compteurs qui tournent | Des transitions longues et douces, du silence visuel |

> Règle absolue : **si un élément attire l'œil plus que la photographie, il est à retirer.** Sur ce site, l'image est toujours le sujet.

---

## 6.2 Typographie

### Combinaison retenue

| Rôle | Famille | Usage |
|---|---|---|
| **Display / Titres** | **Fraunces** (variable, axes `SOFT` et `WONK`) | `h1`, `h2`, prix, chiffres, citations. Chaleureux, éditorial, légèrement "impression typographique" — évoque le livre et l'archive plutôt que la mode |
| **Interface / Texte** | **Inter** (variable) | Corps de texte, boutons, formulaires, tableaux. Neutre, lisible, excellent rendu à petite taille sur mobile |
| **Alternative display** | *Cormorant Garamond* | Si une élégance plus « haute couture » est préférée. Plus fin, très beau en très grand, fragile en dessous de 18 px |
| **Accent éditorial** | Une seule graisse de Fraunces en italique | Pour les sous-titres et les légendes de photographies |

Les deux familles sont **auto-hébergées** via `next/font` (sous-ensembles `latin`, `latin-ext` ; `arabic` ajouté pour la locale `ar` avec une famille adaptée — *IBM Plex Sans Arabic* ou *Noto Kufi Arabic*).

### Échelle (mobile-first)

| Token | Taille | Interligne | Graisse | Usage |
|---|---|---|---|---|
| `text-display` | 44 → 76 px (clamp) | 0,98 | 300-400 | Hero uniquement |
| `text-h1` | 34 → 52 px | 1,05 | 400 | Titres de page |
| `text-h2` | 26 → 38 px | 1,12 | 400 | Titres de section |
| `text-h3` | 20 → 26 px | 1,2 | 500 | Sous-titres, noms de packs |
| `text-body-lg` | 18 → 20 px | 1,65 | 400 | Chapô, paragraphes d'introduction |
| `text-body` | 16 → 17 px | 1,7 | 400 | Corps de texte (min 16 px sur mobile) |
| `text-small` | 14 px | 1,6 | 400 | Légendes, mentions |
| `text-eyebrow` | 11 → 12 px | 1,4 | 500, **capitales, +0,18em** | Surtitres (« NOS SERVICES », « AVANT / APRÈS ») |
| `text-price` | 30 → 40 px | 1 | 300 (Fraunces) | Prix — jamais en gras |

Règles :
- **Interligne généreux** (1,6-1,7) et **largeur de ligne limitée à ~68 caractères** (`max-w-[68ch]`) : c'est ce qui donne la sensation éditoriale.
- Lettres fines sur les grands titres (`300`/`400`), jamais de `700` au-dessus de 24 px.
- Les prix utilisent un **chiffre fin et grand**, sans symbole agressif : `99 DT` avec `DT` en `text-small` et en gris — pas de `99,000 DT` en gras.
- `text-wrap: balance` sur les titres, `text-wrap: pretty` sur les paragraphes.

---

## 6.3 Couleur

### Palette

```css
/* Neutres chauds — la base de tout */
--color-ink:        #100F0D;  /* noir profond : texte principal, fond des sections sombres */
--color-ink-soft:   #2A2723;  /* second plan sombre */
--color-graphite:   #4A463F;  /* texte secondaire sur fond clair */
--color-stone:      #6E6862;  /* texte tertiaire, métadonnées */
--color-muted:      #8C857C;  /* placeholders, désactivé */

--color-paper:      #FDFCF9;  /* blanc cassé : fond par défaut */
--color-cream:      #F6F2EA;  /* fond de section alternée */
--color-sand:       #EDE7DB;  /* cartes, champs de formulaire */
--color-line:       #DED7C9;  /* filets d'1 px, bordures de cartes */
--color-line-strong:#C6BDA9;  /* bordures actives / focus */

/* Accent — utilisé avec parcimonie */
--color-champagne:      #B99B62;  /* accent principal (filets, icônes, surlignage) */
--color-champagne-soft: #E5D9C0;  /* fonds d'accentuation très clairs */
--color-champagne-deep: #8E7440;  /* accent sur fond clair — accessible au texte */

/* Sémantique */
--color-success: #4F6B52;  /* vert olive, pas un vert "dashboard" */
--color-warning: #A87B3E;
--color-danger:  #9A3B34;  /* rouge brique */
--color-info:    #4A5A66;
```

### Règles d'usage (critiques)

- **Le fond par défaut est `paper` (#FDFCF9), jamais du blanc pur #FFF.** Le blanc pur casse immédiatement la sensation « papier ».
- L'accent champagne **ne porte jamais de texte courant** sur fond clair (contraste insuffisant). Sur fond clair, utiliser `champagne-deep` ou `ink`.
- L'accent champagne est **rare** : un filet sous un titre, une icône, un liseré sur la carte du pack recommandé. Objectif : < 5 % de la surface.
- Une **section sombre** (`ink`) par page au maximum, pour le contraste et la respiration (CTA final, citations).
- Aucun dégradé, aucun `backdrop-blur`, aucune ombre colorée.

### Contraste (WCAG AA minimum)

| Combinaison | Ratio | Verdict |
|---|---|---|
| `ink` sur `paper` | ~16,5:1 | ✅ AAA |
| `graphite` sur `paper` | ~8,2:1 | ✅ AAA |
| `stone` sur `paper` | ~5,1:1 | ✅ AA |
| `muted` sur `paper` | ~3,3:1 | ⚠️ Réservé aux éléments non porteurs d'information |
| `champagne-deep` sur `paper` | ~4,7:1 | ✅ AA |
| `champagne` sur `ink` | ~5,8:1 | ✅ AA |
| `paper` sur `ink` | ~16,5:1 | ✅ AAA |

---

## 6.4 Grille, espacement, rayons

### Grille

- Conteneur : `max-w-[1280px]`, gouttière `20px` (mobile) → `32px` (tablette) → `48px` (desktop).
- Grille éditoriale 12 colonnes — mais la plupart des sections utilisent volontairement **6 colonnes** pour laisser respirer.
- Les images peuvent **sortir du conteneur** (`breakout`) : pleine largeur pour les hero et les galeries. C'est ce qui crée le rythme éditorial.
- Rythme vertical : les sections font `80px` (mobile) → `120px` (tablet) → `160px` (desktop) de marge. **Le vide n'est pas du vide, c'est du rythme.**

### Espacement (base 4px)

`1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `6: 24px` · `8: 32px` · `12: 48px` · `16: 64px` · `20: 80px` · `24: 96px` · `32: 128px` · `40: 160px`

### Rayons — **modérés**, jamais « bulle »

```
--radius-xs: 2px    (chips, tags)
--radius-sm: 3px    (champs de formulaire)
--radius-md: 6px    (cartes, boutons)
--radius-lg: 10px   (modales, panneaux)
--radius-full: 999px (pills, avatars uniquement)
```

### Ombres — **quasi invisibles**, teintées de chaud

```css
--shadow-sm: 0 1px 2px rgba(16, 15, 13, 0.04);
--shadow-md: 0 4px 16px -6px rgba(16, 15, 13, 0.08);
--shadow-lg: 0 16px 40px -16px rgba(16, 15, 13, 0.14);
```
L'élévation se marque d'abord par **une bordure d'1 px** (`--color-line`), l'ombre ne fait que confirmer.

### Bordures

**1 px partout.** `1px solid var(--color-line)`. Au focus : `2px solid var(--color-champagne)` avec un décalage de 2 px (`outline-offset`). Jamais de bordure de 2 px au repos.

---

## 6.5 Mouvement

| Token | Valeur | Usage |
|---|---|---|
| `--ease-editorial` | `cubic-bezier(0.22, 1, 0.36, 1)` | Courbe par défaut : départ franc, arrivée douce |
| `--duration-fast` | 160 ms | Survol, focus |
| `--duration-base` | 280 ms | Ouverture, changement d'état |
| `--duration-slow` | 520 ms | Révélation au scroll, transition de page |

- **Révélation au scroll** : opacité 0 → 1 et translation de **10 px** (pas plus). Durée 520 ms. Déclenchement à 15 % de visibilité, **une seule fois**.
- Aucun effet de parallaxe agressif, aucun zoom au survol sur les photographies (irrespectueux pour des souvenirs) — au maximum une très légère variation d'opacité ou un filet qui s'étire.
- Le slider avant/après suit le doigt **sans inertie** : il doit être exact, pas « joueur ».
- `@media (prefers-reduced-motion: reduce)` : toutes les animations de révélation et de transition sont désactivées (le slider reste fonctionnel, sans transition).

---

## 6.6 Composants

### Boutons

| Variante | Fond | Bordure | Texte | Usage |
|---|---|---|---|---|
| `primary` | `ink` | 1px `ink` | `paper` | CTA principal (« Restaurer mes photos ») |
| `secondary` | transparent | 1px `line-strong` | `ink` | CTA secondaire (« Découvrir les photobooks ») |
| `ghost` | transparent | aucune | `ink` + soulignement au survol | Liens d'action mineurs |
| `accent` | `champagne` | 1px `champagne` | `ink` | **Un seul par page**, pour l'action la plus importante |
| `danger` | transparent | 1px `danger` | `danger` | Suppression |

- Hauteur 52 px sur mobile (cible tactile), 44 px sur desktop. Rayon 6 px.
- Intitulés **à la première personne** et orientés bénéfice : « Restaurer mes photos », « Choisir ce pack », « Envoyer mes photos ».
- Survol : assombrissement de 6 % + translation de 1 px. Rien de plus.
- État désactivé : opacité 45 %, jamais de gris « mort ».
- État de chargement : le libellé est remplacé par trois points animés, la largeur du bouton **ne change pas**.

### Cartes

Fond `paper`, bordure 1 px `line`, rayon 6 px, padding 32 px (mobile 24 px). Au survol : bordure passe à `line-strong`, ombre `md`. Pas de translation verticale (trop "webapp").

**Carte de pack** (la plus importante du site) :
```
┌─────────────────────────────────────┐
│  ── RESTAURATION NUMÉRIQUE ──       │  ← eyebrow, champagne, 11px capitales
│                                     │
│  Premium                            │  ← h3, Fraunces 26px
│  Pour les albums de famille         │  ← tagline, stone, 16px
│                                     │
│  199 DT                             │  ← Fraunces 40px, fin
│                                     │
│  ─────────────────────────────      │  ← filet 1px line
│  ✓  Jusqu'à 50 photos               │  ← puce = fine coche champagne
│  ✓  Restauration avancée            │
│  ✓  Correction résolution/couleurs  │
│                                     │
│  Livraison estimée : 5 à 7 jours    │  ← small, stone
│                                     │
│  [    Choisir ce pack         ]     │  ← pleine largeur
└─────────────────────────────────────┘
```
Le pack recommandé se distingue par un **liseré champagne d'1 px** et un petit libellé « Le plus choisi » en `eyebrow` — pas de ruban, pas de badge coloré, pas de mise à l'échelle.

### Composants spécifiques

| Composant | Principe de conception |
|---|---|
| **`<BeforeAfter>`** | Deux images superposées, `clip-path: inset()` piloté par un `<input type="range">` masqué visuellement mais **accessible au clavier** (flèches = 5 %, `Home`/`End` = 0/100 %). Poignée : un filet vertical d'1 px + un petit disque crème de 44 px. Légendes « Original » / « Restauré » en `eyebrow`, qui s'estompent pendant la manipulation. Ratio d'aspect verrouillé (zéro CLS). `loading="lazy"` sauf si LCP |
| **`<UploadDropzone>`** | Zone de 1 px pointillée `line-strong`, fond `cream`, icône fine. Sur mobile : un gros bouton pleine largeur « Choisir depuis mon téléphone ». État de survol pendant le drag : bordure `champagne`, fond `champagne-soft` (opacité 30 %) |
| **`<PhotoCard>`** (upload) | Vignette carrée, rayon 3 px. Barre de progression : filet de 2 px en bas de la vignette, `champagne`. Échec : vignette en `sand` + icône + bouton « Réessayer ». Bouton de suppression : disque `paper` 32 px en haut à droite, icône fine |
| **`<Stepper>`** (checkout) | 6 pastilles + un filet de progression. L'étape courante : disque `ink` ; franchies : disque vide bordé `champagne` ; futures : `line`. Sur mobile : uniquement « Étape 3 sur 6 » + une barre fine |
| **`<StatusTimeline>`** | Verticale, 6 jalons. Jalons franchis : point `champagne` + date. En cours : point `ink` plein + léger halo. Futurs : point vide `line`. **Un seul texte d'accompagnement**, qui dit quand ce sera prêt |
| **`<Price>`** | `99` en Fraunces 40 px + `DT` en Inter 13 px `stone`, espacement 6 px. Jamais de décimales si elles sont à zéro |
| **`<Testimonial>`** | Fond `cream` ou `paper` + filet d'1 px. Citation en Fraunces italique 20-22 px. Auteur en `eyebrow`. Pas de photo stock, pas de guillemets énormes |
| **`<FAQAccordion>`** | Ligne de séparation 1 px, chevron fin qui pivote de 90° sur 280 ms. Une seule question ouverte à la fois en mobile |
| **`<GalleryGrid>`** | Mosaïque à hauteurs variables (pas de grille stricte — l'irrégularité fait "archive"). Filtres en `eyebrow` sous forme de filets soulignés. Lightbox : fond `ink` à 96 %, flèches fines, `Échap` pour fermer |
| **`<TrustBadges>`** | 3-4 icônes au trait (1,25 px) + une ligne de texte chacune. Pas de sceaux, pas de logos de sécurité tape-à-l'œil |

---

## 6.7 Traitement photographique

C'est le cœur du site — l'image est le produit.

| Règle | Détail |
|---|---|
| Cadre | Les photographies sont présentées **sans bordure ni ombre** sur les fonds clairs, comme dans un livre. Un filet d'1 px uniquement si l'image est très claire sur fond clair |
| Légende | Toujours présente sous une image de galerie : `eyebrow` (catégorie) + une phrase (le travail effectué). La légende fait partie de la photographie |
| Avant/après | **Jamais de filtre artistique** sur l'après. Le résultat doit être la photo d'origine, pas une interprétation |
| Fond des images | Un papier neutre très légèrement texturé (bruit 2 %) sous les images flottantes, jamais d'ombre portée forte |
| Format | AVIF puis WebP, `q=72` pour les photos de galerie (le rendu compte plus que le poids ici), `q=60` pour les vignettes |
| Filigrane | Les images de galerie peuvent porter un filigrane discret en bas à droite (opacité 8 %) |

---

## 6.8 Ce qui est interdit (liste de garde-fous)

- ❌ Glassmorphism, `backdrop-filter`, dégradés multicolores
- ❌ Ombres colorées, néons, glow
- ❌ Rubans « -30 % », compteurs de réduction, urgence artificielle (« Plus que 2 places ! »)
- ❌ Micro-interactions qui rebondissent (`spring`, `bounce`)
- ❌ Photos de banque d'images génériques (famille souriante parfaite)
- ❌ Emojis dans l'interface
- ❌ Polices à empattements fins en dessous de 18 px
- ❌ Plus de 2 niveaux de carte imbriqués
- ❌ Texte centré sur plus de 3 lignes (sauf citations)
- ❌ Plus d'un accent champagne par écran

---

## 6.9 Implémentation

```
src/design-system/
├── tokens.css          # variables CSS brutes (:root)
├── theme.css           # @theme Tailwind v4 → mapping vers les utilitaires
├── typography.css      # échelle, wrap, prose éditoriale
├── motion.css          # durées, courbes, prefers-reduced-motion
└── primitives/         # Button, Card, Field, Badge, Divider, Eyebrow…
```

Tailwind v4 consomme directement les variables via `@theme` :

```css
@theme {
  --color-ink: #100F0D;
  --color-paper: #FDFCF9;
  --color-champagne: #B99B62;
  --font-display: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --radius-md: 6px;
  --ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);
}
```

→ Les utilitaires générés (`bg-paper`, `text-ink`, `font-display`, `rounded-md`, `ease-editorial`) sont **la seule** façon de styler. Aucune valeur arbitraire en dur dans les composants : si un style est utilisé deux fois, il devient un token.

Une page `/dev/design-system` (protégée, non indexée) expose tous les tokens et composants : référence vivante pour l'équipe et garantie de cohérence dans le temps.
