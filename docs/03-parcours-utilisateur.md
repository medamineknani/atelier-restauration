# 03 — Parcours utilisateur, flux & règles métier

> **PHASE 2** — Les parcours qui font (ou perdent) la vente.

---

## 4.1 Le parcours de référence

```
DÉCOUVRIR      →  COMPRENDRE     →  VOIR LE RÉSULTAT  →  CHOISIR  →  ENVOYER  →  PAYER  →  RECEVOIR
Instagram      Homepage:         Slider avant/après   Pack       Upload     Paiement  Email + espace
Facebook       promesse +        Galerie catégorisée  + extras   (mobile)   (TND)     client
TikTok         réassurance       « ma photo est       Tarif      « Mes      Confirm.
Bouche-oreille Preuve sociale    pire que ça »        clair      photos     N° de
                                                      Délai      sont en    commande
                                                                 sécurité »
```

Le site doit pouvoir être traversé **sans lire un paragraphe entier** : chaque étape a une sortie évidente vers la suivante.

---

## 4.2 Flux d'achat détaillé

### Étape 0 — Arrivée typique

`Instagram → /` (mobile). Chargement < 2 s. Le premier écran contient : la promesse, **un avant/après immédiatement visible**, la preuve de confidentialité (1 ligne), et le CTA « Restaurer mes photos ».

> Décision produit : sur mobile, l'avant/après du hero n'est pas un slider à manipuler (trop fragile en LCP) mais une **image de grande qualité avec un curseur pré-positionné à 50 %** et une invite « Glissez pour comparer ». Le slider complet interactif est placé juste en dessous.

### Étape 1 — Choisir le service (`/commande/service`)

- 2 cartes pleine largeur : **Restauration numérique** / **Photobook premium**.
- Carte secondaire : « J'ai déjà une commande en cours, ajouter des photos » → extra.
- Création du brouillon : `POST` Server Action → `orders.status = 'draft'`, cookie `ar_draft` signé (HttpOnly, 30 j).

### Étape 2 — Choisir le pack (`/commande/pack`)

Chaque carte affiche, **dans cet ordre** (l'ordre de décision) :

1. Nom du pack + tagline
2. **Prix** (gros, sobre)
3. Nombre de photos incluses
4. Inclusions (listes courtes, 3-4 puces maximum)
5. **Délai estimatif** (ex. « 5 à 7 jours ouvrés »)
6. CTA « Choisir ce pack »

Le pack le plus choisi est marqué « Le plus choisi » — un seul badge, discret (pas de ruban rouge).

### Étape 3 — Extras (`/commande/extras`)

Affichés **uniquement** s'ils sont compatibles avec le pack (table `product_extras`). Chaque extra : libellé, description, prix, et — si c'est un extra quantifiable — un **sélecteur de quantité** (« photo supplémentaire : ×3 »).

Étape explicitement skippable (« Continuer sans option ») : un mur d'options fait fuir.

### Étape 4 — Upload (`/commande/photos`) — **l'étape critique**

Comportements attendus :

| Comportement | Implémentation |
|---|---|
| Drag & drop | Zone plein écran sur desktop, surlignement au survol |
| **Depuis le téléphone** | Bouton « Choisir depuis mon téléphone » → `capture="environment"` permettant **photo directe ou galerie**. C'est le chemin n°1 en Tunisie |
| Sélection multiple | `multiple` + parcours des dossiers conservé |
| Aperçu immédiat | Vignette générée **côté client** (`createImageBitmap` → canvas → 320 px) avant même la fin de l'upload : le client voit ses photos apparaître tout de suite |
| Progression réelle | `XMLHttpRequest.upload.onprogress` (ou fetch avec `ReadableStream`) → barre par fichier + compteur « 12 / 50 envoyées » |
| Échec | Message par fichier, **bouton « Réessayer »** individuel. Jamais d'échec global qui perd tout |
| Suppression | Croix sur chaque vignette → suppression logique de l'asset + libération du quota |
| Remplacement | « Remplacer » ré-ouvre le sélecteur et supprime l'ancien après succès du nouveau |
| Compteur & quota | « 12 photos sur 50 incluses » + barre discrète. Au-delà : message clair « Vous avez dépassé les 50 photos de votre pack. Chaque photo supplémentaire : 4 DT » → **ajoute automatiquement l'extra**, sans bloquer |
| Validation | Taille max 60 Mo, formats acceptés, dimensions mini. Refus **avant** l'upload (économie de data) |
| Reprise | Le brouillon est sauvegardé : fermer l'onglet et revenir = les photos déjà envoyées sont là |
| Sortie de secours | « Je préfère vous envoyer mes photos plus tard » → commande en `draft` + email avec lien de reprise + possibilité WhatsApp. **On ne perd jamais une vente à cause de l'upload** |

Détail important : **l'upload commence immédiatement** à la sélection, en parallèle par 3 (concurrence limitée pour ne pas saturer une 3G). Pas de bouton « Envoyer » à la fin.

### Étape 5 — Informations client (`/commande/coordonnees`)

Champs : prénom*, nom*, téléphone*, email*, **adresse complète (conditionnelle : photobook uniquement)**, gouvernorat (liste tunisienne), code postal, notes/instructions.

- Un seul écran, colonne unique sur mobile, gros champs (min 48 px), bons `inputmode` (`tel`, `email`) et `autocomplete`.
- Validation **à la sortie du champ** (pas à la soumission).
- Case (pré-cochée **non**) : « Recevoir des nouvelles de l'atelier » — consentement explicite, pas de dark pattern.
- Encart de réassurance juste au-dessus du bouton : « Vos photos restent privées. Suppression après traitement. » + lien `/confidentialite`.
- Si l'utilisateur est connecté : pré-remplissage, sinon mention « Vous pourrez suivre votre commande sans créer de compte ».

### Étape 6 — Récapitulatif & paiement (`/commande/recapitulatif`)

- Récapitulatif : pack, extras, **nombre de photos envoyées**, sous-total, total en TND.
- Choix du moyen de paiement (listée depuis `PAYMENT_PROVIDERS`).
- Le bouton final : **« Confirmer ma commande »** (pas « Payer maintenant » — on achète un service, pas un produit).
- Prix **recalculé côté serveur** à la soumission ; si un prix a changé entre-temps, on affiche le nouveau montant et on demande confirmation (jamais de débit silencieux).

### Étape 7 — Confirmation (`/commande/confirmation/[reference]`)

Affiche : numéro de commande (`AR-2026-0142`), résumé, vignettes des photos envoyées, montant, **statut**, la **prochaine étape concrète** (« Nous recevons vos photos et vous écrivons sous 24 h »), le lien de suivi, l'estimation de livraison, et — si paiement manuel — les instructions.

Email immédiat (identique + pièce jointe du récapitulatif).

---

## 4.3 Machine à états des commandes

```
                    ┌─────────┐
      création      │  draft  │  (brouillon, cookie, non facturé)
      panier ──────►└────┬────┘
                         │ soumission du checkout
                         ▼
              ┌──────────────────────┐
              │  awaiting_payment    │  paiement manuel (virement, espèces, COD)
              └──────┬───────────────┘
                     │ paiement confirmé (webhook ou admin)
                     ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
┌──▼────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐   ┌─▼────────┐   ┌──────────┐
│ received  │──►│ processing │──►│restoring │──►│checking │──►│  ready   │──►│ shipped  │
│ Commande  │   │ Photos en  │   │Restaura- │   │Vérifica-│   │   Prêt   │   │  Expédié │
│   reçue   │   │ traitement │   │tion en   │   │  tion   │   │          │   │(photobook│
└───────────┘   └────────────┘   │  cours   │   └─────────┘   └────┬─────┘   └────┬─────┘
                                 └──────────┘                      │              │
                                                                   │              ▼
                                        digital : livrables        │         ┌───────────┐
                                        téléchargeables            └────────►│ completed │
                                                                             │  Terminé  │
                                                                             └───────────┘
   États transverses : cancelled (annulé) · refunded (remboursé) · on_hold (en attente client :
   question, photos manquantes, complément d'information)
```

### Table de référence des statuts

| Code | Libellé client | Libellé admin | Visible client | Déclencheur | Notification |
|---|---|---|---|---|---|
| `draft` | — | Brouillon | ❌ | Création panier | Non |
| `awaiting_payment` | En attente de paiement | En attente de paiement | ✅ | Checkout avec provider manuel | Email instructions |
| `received` | **Commande reçue** | Reçue | ✅ | Paiement confirmé | Email + alerte admin |
| `processing` | **Photos en traitement** | Traitement | ✅ | Admin | Email |
| `restoring` | **Restauration en cours** | Restauration | ✅ | Admin | Email |
| `checking` | **Vérification** | Contrôle qualité | ✅ | Admin | — |
| `ready` | **Prêt** | Prêt | ✅ | Admin (après upload des livrables) | **Email + lien de téléchargement** |
| `shipped` | **Expédié** | Expédié | ✅ | Admin (n° de suivi) | **Email + suivi** |
| `completed` | **Terminé** | Terminé | ✅ | Admin, ou automatique 14 j après `ready` (digital) | Email de clôture |
| `on_hold` | En attente de votre réponse | En attente client | ✅ | Admin | Email avec question |
| `cancelled` | Annulé | Annulé | ✅ | Admin / client (avant `restoring`) | Email |
| `refunded` | Remboursé | Remboursé | ✅ | Admin | Email |

**Transitions interdites** (gardées côté serveur) :
- On ne peut pas repasser de `restoring` à `received` (mais `restoring → on_hold` et retour sont autorisés).
- Une commande `completed` ou `refunded` est terminale.
- `cancelled` impossible après `ready` (sauf remboursement explicite).

Chaque transition :
1. s'exécute dans une transaction,
2. écrit une ligne `order_status_events` (horodatée, acteur, note optionnelle),
3. déclenche si applicable la notification client (job email),
4. est visible dans la **timeline** de l'espace client et de l'admin.

---

## 4.4 Règles de tarification (centralisées dans `pricingService`)

### Packs numériques

| Pack | Prix | Photos | Délai indicatif |
|---|---|---|---|
| **BASIC** | 99 DT | 20 | 3-5 jours ouvrés |
| **PREMIUM** | 199 DT | 50 | 5-7 jours ouvrés |
| **COMPLETE** | 349 DT | 100 | 8-12 jours ouvrés |

### Extras numériques — **à valider** (valeurs proposées par défaut, éditables en back-office)

| Extra | Prix proposé | Unité |
|---|---|---|
| Photo supplémentaire | **4 DT** | par photo |
| Restauration complexe (déchirure importante, taches sévères, reconstruction de visage) | **25 DT** | par photo |
| Colorisation N&B | **15 DT** | par photo |

### Packs photobook

| Pack | Prix | Photos | Délai indicatif |
|---|---|---|---|
| **CLASSIC** | 449 DT | 30-40 | 10-14 jours ouvrés |
| **WEDDING REVIVAL** | 699 DT | 50-80 | 14-18 jours ouvrés |
| **HERITAGE PREMIUM** | 949 DT | 80-120 | 18-25 jours ouvrés |

### Extras photobook

| Extra | Prix |
|---|---|
| + 4 pages | 50 DT |
| + 8 pages | 90 DT |
| Deuxième exemplaire | à partir de 250 DT |
| Mini-film souvenir | + 150 DT |
| Boîte premium (si non incluse) | + 100 DT |

### Règles de calcul

```
total = prix_pack
      + Σ (prix_extra_unitaire × quantité)
      + frais_livraison (photobook : forfait configurable, 0 si retrait sur place)
      − remise (code promo, V2)

quota_photos = pack.photosIncluses + Σ (extra.photosAdditionnelles × quantité)
délai_estimé = pack.turnaroundDays + Σ (extra.joursSupplementaires × quantité)
```

- Les prix sont **stockés en millimes entiers** (`99000` = 99,000 DT).
- Le total est **toujours recalculé côté serveur** avant paiement. Le client n'envoie jamais un montant.
- Le back-office permet de modifier prix, inclusions, délais et disponibilité de chaque pack/extra **sans redéploiement**.
- Un historique (`price_history`) conserve l'ancien prix lors d'une modification : une commande en cours **garde le prix au moment de la commande** (snapshot dans `order_items`).

---

## 4.5 Espace client — parcours

Le cœur de cible « gardien de mémoire » n'est pas à l'aise avec un espace client classique. Trois accès :

1. **Lien direct depuis l'email** → `/suivi/[token]` (jeton longue durée, révocable). Zéro mot de passe. **C'est le chemin principal.**
2. **Lien magique** : saisie de l'email → email contenant un lien de connexion valable 15 min.
3. **Email + mot de passe** : pour ceux qui le souhaitent.

Contenu du suivi :

- **Timeline visuelle** des 6 statuts, avec celui en cours mis en évidence et, sous chaque étape franchie, sa date.
- Barre de progression globale + **estimation de livraison** (« Livraison prévue entre le 12 et le 16 octobre »).
- Onglet **Mes photos envoyées** (vignettes, nom d'origine, date).
- Onglet **Résultats** : dès `ready`, galerie des photos restaurées + bouton **« Télécharger toutes mes photos »** (ZIP) + téléchargement unitaire. Mention de la durée de disponibilité.
- Onglet **Facture** : PDF téléchargeable.
- Onglet **Messages** : échanges avec l'atelier (réponse possible).
- Suivi photobook : transporteur + numéro de colis.
- Paramètres : langue, notifications, **« Supprimer mon compte et mes données »** (demande traitée sous 30 jours, traçable).

---

## 4.6 Flux opérationnel (back-office)

```
Nouvelle commande payée
   │  alerte email admin
   ▼
Admin ouvre /admin/commandes/[id]
   ├── 1. Contrôle des fichiers reçus (nombre, lisibilité) → « Tout est exploitable ? »
   │       └─ non → statut on_hold + message client (photos illisibles, complément demandé)
   ├── 2. Statut → processing (tri, numérisation si besoin)
   ├── 3. Statut → restoring  (travail de restauration, hors site ou interne)
   ├── 4. Upload des fichiers restaurés (drag & drop, par lot)
   │       └─ chaque fichier peut être associé à son original (mapping nom → original)
   ├── 5. Statut → checking (contrôle qualité interne)
   ├── 6. Statut → ready     → email client automatique + lien de téléchargement
   ├── 7. Photobook : impression/expédition → statut shipped + n° de suivi
   └── 8. Statut → completed
```

Fonctions transverses à chaque étape : note interne (invisible client), message client (visible), journal des actions, aperçu du client (nom, téléphone, email, historique).

---

## 4.7 Cas limites à traiter explicitement

| Situation | Comportement |
|---|---|
| Client envoie **moins** de photos que le pack | Aucun blocage. Relance possible depuis l'admin. Pas de remboursement automatique en V1 (à cadrer commercialement) |
| Client envoie **plus** de photos que le pack | Ajout automatique de l'extra « photo supplémentaire », visible dans le récapitulatif avant paiement |
| Fichier corrompu / non lisible | Détection à l'ingest → vignette d'erreur + invitation à renvoyer. Admin informé |
| Upload interrompu (connexion coupée) | Reprise possible fichier par fichier ; les fichiers déjà envoyés sont conservés |
| Client veut ajouter des photos après paiement | Depuis l'espace client, si statut ≤ `received` : bouton « Ajouter des photos » (génère un extra à régler, ou inclus si sous le quota) |
| Paiement en ligne échoué | Commande reste `draft`/`awaiting_payment`, email « Votre commande vous attend » avec lien de reprise |
| Webhook paiement reçu deux fois | Idempotence sur `provider + providerRef` |
| Client demande l'annulation | Possible en self-service tant que `received`. Ensuite : formulaire + traitement admin |
| Photos très volumineuses (100 × 60 Mo) | Upload séquentiel par 3, pas de ZIP côté client, quota souple, message de patience |
| HEIC non décodable | Message explicite avec la marche à suivre (convertir en JPEG depuis le téléphone) |
| Client sans email | Téléphone uniquement : création de commande manuelle par l'admin depuis le back-office |

---

## 4.8 Ce que mesure chaque étape

| Étape | Métrique | Alerte si |
|---|---|---|
| Homepage → `/commande/service` | Taux de clic CTA | < 4 % |
| Service → Pack | Taux de progression | < 60 % |
| Pack → Upload | Taux de progression | < 70 % |
| Upload → Coordonnées | **Taux de complétion upload** | < 75 % (le point de friction n°1) |
| Coordonnées → Paiement | Taux de progression | < 75 % |
| Paiement → Confirmé | Taux de conversion paiement | < 80 % (en ligne) |
| Global | Panier moyen, part photobook | suivi hebdo |
