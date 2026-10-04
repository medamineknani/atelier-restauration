# 07 — Sécurité, confidentialité & confiance

> **PHASE 2** — Le sujet le plus important du projet : on nous confie des souvenirs irremplaçables.

---

## 8.1 Posture

Deux principes :

1. **La perte d'un original est un incident existentiel pour la marque, pas un bug.** Tout est conçu pour qu'elle soit impossible.
2. **La confiance se prouve avant d'être demandée.** La confidentialité est énoncée dans le hero, à l'étape d'upload, dans le checkout, dans chaque email — pas seulement dans une page légale.

---

## 8.2 Menaces & parades

| # | Menace | Parade |
|---|---|---|
| T1 | **Accès aux photos d'un autre client** (ID deviné, IDOR) | UUID v4 en clé primaire + vérification systématique d'appartenance dans la couche service (`assertOrderAccess`) ; test d'intrusion automatisé sur `/api/files/[id]` |
| T2 | **Exposition publique du bucket** | Bucket privé, listing désactivé, politique « deny all » par défaut, test de configuration en CI |
| T3 | **Vol de session** | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, rotation à l'élévation de privilège, invalidation à la déconnexion, durée courte côté admin |
| T4 | **Upload de fichier malveillant** (polyglotte, script déguisé) | Validation par **magic bytes**, allowlist stricte d'extensions, `Content-Type` réécrit (`application/octet-stream` au téléchargement), `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy` stricte, réencodage de l'image par `sharp` (détruit toute charge utile) |
| T5 | **Déni de service / saturation du stockage** | Limites par commande (nb fichiers, taille), rate-limit par IP et par session, quota global, alerte à 80 % |
| T6 | **Injection SQL** | Drizzle avec requêtes paramétrées — aucune concaténation SQL. Requêtes brutes interdites hors migration |
| T7 | **XSS** | Échappement natif React ; Markdown du back-office rendu via une liste blanche (`rehype-sanitize`) |
| T8 | **CSRF** | Protection native des Server Actions + `SameSite` + vérification d'origine sur les routes API mutantes |
| T9 | **Force brute (connexion, codes)** | Rate-limit progressif, verrouillage temporaire après 5 échecs, CAPTCHA invisible au-delà |
| T10 | **Fuite côté admin** (compte compromis) | Comptes admin nominatifs (jamais partagés), mot de passe fort imposé, **2FA TOTP** recommandée à l'activation, journal d'audit consultable, alerte email sur connexion depuis une nouvelle IP |
| T11 | **Suppression accidentelle** | Soft-delete + délai de grâce 7 j + confirmation explicite (`taper le numéro de commande`) pour toute suppression d'original |
| T12 | **Rétention excessive** | Politique de rétention automatisée (§5.7) + job quotidien + rapport mensuel |
| T13 | **Fuite de métadonnées** (GPS sur une photo de famille) | **EXIF/IPTC supprimés à l'ingest**, avant tout stockage durable |
| T14 | **Webhook paiement forgé** | Vérification de signature HMAC, idempotence, rejeu impossible (fenêtre de temps) |
| T15 | **Énumération de comptes** | Messages d'erreur d'authentification identiques quel que soit le cas ; le lien magique ne révèle jamais si un compte existe |

---

## 8.3 Contrôles techniques (checklist d'implémentation)

### Transport & en-têtes
- [ ] HTTPS strict (HSTS `max-age=31536000; includeSubDomains`)
- [ ] CSP : `default-src 'self'` ; `img-src 'self' data: https://<domaine-stockage>` ; `script-src 'self'` (+ nonce pour les scripts inline éventuels) ; `frame-ancestors 'none'`
- [ ] `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive (caméra/micro/géo désactivés sauf upload)
- [ ] `X-Frame-Options: DENY`

### Données
- [ ] Chiffrement at-rest (Postgres + stockage objet)
- [ ] Chiffrement en transit partout (TLS 1.2+)
- [ ] Mots de passe : Argon2id (ou bcrypt coût ≥ 12), jamais de SHA nu
- [ ] `guest_access_token` et `download_tokens` **hashés** en base
- [ ] Secrets hors du dépôt, rotation documentée
- [ ] `env.ts` validé par Zod au démarrage

### Applicatif
- [ ] `requireAdmin()` dans **chaque** layout, page et action du back-office (le middleware ne suffit pas)
- [ ] `assertOrderAccess(orderId, user)` appelé par tout service touchant une commande
- [ ] Rate-limit : `/api/auth/*`, `/api/uploads/*`, `/admin/login`, `/api/contact`, `/api/jobs/run`
- [ ] Validation Zod en entrée de **toute** Server Action et route API
- [ ] Journalisation des accès fichiers (`asset.downloaded`, `asset.uploaded`, `asset.deleted`)

### Exploitation
- [ ] Sauvegarde quotidienne + test de restauration mensuel (procédure écrite)
- [ ] Versionnage du bucket des originaux (récupération d'une version supprimée)
- [ ] Supervision : `/api/health`, alertes sur échec de job et sur quota de stockage
- [ ] Revue de sécurité trimestrielle (dépendances `npm audit`, `pnpm audit`, renouvellement des secrets)
- [ ] Plan de réponse à incident écrit (qui fait quoi si un fichier est perdu / si une fuite est suspectée)

---

## 8.4 Conformité

| Référence | Application |
|---|---|
| **INPDP** — loi n° 2004-63 (Tunisie, protection des données personnelles) | Base légale : exécution du contrat. Déclaration/demande d'autorisation à vérifier avec un conseil. Droit d'accès, de rectification, d'opposition, retrait du consentement. **Une photographie de personne est une donnée personnelle** (et souvent une donnée sensible par inférence : santé, origine, convictions) |
| **RGPD** (si clientèle européenne / diaspora) | Anticipé par conception : registre de traitement, durées de conservation, demande d'export et de suppression, sous-traitants listés |
| **Droit de la consommation tunisien** | Conditions générales de vente, délai de rétractation, mention des prix TTC, informations légales |
| **Propriété intellectuelle** | Les photographies appartiennent au client. Nous n'acquérons **aucun droit** dessus. Clause explicite dans les CGV |

> ⚠️ **Le site fournira la structure et un contenu de départ pour les pages légales, mais ces textes devront être relus et validés par un juriste tunisien.** C'est un livrable externe, pas une production de l'équipe technique.

---

## 8.5 Engagements publics (à afficher sur le site)

Ce sont des promesses **prouvables** — chacune correspond à un contrôle technique réel.

| Engagement affiché | Preuve technique |
|---|---|
| « Vos originaux ne sont jamais modifiés ni supprimés pendant le traitement » | Stockage immuable + versionnage + journal |
| « Vos photos ne sont jamais rendues publiques » | Bucket privé, URLs signées, aucun listing |
| « Aucune utilisation commerciale sans votre autorisation écrite » | Aucun affichage public possible sans création explicite d'une entrée `transformations` + consentement tracé (`consent_signed_at`) |
| « Les données de localisation sont supprimées à la réception » | `exif_stripped = true` vérifiable en base |
| « Suppression de vos originaux 90 jours après livraison » | Job `enforce_retention` + email de prévenance |
| « Seules deux personnes ont accès à vos photos » | Comptes admin nominatifs + journal d'audit |
| « Stockage en Europe, chiffré » | Région du provider + chiffrement at-rest |
| « Vous pouvez demander la suppression immédiate » | Bouton en espace client + traitement sous 30 jours |

Chaque engagement est repris tel quel dans la page `/confidentialite` et dans le bloc de réassurance de la page d'upload.

---

## 8.6 La page « Confiance & confidentialité » (`/confidentialite`)

Ce n'est **pas** une page légale de plus : c'est une page de vente.

Structure :

1. **Hero sobre** — « Ce que vous nous confiez ne nous appartient pas. »
2. **4 engagements** en grandes cartes : privé · protégé · supprimé · jamais réutilisé
3. **Le parcours d'une photo**, en 6 étapes visuelles : réception chiffrée → suppression des métadonnées → traitement en interne → contrôle → livraison par lien privé → suppression. *Montrer le processus rassure plus que le promettre.*
4. **Ce que nous ne faisons jamais** — liste négative (c'est très efficace) : pas de revente, pas d'entraînement, pas d'affichage public, pas de tierce partie, pas de conservation cachée
5. **Durées de conservation** — tableau clair
6. **Vos droits** — accès, rectification, suppression, export ; formulaire en un clic
7. **Sécurité technique** — sans jargon : chiffrement, accès restreint, journalisation, sauvegardes
8. **Contact direct** — une vraie personne, un email, un téléphone

Ton : factuel, calme, jamais défensif. Le but est que le visiteur se dise « ils ont pensé à tout » et passe à l'upload.
