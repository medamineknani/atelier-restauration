# 06 — Dashboard administrateur

> **PHASE 2** — Le back-office est un outil de production, pas un formulaire de configuration.
> Il doit permettre de traiter une commande **sans quitter l'écran**.

---

## 7.1 Principes

1. **Une commande = un écran.** Tout ce qui concerne une commande (client, fichiers, statut, notes, facture, journal) est accessible dans `/admin/commandes/[id]`, sans navigation ailleurs.
2. **Le statut est l'action centrale.** Un changement de statut est l'opération la plus fréquente : elle est donc au centre, visible, en un clic, avec message client optionnel intégré.
3. **Les fichiers sont l'interface.** L'admin travaille sur des images : les vignettes sont grandes, les actions de téléchargement sont directes, l'upload des résultats se fait par lot.
4. **Rien n'est supprimé sans trace.** Toute action destructrice passe par une confirmation et écrit dans le journal.
5. **Le back-office est en français, sans i18n public.** L'interface d'administration n'a pas besoin d'être multilingue en V1 (elle reste isolée du reste du site).
6. **Mobile-tolerant.** L'essentiel (voir une commande, changer un statut, répondre à un client) doit être faisable depuis un téléphone : l'admin n'est pas toujours devant un ordinateur.

---

## 7.2 Structure

```
/admin
├── (tableau de bord)
├── /commandes                    Liste + filtres + actions en lot
├── /commandes/[id]               ★ ÉCRAN PRINCIPAL
├── /clients                      Fiches clients + historique
├── /catalogue
│   ├── /packs                    Packs (créer, éditer, activer, prix)
│   ├── /extras                   Extras + compatibilité avec les packs
│   └── /categories
├── /contenu
│   ├── /galerie                  Transformations avant/après
│   ├── /temoignages              Modération
│   ├── /faq
│   └── /pages                    Blocs éditoriaux des pages marketing
├── /parametres
│   ├── /marque                   Nom, logo, coordonnées, réseaux
│   ├── /commercial               Devise, livraison, TVA, délais par défaut
│   ├── /paiement                 Providers activés + clés (masquées)
│   ├── /stockage                 Driver, limites, rétention
│   ├── /notifications            Templates d'email + expéditeur
│   └── /equipe                   Comptes admin + rôles + 2FA
└── /journal                      Journal d'audit (filtrable)
```

---

## 7.3 Écran : tableau de bord `/admin`

| Bloc | Contenu |
|---|---|
| **À traiter aujourd'hui** | Nombre de commandes en `received` (non démarrées) + les plus anciennes en tête. C'est la file de production |
| **En cours** | Répartition par statut (`processing`, `restoring`, `checking`) avec le nombre de jours écoulés depuis l'entrée dans le statut |
| **En attente client** | `on_hold` — relancer |
| **Alertes** | Commandes dépassant le délai annoncé · paiements manuels non confirmés depuis > 48 h · fichiers en échec · quota de stockage |
| **Indicateurs** | Commandes du mois · chiffre d'affaires · panier moyen · part photobook · délai moyen de traitement |
| **Dernières commandes** | 10 dernières, avec accès direct |

---

## 7.4 Écran : liste des commandes `/admin/commandes`

- **Filtres** : statut (multi), type (digital/photobook/extra), période, recherche (référence, nom, email, téléphone), « en retard » , « non payé ».
- **Tri** : date de création, délai restant, montant.
- **Colonnes** : référence · client (nom + téléphone) · type · pack · nb photos · montant · statut (pastille) · délai restant · dernière activité.
- **Actions en lot** : changement de statut, export CSV, envoi d'un message groupé.
- **Vue densité** : compacte par défaut (l'admin gère des dizaines de commandes), avec pastilles de statut colorées sobrement (jamais de rouge vif).

---

## 7.5 ★ Écran principal : détail d'une commande `/admin/commandes/[id]`

C'est l'écran le plus utilisé du projet. Sa conception conditionne la productivité quotidienne.

### 7.5.1 En-tête — toujours visible

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Commandes          AR-2026-0142            [ ● Restauration en cours ]     │
│                                                                              │
│  Restauration numérique · Pack PREMIUM · 199 DT · 47 photos                  │
│  Créée le 2 oct. 2026 · Payée le 2 oct. (Konnect · ref kx_88213)             │
│  Livraison estimée : 9 au 11 octobre   ⚠ 1 jour de retard                    │
│                                                                              │
│  [ ▸ Changer le statut ]   [ Message au client ]   [ ⋯ Plus ]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Le bloc « Changer le statut » ouvre un panneau avec : nouveau statut (seules les transitions autorisées sont proposées), message optionnel au client (pré-rempli par un modèle par statut), case « notifier par email », et bouton de confirmation. **Une seule action = statut changé + email envoyé + timeline mise à jour.**

### 7.5.2 Pipeline de statut (barre horizontale)

```
○ Reçue  ● Traitement  ○ Restauration  ○ Vérification  ○ Prêt  ○ Expédié  ○ Terminé
2 oct.   3 oct.        ← vous êtes ici
```
Cliquer sur un jalon affiche son historique (qui, quand, message associé).

### 7.5.3 Onglets

#### ① Photos reçues
- Grande mosaïque de vignettes (les vignettes sont assez grandes pour juger de l'état d'une photo : ~220 px).
- Pour chaque fichier : nom d'origine, dimensions, poids, date, statut de traitement.
- Actions : **télécharger l'original** · **télécharger tous les originaux (ZIP)** · ouvrir en plein écran · marquer « illisible » · supprimer (avec confirmation).
- Un bandeau si des fichiers sont en échec ou illisibles.
- Compteur « 47 / 50 photos reçues » bien visible.

#### ② Résultats (photos restaurées)
- **Zone d'upload par lot** (drag & drop de 100 fichiers). Barres de progression individuelles.
- **Association automatique** : si le nom du fichier restauré correspond au nom d'origine (`IMG_0421.jpg`), il est apparié automatiquement à l'original (remplit `paired_asset_id`). Sinon, appariement manuel par glisser-déposer.
- Aperçu côte à côte original ↔ restauré pour valider.
- Bouton **« Publier les résultats »** : passe la commande à `ready`, génère les jetons de téléchargement, envoie l'email au client. (Action irréversible → confirmation.)
- Possibilité de dépublier en cas d'erreur, tant que la commande n'est pas `completed`.

#### ③ Client
- Coordonnées complètes (nom, téléphone, email), boutons d'action directe : **appeler** (tel:), **WhatsApp**, **email**.
- Adresse de livraison (photobook) — copiable en un clic pour le transporteur.
- Historique des commandes du client (fidélité, volume).
- Préférences de notification.

#### ④ Notes & messages
- Fil chronologique unifié : notes internes (fond `sand`, mention « interne ») et messages client (fond `cream`).
- Zone de saisie avec bascule **Interne / Client**.
- Les messages « client » partent par email et apparaissent dans l'espace client.

#### ⑤ Facture
- Facture générée automatiquement au paiement : aperçu, téléchargement PDF, renvoi par email, possibilité d'avoir/remboursement (création d'une facture négative).

#### ⑥ Journal
- Toutes les actions liées à la commande : qui a téléchargé quoi et quand, changements de statut, suppressions, envois d'email, tentatives de paiement.
- Lecture seule, filtrable.

---

## 7.6 Écran : catalogue `/admin/catalogue`

### Édition d'un pack

| Champ | Contrôle |
|---|---|
| Nom, tagline, description | Par onglet de langue (FR / EN / AR) — bascule par sélecteur, pas de formulaire à rallonge |
| Inclusions | Éditeur de liste (ajouter/retirer/réordonner des puces) |
| Prix | Champ numérique en DT (saisie `199`), stocké en millimes. **Avertissement si le prix change de plus de 20 %** (garde-fou contre la faute de frappe) |
| Photos incluses / min-max | Numériques |
| Délai min-max (jours) | Numériques |
| Frais de port requis | Case |
| Actif / Retiré | Bascule (un pack retiré reste visible sur les anciennes commandes) |
| « Le plus choisi » | Bascule (un seul actif à la fois) |
| Ordre d'affichage | Glisser-déposer |
| SEO | Titre et description par langue |
| Extras compatibles | Cases à cocher multi-sélection |

**Historique des prix** affiché en bas : qui a changé quoi, quand, et pourquoi (champ « raison » optionnel).

### Extras
Mêmes champs + : mode de tarification (`forfait` / `par photo` / `par page` / `par exemplaire`), quantité maximale, photos ou pages accordées.

> Règle produit : **toute modification de prix est immédiatement visible sur le site** (`revalidateTag('catalog')`) mais **ne change jamais le prix d'une commande déjà passée** (snapshot dans `order_items`).

---

## 7.7 Écran : contenu

### Galerie avant/après (`/admin/contenu/galerie`)
- Liste des transformations avec vignette « avant », catégorie, ordre, publié/ brouillon.
- Édition : upload des deux images (avant / après), catégorie, titre, **description du travail effectué** (par langue), textes alternatifs (avant / après), case « mise en avant ».
- **Champ obligatoire : consentement du client** (`consent_ref`, date, case « autorisation écrite obtenue »). Aucune publication sans cette case — c'est une règle métier, pas une option.
- Aperçu du rendu dans la grille publique avant publication.

### Témoignages
- Modération (`en attente` → `approuvé`), nom, ville, contexte, note, avatar, citation par langue, mise en avant.
- Import depuis un formulaire public ou saisie manuelle (entretien téléphonique).

### FAQ
- Catégories, questions/réponses par langue, ordre, publication.
- Une FAQ peut être **réutilisée** sur plusieurs pages (liaison `page_key`).

### Pages (`/admin/contenu/pages`)
- Blocs éditoriaux éditables par clé de page (`home.hero`, `about.story`, `trust.engagements`, …).
- Édition de texte riche **restreint** (gras, italique, liste, lien) — pas de HTML libre.
- Aperçu avant publication + historique des versions (garder les 10 dernières).

---

## 7.8 Écran : paramètres

| Section | Contenu |
|---|---|
| **Marque** | Nom, logo, favicon, coordonnées, téléphone, WhatsApp, réseaux, horaires |
| **Commercial** | Devise, frais de port, TVA, délais par défaut, mentions légales |
| **Paiement** | Providers activés et ordre d'affichage, clés API **masquées** (affichage `sk_live_••••8f2`), bascule test/production, URL de webhook à copier |
| **Stockage** | Driver, bucket, région, taille max par fichier, nombre max par commande, durées de rétention, quota |
| **Notifications** | Expéditeur, signature, aperçu de chaque template d'email (les 9 déclencheurs), test d'envoi |
| **Équipe** | Comptes admin, rôles, 2FA, dernière connexion, révocation de session |

---

## 7.9 Journal d'audit `/admin/journal`

- Filtres : acteur, action, entité, période.
- Actions tracées : connexion admin, changement de statut, téléchargement d'un original, suppression, modification de prix, modification de contenu, envoi d'email, accès refusé, tentative de paiement.
- Conservation 24 mois. Export CSV.
- **Lecture seule** — même un superadmin ne peut pas effacer le journal.

---

## 7.10 Rôles & permissions

| Action | `admin` | `superadmin` |
|---|---|---|
| Voir / traiter les commandes | ✅ | ✅ |
| Télécharger les originaux | ✅ | ✅ |
| Uploader les résultats | ✅ | ✅ |
| Changer le statut | ✅ | ✅ |
| Écrire au client | ✅ | ✅ |
| Gérer témoignages / FAQ / galerie | ✅ | ✅ |
| **Modifier les prix et le catalogue** | ❌ | ✅ |
| **Gérer les comptes admin** | ❌ | ✅ |
| **Modifier les paramètres de paiement / stockage** | ❌ | ✅ |
| **Supprimer définitivement un original** | ❌ | ✅ (avec confirmation renforcée) |
| Consulter le journal | ✅ (ses actions + vue globale) | ✅ |

---

## 7.11 File de production & SLA

Le back-office intègre une notion de **SLA interne** : chaque statut a une durée cible (ex. `received` → pris en charge sous 24 h). Le tableau de bord affiche :

- les commandes **en retard** (pastille ambre),
- les commandes **très en retard** (pastille brique),
- le **délai moyen réel** de traitement sur 30 jours (indicateur de qualité).

Le délai annoncé au client est calculé à partir du pack ; le délai réel est mesuré. L'écart entre les deux est le principal indicateur de santé opérationnelle.
