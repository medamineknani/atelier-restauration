# 00 — Analyse du projet & synthèse

> **PHASE 1** — Lecture du business, du marché et des exigences, avant toute ligne de code.
> Statut : proposition soumise à validation. Dernière mise à jour : 2026-10-04.

---

## 1.1 Ce que le client achète vraiment

Lebrief parle de « restauration photo ». Ce n'est pas le produit. **Le produit, c'est la soulagement d'une culpabilité et la récupération d'une émotion.**

La personne qui a une boîte à chaussures remplie de photos de ses grands-parents vit avec une petite dette morale : elle *sait* que ces photos se dégradent, elle *sait* qu'elle devrait faire quelque chose, et elle ne le fait pas depuis des années. Le déclencheur d'achat est presque toujours un événement : un décès, un mariage, un déménagement, un anniversaire — ou simplement un scroll Instagram un dimanche soir.

Conséquences directes sur le produit :

| Insight | Traduction produit |
|---|---|
| Le client n'achète pas un « service IA », il **confie un objet irremplaçable** | Le mot *confiance* doit porter toute l'expérience : on parle de dépôt, de coffre, de confidentialité, jamais de « téléversez vos fichiers » |
| La peur n°1 est **la perte de l'original** | Promesse technique explicite : les originaux ne sont jamais altérés, jamais exposés, jamais réutilisés. Message visible *avant* l'upload, pas seulement dans les CGV |
| La peur n°2 est **la trahison de l'original** (« on va me la rendre trop lisse, méconnaissable ») | Le positionnement « préserver l'identité et l'authenticité » est un différenciateur, pas une contrainte. Il faut le prouver visuellement (avant/après sobres, pas de retouches « beauté ») |
| La peur n°3 est **l'arnaque** (payer et ne rien recevoir) | Preuve sociale locale,过程的 statut visible, paiement rassurant, possibilité de paiement à la livraison / virement pour le marché tunisien |
| L'objet est **irremplaçable et non reproductible** | Une erreur n'est pas « un incident », c'est une perte définitive. → sauvegarde, double stockage, journal d'audit, suppression maîtrisée |

> Le fil rouge de tout le site tient en une phrase, à faire figurer dans le hero :
> **« Vous ne nous envoyez pas des fichiers. Vous nous confiez des souvenirs. »**

---

## 1.2 Les quatre questions qui décident de la conversion

Un visiteur qui arrive depuis Instagram ou TikTok décide en moins de 20 secondes. Le site doit répondre dans cet ordre précis :

1. **« Est-ce qu'ils peuvent sauver *ma* photo ? »** → galerie avant/après catégorisée (mariage, famille, N&B, photos très abîmées) avec des cas *pires* que le sien. C'est la page la plus rentable du site après la homepage.
2. **« À quoi ça ressemblera ? »** → composant avant/après interactif, sans friction, dès le premier écran.
3. **« Combien ? »** → prix affichés, lisibles, non agressifs. Un prix caché sur ce type de service = abandon immédiat.
4. **« Est-ce que je peux leur faire confiance ? »** → section confidentialité assumée, photos hébergées en Europe, suppression garantie, aucun usage commercial.

Tout le reste (FAQ, à propos, storytelling) est du soutien, pas du moteur.

---

## 1.3 Personas

### A. « Le gardien de mémoire » — 45-70 ans, cœur de cible
Photos argentiques, albums familiaux, mariage. Veut un objet à transmettre.
- **Déclencheur** : succession, anniversaire, album à offrir.
- **Freins** : ne maîtrise pas le numérique (upload = obstacle majeur), méfiance envers le paiement en ligne.
- **Implications** : upload **depuis le téléphone** ultra-simple (WhatsApp / bouton « envoyer mes photos » qui fonctionne sans compte), checkout en 3 écrans max, **virement bancaire et paiement à la livraison disponibles**, possibilité de commander par téléphone relayée sur le site. Espace de suivi compréhensible sans jargon.

### B. « L'enfant qui numérise » — 30-50 ans
Achète pour ses parents ou grands-parents. À l'aise en ligne, achète émotionnellement, parfois dans l'urgence.
- **Déclencheur** : cadeau, deuil, grossesse/mariage.
- **Freins** : veut être sûr de la qualité avant de payer, compare.
- **Implications** : preuve visuelle forte, packs clairs, option photobook en montée de gamme naturelle, email de suivi soigné (c'est lui qui le recevra).

### C. « Le collectionneur / passionné » — volume + exigence
Vieilles photos de ville, portraits studio, archives associative.
- **Implications** : devis sur mesure, tarif dégressif, tolérance aux gros volumes (100+ photos), formats TIFF.

> **Décision produit** : le parcours standard est optimisé pour **A et B**. C est géré par un formulaire « demande sur mesure » branché sur le même back-office (pas de tunnel dédié en V1).

---

## 1.4 Risques identifiés (et parades)

| # | Risque | Gravité | Parade |
|---|---|---|---|
| R1 | **Perte d'un original** (bug, suppression, corruption) | Critique — destructeur de marque | Stockage immuable des originaux (versionnage), soft-delete, double copie, backup quotidien, aucune écrasure, journal d'audit, restauration depuis backup testée |
| R2 | **Fuite de photos personnelles** | Critique | Bucket privé + URLs signées courte durée, aucun listing public, EXIF/GPS supprimés à l'ingest, accès admin tracé, mention INPDP |
| R3 | **Attente client insupportable** (« ça fait 3 semaines ») | Haute | Promesse de délai **par pack** affichée avant achat, statut visible en espace client, notification email à chaque changement d'état |
| R4 | **Paiement en ligne qui échoue** sur le marché tunisien | Haute | Architecture de paiement **modulaire** + driver « manuel » (virement / espèces / à la livraison) actif dès le jour 1, confirmation admin manuelle |
| R5 | **Upload qui échoue sur mobile** (connexion faible, 50 photos) | Haute | Upload direct vers le stockage (pas via le serveur Next), reprise/renvoi fichier par fichier, validation côté client, pas de timeout global, possibilité « envoyez-nous vos photos plus tard » |
| R6 | **Résultat décevant** (« trop lissé ») | Moyenne | Charte de restauration énoncée publiquement (ce qu'on fait / ce qu'on ne fait pas), un aller-retour de retouche inclus sur les packs PREMIUM+ |
| R7 | **Coût de stockage** qui dérive | Moyenne | Politique de rétention explicite (originaux 90 j après livraison, restaurées 12 mois), purge automatique, seuils d'alerte |
| R8 | **Le site devient un « template IA »** | Moyenne (image de marque) | Design system documenté et tenu (§05), photographie réelle, copywriting sobre, zéro stock-photo générique |

---

## 1.5 Décisions structurantes proposées

| Sujet | Décision proposée | Pourquoi |
|---|---|---|
| Forme du produit | **Application Next.js unique** (frontend + backend dans le même repo), pas de micro-services | Un petit business n'a pas besoin d'un backend séparé. Moins de déploiements, moins de bugs, un seul type à partager entre front et back |
| Rendu | **RSC par défaut**, interactivité isolée dans des composants client ciblés | Performance mobile (trafic social) + SEO. Le JS envoyé au téléphone reste minimal |
| Contenu commercial | **Packs / extras / FAQ / témoignages / galerie en base de données**, copy d'interface en fichiers de traduction | Les prix doivent être modifiables sans redéploiement (exigence §6 du brief) ; le texte d'interface, lui, vit avec le code |
| Prix | Stockés en **millimes entiers** (`99000` = 99,000 DT) | Le dinar tunisien a 3 décimales. Évite tout arrondi flottant |
| Paiement | **Interface `PaymentProvider` + drivers**, driver `manual` actif au lancement | Le brief demande de ne rien hardcoder ; le marché tunisien impose la flexibilité |
| Stockage | **Abstraction `StorageDriver`** : `local` (dev) / `s3` (prod) | Upload direct en prod (presigned), aucun fichier client dans le repo |
| Langues | **FR par défaut sans préfixe**, `/en` et `/ar` (RTL) préparés | Meilleur SEO local + base propre pour l'international |
| Authentification | **Better Auth** (email + mot de passe, puis lien magique), rôles `client` / `admin` | Self-hosted, typé, s'intègre proprement à Next 16, pas de dépendance à un SaaS tiers pour des données sensibles |
| Base de données | **Postgres + Drizzle ORM**, PGlite en développement | Même dialecte SQL en dev et en prod, zéro Docker nécessaire, migrations lisibles |

---

## 1.6 Ce qui est volontairement **hors** périmètre de la V1

Pour ne pas complexifier inutilement (§19 du brief) :

- Application mobile native (le site mobile-first suffit).
- Traitement automatique des photos par IA côté serveur (le workflow reste **humain** — c'est le positionnement).
- Chat en direct (un WhatsApp Business cliquable + email suffisent).
- Multi-devises dynamiques (TND uniquement en V1, l'architecture le permet ensuite).
- Programme de parrainage / abonnement.
- Sous-traitance à des restaurateurs externes avec portail dédié.

---

## 1.7 Indicateurs de succès (à instrumenter dès la V1)

| Métrique | Cible V1 |
|---|---|
| LCP mobile (4G simulée depuis Tunis) | < 2,0 s |
| CLS | < 0,05 |
| INP | < 200 ms |
| Taux d'abandon à l'étape « Upload » | < 25 % |
| Taux de complétion du checkout (panier → payé) | > 55 % |
| Part du trafic mobile | attendue 75-85 % → l'expérience mobile est la priorité n°1 |
| Panier moyen | suivi ; l'upsell photobook est le principal levier |

---

## 1.8 Suite

Voir dans l'ordre :

- `01-architecture-technique.md`
- `02-sitemap-et-seo.md`
- `03-parcours-utilisateur.md`
- `04-schema-base-de-donnees.md`
- `05-design-system.md`
- `06-dashboard-admin.md`
- `07-securite-confidentialite.md`
- `08-roadmap.md`
- `09-homepage-wireframe.md`
