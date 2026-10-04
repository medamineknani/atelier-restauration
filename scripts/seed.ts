/**
 * Jeu de données de départ : catalogue, FAQ, témoignages, galerie, réglages
 * et compte administrateur.
 *
 *   npm run db:seed
 *
 * Le script est idempotent : il vide les tables concernées avant d'insérer.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { hashPassword } from "../src/lib/auth/password";
import * as schema from "../src/server/db/schema";


// Les images de galerie sont produites par `npm run gallery` dans la racine
// de stockage locale — jamais dans `storage/`, répertoire non persisté.
const GALLERY_DIR = path.join(
  process.cwd(),
  process.env.STORAGE_LOCAL_DIR ?? ".data/files",
  "gallery",
);
const DT = (dinars: number) => Math.round(dinars * 1000);

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

type SeedProduct = {
  slug: string;
  kind: "pack" | "extra";
  family: "digital" | "photobook";
  price: number;
  photos?: number;
  photosMin?: number;
  photosMax?: number;
  pages?: number;
  minDays: number;
  maxDays: number;
  extraPhotos?: number;
  extraPages?: number;
  pricingMode?: "flat" | "per_photo" | "per_page" | "per_copy";
  maxQuantity?: number;
  requiresShipping?: boolean;
  featured?: boolean;
  sort: number;
  fr: { name: string; tagline: string; features: string[] };
  en: { name: string; tagline: string; features: string[] };
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "basic",
    kind: "pack",
    family: "digital",
    price: 99,
    photos: 20,
    minDays: 3,
    maxDays: 5,
    sort: 1,
    fr: {
      name: "Basic",
      tagline: "Pour commencer",
      features: ["Jusqu'à 20 photos", "Amélioration qualité / couleurs", "Fichiers HD"],
    },
    en: {
      name: "Basic",
      tagline: "To begin with",
      features: ["Up to 20 photographs", "Quality / colour enhancement", "HD files"],
    },
  },
  {
    slug: "premium",
    kind: "pack",
    family: "digital",
    price: 199,
    photos: 50,
    minDays: 5,
    maxDays: 7,
    featured: true,
    sort: 2,
    fr: {
      name: "Premium",
      tagline: "Pour les albums de famille",
      features: ["Jusqu'à 50 photos", "Restauration avancée", "Correction résolution / couleurs"],
    },
    en: {
      name: "Premium",
      tagline: "For family albums",
      features: ["Up to 50 photographs", "Advanced restoration", "Resolution / colour correction"],
    },
  },
  {
    slug: "complete",
    kind: "pack",
    family: "digital",
    price: 349,
    photos: 100,
    minDays: 8,
    maxDays: 12,
    sort: 3,
    fr: {
      name: "Complete",
      tagline: "Pour les archives familiales",
      features: [
        "Jusqu'à 100 photos",
        "Restauration avancée",
        "Traitement des photos endommagées",
        "Upscale haute résolution",
      ],
    },
    en: {
      name: "Complete",
      tagline: "For family archives",
      features: [
        "Up to 100 photographs",
        "Advanced restoration",
        "Damaged photographs handled",
        "High-resolution upscaling",
      ],
    },
  },
  {
    slug: "classic",
    kind: "pack",
    family: "photobook",
    price: 449,
    photosMin: 30,
    photosMax: 40,
    minDays: 10,
    maxDays: 14,
    requiresShipping: true,
    sort: 1,
    fr: {
      name: "Classic",
      tagline: "L'essentiel, relié",
      features: ["30 à 40 photos", "Restauration", "Design", "Photobook couverture rigide standard"],
    },
    en: {
      name: "Classic",
      tagline: "The essentials, bound",
      features: ["30 to 40 photographs", "Restoration", "Design", "Standard hardcover photobook"],
    },
  },
  {
    slug: "wedding-revival",
    kind: "pack",
    family: "photobook",
    price: 699,
    photosMin: 50,
    photosMax: 80,
    pages: 30,
    minDays: 14,
    maxDays: 18,
    requiresShipping: true,
    featured: true,
    sort: 2,
    fr: {
      name: "Wedding Revival",
      tagline: "L'album de mariage, retrouvé",
      features: [
        "50 à 80 photos",
        "Restauration complète",
        "Design personnalisé",
        "Photobook 30 × 30 cm lay-flat",
        "Couverture rigide",
      ],
    },
    en: {
      name: "Wedding Revival",
      tagline: "The wedding album, recovered",
      features: [
        "50 to 80 photographs",
        "Full restoration",
        "Bespoke design",
        "30 × 30 cm lay-flat photobook",
        "Hard cover",
      ],
    },
  },
  {
    slug: "heritage-premium",
    kind: "pack",
    family: "photobook",
    price: 949,
    photosMin: 80,
    photosMax: 120,
    pages: 40,
    minDays: 18,
    maxDays: 25,
    requiresShipping: true,
    sort: 3,
    fr: {
      name: "Heritage Premium",
      tagline: "Ce que l'on transmet",
      features: [
        "80 à 120 photos",
        "Restauration avancée",
        "Photobook premium 30 × 30 cm",
        "30 à 40 pages",
        "Boîte de présentation",
      ],
    },
    en: {
      name: "Heritage Premium",
      tagline: "What gets passed on",
      features: [
        "80 to 120 photographs",
        "Advanced restoration",
        "Premium 30 × 30 cm photobook",
        "30 to 40 pages",
        "Presentation box",
      ],
    },
  },
  /* --- Extras numériques --- */
  {
    slug: "extra-photo",
    kind: "extra",
    family: "digital",
    price: 4,
    extraPhotos: 1,
    pricingMode: "per_photo",
    maxQuantity: 200,
    minDays: 0,
    maxDays: 1,
    sort: 10,
    fr: { name: "Photo supplémentaire", tagline: "Au-delà du pack", features: ["Restauration identique au pack choisi"] },
    en: { name: "Extra photograph", tagline: "Beyond the pack", features: ["Same restoration as the chosen pack"] },
  },
  {
    slug: "extra-complexe",
    kind: "extra",
    family: "digital",
    price: 25,
    pricingMode: "per_photo",
    maxQuantity: 50,
    minDays: 2,
    maxDays: 3,
    sort: 11,
    fr: {
      name: "Restauration complexe",
      tagline: "Déchirures, taches sévères, reconstruction",
      features: ["Reconstruction des zones manquantes", "Travail manuel long"],
    },
    en: {
      name: "Complex restoration",
      tagline: "Tears, heavy stains, reconstruction",
      features: ["Reconstruction of missing areas", "Lengthy manual work"],
    },
  },
  {
    slug: "extra-colorisation",
    kind: "extra",
    family: "digital",
    price: 15,
    pricingMode: "per_photo",
    maxQuantity: 100,
    minDays: 1,
    maxDays: 2,
    sort: 12,
    fr: {
      name: "Colorisation noir & blanc",
      tagline: "Des teintes justes, jamais inventées",
      features: ["Recherche documentaire des teintes", "Colorisation manuelle"],
    },
    en: {
      name: "Black & white colourisation",
      tagline: "Accurate tones, never invented",
      features: ["Documentary research of tones", "Manual colourisation"],
    },
  },
  /* --- Extras photobook --- */
  {
    slug: "extra-pages-4",
    kind: "extra",
    family: "photobook",
    price: 50,
    extraPages: 4,
    minDays: 1,
    maxDays: 2,
    sort: 20,
    fr: { name: "+ 4 pages", tagline: "Quatre pages supplémentaires", features: [] },
    en: { name: "+ 4 pages", tagline: "Four extra pages", features: [] },
  },
  {
    slug: "extra-pages-8",
    kind: "extra",
    family: "photobook",
    price: 90,
    extraPages: 8,
    minDays: 2,
    maxDays: 3,
    sort: 21,
    fr: { name: "+ 8 pages", tagline: "Huit pages supplémentaires", features: [] },
    en: { name: "+ 8 pages", tagline: "Eight extra pages", features: [] },
  },
  {
    slug: "extra-copy",
    kind: "extra",
    family: "photobook",
    price: 250,
    pricingMode: "per_copy",
    maxQuantity: 5,
    minDays: 3,
    maxDays: 5,
    sort: 22,
    fr: { name: "Deuxième exemplaire", tagline: "Pour offrir", features: ["Impression identique"] },
    en: { name: "Second copy", tagline: "To give as a gift", features: ["Identical print run"] },
  },
  {
    slug: "extra-minifilm",
    kind: "extra",
    family: "photobook",
    price: 150,
    minDays: 3,
    maxDays: 5,
    sort: 23,
    fr: { name: "Mini-film souvenir", tagline: "Vos photos en diaporama", features: ["Montage musical", "Fichier vidéo HD"] },
    en: { name: "Keepsake short film", tagline: "Your photographs as a slideshow", features: ["Musical edit", "HD video file"] },
  },
  {
    slug: "extra-boite",
    kind: "extra",
    family: "photobook",
    price: 100,
    minDays: 1,
    maxDays: 2,
    // Écrin rigide : un objet physique, qui part par colis.
    requiresShipping: true,
    sort: 24,
    fr: { name: "Boîte premium", tagline: "Écrin de protection", features: ["Boîte rigide habillée"] },
    en: { name: "Premium box", tagline: "Protective case", features: ["Rigid covered box"] },
  },
];

const DIGITAL_EXTRAS = ["extra-photo", "extra-complexe", "extra-colorisation"];
const PHOTOBOOK_EXTRAS = ["extra-pages-4", "extra-pages-8", "extra-copy", "extra-minifilm", "extra-boite"];

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

const FAQ: { category: string; sort: number; fr: [string, string]; en: [string, string] }[] = [
  {
    category: "qualite",
    sort: 1,
    fr: [
      "Mes photos sont très abîmées. Est-ce récupérable ?",
      "Dans la grande majorité des cas, oui. Les rayures, taches, déchirures, moisissures et décolorations se corrigent. Nous avons déjà restauré des photographies dont il ne restait que deux morceaux. Si l'émulsion a disparu sur une zone importante, nous vous le disons franchement avant de commencer — et vous n'êtes pas facturé.",
    ],
    en: [
      "My photographs are badly damaged. Can they be saved?",
      "In the vast majority of cases, yes. Scratches, stains, tears, mould and fading can all be corrected. We have restored photographs of which only two fragments remained. If the emulsion is gone over a large area, we tell you honestly before starting — and you are not charged.",
    ],
  },
  {
    category: "qualite",
    sort: 2,
    fr: [
      "Le résultat va-t-il ressembler à une photo retouchée ?",
      "Non. Notre règle est de préserver l'identité de l'image : les visages, les lumières et même certains défauts d'époque sont conservés. Nous nettoyons, nous ne réinventons pas. Si vous souhaitez une modification plus radicale, dites-le nous dans les instructions.",
    ],
    en: [
      "Will the result look heavily retouched?",
      "No. Our rule is to preserve the identity of the image: faces, light and even some period flaws are kept. We clean, we do not reinvent. If you would like a more radical change, just say so in the instructions.",
    ],
  },
  {
    category: "upload",
    sort: 3,
    fr: [
      "Comment vous envoyer mes photos ?",
      "Trois façons : vous les téléversez directement depuis cette page (téléphone, ordinateur ou tablette), vous nous les apportez à l'atelier, ou vous nous envoyez un lien si elles sont déjà numériques. Vous pouvez aussi commencer une commande et envoyer les photos plus tard : nous vous rappelons par email.",
    ],
    en: [
      "How do I send you my photographs?",
      "Three ways: upload them straight from this page (phone, computer or tablet), bring them to the workshop, or send us a link if they are already digital. You can also start an order and send the photographs later — we remind you by email.",
    ],
  },
  {
    category: "upload",
    sort: 4,
    fr: [
      "Puis-je envoyer des tirages papier ?",
      "Oui. Prenez-les simplement en photo avec votre téléphone, à plat, sans flash, à la lumière du jour. C'est largement suffisant pour évaluer le travail. Si vous choisissez le format numérique, nous vous indiquerons ensuite comment nous faire parvenir les tirages si un scan haute résolution est nécessaire.",
    ],
    en: [
      "Can I send paper prints?",
      "Yes. Simply photograph them with your phone, flat, without flash, in daylight. That is more than enough to assess the work. If a high-resolution scan is needed, we will tell you how to get the prints to us.",
    ],
  },
  {
    category: "upload",
    sort: 5,
    fr: [
      "Quels formats de fichier acceptez-vous ?",
      "JPEG, PNG, WebP et TIFF jusqu'à 60 Mo par fichier. Si vos photos sont au format HEIC (iPhone), votre téléphone les convertit automatiquement à l'envoi dans la plupart des cas.",
    ],
    en: [
      "Which file formats do you accept?",
      "JPEG, PNG, WebP and TIFF, up to 60 MB per file. If your photographs are in HEIC format (iPhone), your phone usually converts them automatically when sending.",
    ],
  },
  {
    category: "prix",
    sort: 6,
    fr: [
      "Que se passe-t-il si j'envoie moins de photos que prévu ?",
      "Vous ne payez que les photos envoyées. Le pack définit un plafond, pas un minimum. Si vous dépassez le nombre inclus, chaque photo supplémentaire est facturée 4 DT et vous le voyez apparaître avant de payer.",
    ],
    en: [
      "What if I send fewer photographs than planned?",
      "You only pay for what you send. The pack sets a ceiling, not a minimum. If you go over, each extra photograph is charged 4 DT and you see it before paying.",
    ],
  },
  {
    category: "prix",
    sort: 7,
    fr: [
      "Comment se fait le paiement ?",
      "Vous pouvez régler par virement bancaire, en espèces à l'atelier, ou à la livraison pour les photobooks. Le paiement par carte en ligne arrive très prochainement. Dans tous les cas, nous commençons le travail dès réception du règlement.",
    ],
    en: [
      "How does payment work?",
      "You can pay by bank transfer, in cash at the workshop, or on delivery for photobooks. Online card payment is coming very soon. Either way, we start the work as soon as payment is received.",
    ],
  },
  {
    category: "livraison",
    sort: 8,
    fr: [
      "Combien de temps cela prend-il ?",
      "Entre 3 et 12 jours ouvrés pour une restauration numérique, selon le nombre de photos et leur état. Pour un photobook, comptez 10 à 25 jours ouvrés, impression et livraison comprises. Une estimation précise figure sur chaque pack et dans votre espace de suivi.",
    ],
    en: [
      "How long does it take?",
      "Between 3 and 12 business days for digital restoration, depending on the number of photographs and their condition. For a photobook, allow 10 to 25 business days including printing and delivery. An accurate estimate appears on every pack and in your tracking space.",
    ],
  },
  {
    category: "livraison",
    sort: 9,
    fr: [
      "Comment recevrai-je mes photos restaurées ?",
      "Par un lien de téléchargement privé, envoyé par email, dès que la commande est prête. Vous pouvez télécharger image par image ou tout récupérer en une seule archive. Le lien reste actif pendant 12 mois.",
    ],
    en: [
      "How will I receive my restored photographs?",
      "Through a private download link sent by email as soon as the order is ready. You can download image by image or grab everything in a single archive. The link stays active for 12 months.",
    ],
  },
  {
    category: "livraison",
    sort: 10,
    fr: [
      "Livrez-vous partout en Tunisie ?",
      "Oui. Les photobooks sont livrés dans les 24 gouvernorats. Le retrait à l'atelier, à Tunis, est gratuit.",
    ],
    en: [
      "Do you deliver everywhere in Tunisia?",
      "Yes. Photobooks are delivered across all 24 governorates. Collection at the workshop in Tunis is free.",
    ],
  },
  {
    category: "confidentialite",
    sort: 11,
    fr: [
      "Que deviennent mes originaux ?",
      "Ils sont stockés dans un espace privé chiffré, accessibles à deux personnes seulement, puis supprimés 90 jours après la livraison. Vous pouvez demander une suppression immédiate à tout moment depuis votre espace ou par simple email.",
    ],
    en: [
      "What happens to my originals?",
      "They are stored in a private encrypted space accessible to two people only, then deleted 90 days after delivery. You can request immediate deletion at any time from your account or by simply emailing us.",
    ],
  },
  {
    category: "confidentialite",
    sort: 12,
    fr: [
      "Mes photos seront-elles publiées sur le site ?",
      "Jamais sans votre accord écrit. Lorsque nous vous proposons de montrer une restauration dans la galerie, nous vous demandons une autorisation explicite et nous anonymisons systématiquement les noms.",
    ],
    en: [
      "Will my photographs be published on the site?",
      "Never without your written consent. When we suggest showing a restoration in the gallery, we ask for explicit permission and always anonymise names.",
    ],
  },
  {
    category: "service",
    sort: 13,
    fr: [
      "Puis-je commander un photobook après une restauration numérique ?",
      "Oui, c'est même le chemin le plus fréquent. Vos photos restaurées sont conservées 12 mois : vous pouvez commander un album plus tard, sans rien renvoyer.",
    ],
    en: [
      "Can I order a photobook after a digital restoration?",
      "Yes — it is in fact the most common path. Your restored photographs are kept for 12 months, so you can order a book later without sending anything again.",
    ],
  },
  {
    category: "service",
    sort: 14,
    fr: [
      "Travaillez-vous sur des archives associatives ou professionnelles ?",
      "Oui. Nous accompagnons les associations, les mairies et les familles qui souhaitent numériser et préserver un fonds ancien. Écrivez-nous pour un devis sur mesure.",
    ],
    en: [
      "Do you work on association or professional archives?",
      "Yes. We support associations, municipalities and families who want to digitise and preserve an old collection. Write to us for a tailor-made quote.",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Témoignages                                                                 */
/* -------------------------------------------------------------------------- */

const TESTIMONIALS = [
  {
    name: "Leïla B.",
    location: "Tunis",
    context: "Photos de famille, 1958",
    rating: 5,
    sort: 1,
    featured: true,
    fr: "Je n'avais plus qu'une photo de ma mère jeune. Elle était fendue en deux. Je ne pensais pas qu'on puisse la récupérer. Quand je l'ai vue, j'ai pleuré.",
    en: "I only had one photograph left of my mother when she was young. It was torn in two. I did not think it could be recovered. When I saw it, I cried.",
  },
  {
    name: "Hatem M.",
    location: "Sfax",
    context: "Album de mariage, 1971",
    rating: 5,
    sort: 2,
    featured: true,
    fr: "L'album de mariage de mes parents dormait dans un carton depuis trente ans. Ils l'ont reçu pour leurs noces d'or. Mon père n'a rien dit pendant dix minutes.",
    en: "My parents' wedding album had been sitting in a box for thirty years. They received it for their golden anniversary. My father said nothing for ten minutes.",
  },
  {
    name: "Nadia C.",
    location: "Sousse",
    context: "Portraits de grands-parents",
    rating: 5,
    sort: 3,
    featured: false,
    fr: "Ils ont refusé de me facturer une photo qu'ils jugeaient irrécupérable. Je suis revenue six mois plus tard avec tout le reste de la boîte.",
    en: "They refused to charge me for a photograph they considered beyond saving. I came back six months later with everything else in the box.",
  },
  {
    name: "Sami T.",
    location: "La Marsa",
    context: "Photobook Heritage",
    rating: 5,
    sort: 4,
    featured: false,
    fr: "Le livre est arrivé dans une boîte, posé sur du papier de soie. Ce n'est pas un produit imprimé, c'est un objet. Toute la famille l'a feuilleté le soir même.",
    en: "The book arrived in a box, laid on tissue paper. It is not a printed product, it is an object. The whole family went through it that same evening.",
  },
  {
    name: "Amina K.",
    location: "Bizerte",
    context: "Photos d'enfance, 1960",
    rating: 5,
    sort: 5,
    featured: false,
    fr: "Je voulais juste une photo pour l'enterrement de mon oncle. Ils m'en ont rendu quarante, et j'ai découvert des visages que je n'avais jamais vus.",
    en: "I just wanted one photograph for my uncle's funeral. They gave me back forty, and I discovered faces I had never seen.",
  },
];

/* -------------------------------------------------------------------------- */
/* Galerie                                                                     */
/* -------------------------------------------------------------------------- */

const GALLERY_META: Record<string, { category: string; sort: number; featured: boolean; fr: [string, string]; en: [string, string] }> = {
  "medina-1957": {
    category: "tres-endommage",
    sort: 1,
    featured: true,
    fr: [
      "Rue de la médina, 1957",
      "Taches d'humidité étendues, émulsion partiellement décollée, forte décoloration. Reconstruction des zones manquantes, correction du contraste localisée, récupération des détails dans les ombres.",
    ],
    en: [
      "Medina street, 1957",
      "Extensive water damage, emulsion partly lifted, heavy fading. Reconstruction of missing areas, localised contrast correction, recovery of detail in the shadows.",
    ],
  },
  "famille-1954": {
    category: "famille",
    sort: 2,
    featured: true,
    fr: [
      "Trois générations, 1954",
      "Pliure centrale, rayures multiples, grain très marqué. Suppression des plis et rayures, réduction du bruit sans lissage des visages, équilibrage des gris.",
    ],
    en: [
      "Three generations, 1954",
      "Central crease, multiple scratches, heavy grain. Removal of creases and scratches, noise reduction without smoothing faces, grey balance.",
    ],
  },
  "mariage-1968": {
    category: "mariage",
    sort: 3,
    featured: true,
    fr: [
      "Mariage, 1968",
      "Voile jaunâtre, taches de moisissure dans les angles, léger flou de bougé. Correction colorimétrique, nettoyage des moisissures, amélioration de la netteté.",
    ],
    en: [
      "Wedding, 1968",
      "Yellowish cast, mould in the corners, slight motion blur. Colour correction, mould removal, sharpening.",
    ],
  },
  "portrait-1929": {
    category: "nb",
    sort: 4,
    featured: false,
    fr: [
      "Portrait de studio, 1929",
      "Sépia viré, émulsion craquelée, coins mangés. Restauration des craquelures, reconstruction des bords, retour à un noir et blanc neutre et profond.",
    ],
    en: [
      "Studio portrait, 1929",
      "Shifted sepia, cracked emulsion, damaged corners. Crack repair, edge reconstruction, return to a deep neutral black and white.",
    ],
  },
  "enfance-1961": {
    category: "enfance",
    sort: 5,
    featured: false,
    fr: [
      "Enfance, 1961",
      "Rayures verticales sur toute la hauteur, poussières, tirage sous-exposé. Suppression des rayures, dépoussiérage, ouverture des ombres.",
    ],
    en: [
      "Childhood, 1961",
      "Vertical scratches over the full height, dust, underexposed print. Scratch removal, dust removal, shadow recovery.",
    ],
  },
  "couleur-1974": {
    category: "basse-resolution",
    sort: 6,
    featured: false,
    fr: [
      "Déjeuner au jardin, 1974",
      "Fichier d'origine en très basse résolution, dominante orange, bruit chromatique. Upscale haute résolution, correction de la dominante, débruitage chromatique.",
    ],
    en: [
      "Lunch in the garden, 1974",
      "Original file at very low resolution, orange cast, chroma noise. High-resolution upscaling, cast correction, chroma denoising.",
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Exécution                                                                   */
/* -------------------------------------------------------------------------- */

async function main() {
  const client = new PGlite({ dataDir: ".data/pg" });
  const db = drizzle(client, { schema });

  console.log(" Vidage des tables…");
  await db.execute(sql`
    truncate table
      audit_logs, contact_requests, jobs, counters,
      download_tokens, order_access_tokens, assets, invoices, payments,
      order_notes, order_status_events, order_items, orders,
      price_history, product_extras, product_translations, products, product_categories,
      testimonial_translations, testimonials,
      transformation_translations, transformations,
      faq_translations, faq_items,
      page_block_translations, page_blocks,
      settings, addresses, verification_tokens, sessions, users
    restart identity cascade
  `);

  /* --- Administrateur --- */
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@atelier-restauration.tn").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme-please";
  console.log(" Administrateur…");
  await db.insert(schema.users).values({
    email: adminEmail,
    name: "Atelier",
    role: "superadmin",
    emailVerified: true,
    passwordHash: await hashPassword(adminPassword),
  });

  /* --- Réglages --- */
  console.log(" Réglages…");
  await db.insert(schema.settings).values([
    { key: "shipping_flat_millimes", value: 0 },
    { key: "max_file_size_bytes", value: 60 * 1024 * 1024 },
    { key: "max_files_per_order", value: 200 },
    { key: "retention_originals_days", value: 90 },
    { key: "retention_restored_days", value: 365 },
    { key: "retention_draft_days", value: 30 },
    { key: "accepted_formats", value: ["image/jpeg", "image/png", "image/webp", "image/tiff"] },
    { key: "payment_providers", value: ["manual", "cod"] },
    // Contre-remboursement : désactivable, et plafonné à 0 = pas de plafond.
    { key: "payment_cod_enabled", value: true },
    { key: "payment_cod_max_millimes", value: 0 },
    // Coordonnées de règlement — éditables depuis le back-office.
    { key: "payment_manual_holder", value: "Atelier Restauration" },
    { key: "payment_manual_bank", value: "À renseigner depuis le back-office" },
    { key: "payment_manual_iban", value: "TN59 0000 0000 0000 0000 0000" },
    { key: "gallery_disclaimer", value: true },
  ]);

  /* --- Catégories --- */
  console.log(" Catalogue…");
  const categories = await db
    .insert(schema.productCategories)
    .values([
      { slug: "restauration-numerique", family: "digital", sortOrder: 1 },
      { slug: "photobooks", family: "photobook", sortOrder: 2 },
      { slug: "extras-numeriques", family: "digital", sortOrder: 3 },
      { slug: "extras-photobook", family: "photobook", sortOrder: 4 },
    ])
    .returning({ id: schema.productCategories.id, slug: schema.productCategories.slug });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const insertedProducts = await db
    .insert(schema.products)
    .values(
      PRODUCTS.map((p) => ({
        slug: p.slug,
        kind: p.kind,
        family: p.family,
        categoryId: catBySlug.get(
          p.kind === "pack"
            ? p.family === "digital"
              ? "restauration-numerique"
              : "photobooks"
            : p.family === "digital"
              ? "extras-numeriques"
              : "extras-photobook",
        ),
        priceMillimes: DT(p.price),
        photosIncluded: p.photos,
        photosMin: p.photosMin,
        photosMax: p.photosMax,
        pagesIncluded: p.pages,
        turnaroundDaysMin: p.minDays,
        turnaroundDaysMax: p.maxDays,
        extraPhotosGranted: p.extraPhotos ?? 0,
        extraPagesGranted: p.extraPages ?? 0,
        pricingMode: p.pricingMode ?? "flat",
        maxQuantity: p.maxQuantity,
        requiresShipping: p.requiresShipping ?? false,
        isFeatured: p.featured ?? false,
        sortOrder: p.sort,
      })),
    )
    .returning({ id: schema.products.id, slug: schema.products.slug });

  const productBySlug = new Map(insertedProducts.map((p) => [p.slug, p.id]));

  await db.insert(schema.productTranslations).values(
    PRODUCTS.flatMap((p) => {
      const id = productBySlug.get(p.slug)!;
      return [
        {
          productId: id,
          locale: "fr" as const,
          name: p.fr.name,
          tagline: p.fr.tagline,
          features: p.fr.features,
        },
        {
          productId: id,
          locale: "en" as const,
          name: p.en.name,
          tagline: p.en.tagline,
          features: p.en.features,
        },
      ];
    }),
  );

  const extrasByPack: [string[], string[]][] = [
    [["basic", "premium", "complete"], DIGITAL_EXTRAS],
    [["classic", "wedding-revival", "heritage-premium"], PHOTOBOOK_EXTRAS],
  ];
  const extrasRows: { packId: string; extraId: string; sortOrder: number }[] = [];
  for (const [packs, extras] of extrasByPack) {
    for (const pack of packs) {
      extras.forEach((extra, index) => {
        const packId = productBySlug.get(pack);
        const extraId = productBySlug.get(extra);
        if (packId && extraId) extrasRows.push({ packId, extraId, sortOrder: index });
      });
    }
  }
  await db.insert(schema.productExtras).values(extrasRows);

  /* --- FAQ --- */
  console.log(" FAQ…");
  const faqRows = await db
    .insert(schema.faqItems)
    .values(FAQ.map((f) => ({ category: f.category, sortOrder: f.sort })))
    .returning({ id: schema.faqItems.id });

  await db.insert(schema.faqTranslations).values(
    FAQ.flatMap((f, index) => [
      { faqId: faqRows[index]!.id, locale: "fr" as const, question: f.fr[0], answer: f.fr[1] },
      { faqId: faqRows[index]!.id, locale: "en" as const, question: f.en[0], answer: f.en[1] },
    ]),
  );

  /* --- Témoignages --- */
  console.log(" Témoignages…");
  const testimonialRows = await db
    .insert(schema.testimonials)
    .values(
      TESTIMONIALS.map((t) => ({
        authorName: t.name,
        authorLocation: t.location,
        authorContext: t.context,
        rating: t.rating,
        isApproved: true,
        isFeatured: t.featured,
        sortOrder: t.sort,
      })),
    )
    .returning({ id: schema.testimonials.id });

  await db.insert(schema.testimonialTranslations).values(
    TESTIMONIALS.flatMap((t, index) => [
      { testimonialId: testimonialRows[index]!.id, locale: "fr" as const, quote: t.fr },
      { testimonialId: testimonialRows[index]!.id, locale: "en" as const, quote: t.en },
    ]),
  );

  /* --- Galerie avant / après --- */
  console.log(" Galerie…");
  // Le répertoire peut ne pas exister : la galerie est optionnelle, un seed
  // ne doit jamais échouer parce qu'aucune image n'a encore été générée.
  const slugs = (await readdir(GALLERY_DIR, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const slug of slugs) {
    const meta = GALLERY_META[slug];
    let manifest: {
      after: string;
      before: string;
      afterThumb: string;
      beforeThumb: string;
      blurAfter: string;
      blurBefore: string;
      width: number;
      height: number;
    };
    try {
      manifest = JSON.parse(await readFile(path.join(GALLERY_DIR, slug, "manifest.json"), "utf8"));
    } catch {
      console.warn(`  ! manifest introuvable pour ${slug}`);
      continue;
    }
    if (!meta) {
      console.warn(`  ! métadonnées absentes pour ${slug}`);
      continue;
    }

    const [beforeAsset] = await db
      .insert(schema.assets)
      .values({
        kind: "gallery_before",
        status: "ready",
        storageDriver: "local",
        storageKey: manifest.before,
        thumbKey: manifest.beforeThumb,
        blurPlaceholder: manifest.blurBefore,
        originalFilename: `${slug}-before.webp`,
        mimeType: "image/webp",
        width: manifest.width,
        height: manifest.height,
        exifStripped: true,
      })
      .returning({ id: schema.assets.id });

    const [afterAsset] = await db
      .insert(schema.assets)
      .values({
        kind: "gallery_after",
        status: "ready",
        storageDriver: "local",
        storageKey: manifest.after,
        thumbKey: manifest.afterThumb,
        blurPlaceholder: manifest.blurAfter,
        originalFilename: `${slug}-after.webp`,
        mimeType: "image/webp",
        width: manifest.width,
        height: manifest.height,
        exifStripped: true,
        pairedAssetId: beforeAsset!.id,
      })
      .returning({ id: schema.assets.id });

    const [transformation] = await db
      .insert(schema.transformations)
      .values({
        slug,
        category: meta.category,
        beforeAssetId: beforeAsset!.id,
        afterAssetId: afterAsset!.id,
        isFeatured: meta.featured,
        isPublished: true,
        sortOrder: meta.sort,
      })
      .returning({ id: schema.transformations.id });

    await db.insert(schema.transformationTranslations).values([
      {
        transformationId: transformation!.id,
        locale: "fr",
        title: meta.fr[0],
        workDescription: meta.fr[1],
        altBefore: `${meta.fr[0]} — photographie d'origine abîmée`,
        altAfter: `${meta.fr[0]} — photographie restaurée`,
      },
      {
        transformationId: transformation!.id,
        locale: "en",
        title: meta.en[0],
        workDescription: meta.en[1],
        altBefore: `${meta.en[0]} — damaged original photograph`,
        altAfter: `${meta.en[0]} — restored photograph`,
      },
    ]);
  }

  /* --- Compteurs --- */
  await db.insert(schema.counters).values([
    { key: "order", value: 0 },
    { key: "invoice", value: 0 },
  ]);

  console.log("\n✔ Seed terminé");
  console.log(`  Administrateur : ${adminEmail} / ${adminPassword}`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
