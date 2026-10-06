/**
 * Pages éditoriales « photobooks ».
 *
 * Ce sont des pages de vente écrites à la main — une par usage (mariage,
 * famille) — et non des fiches produit : les packs du catalogue y sont
 * simplement mis en avant via `focus`, qui liste des slugs de produits.
 *
 * Ce module est partagé : la page et le sitemap doivent connaître la même
 * liste, sinon le plan du site annonce des URL qui n'existent pas.
 */

export type PhotobookEntry = {
  slug: string;
  focus: string[];
  fr: { eyebrow: string; title: string; lede: string; items: { title: string; body: string }[] };
  en: { eyebrow: string; title: string; lede: string; items: { title: string; body: string }[] };
};

export const PHOTOBOOK_ENTRIES: PhotobookEntry[] = [
  {
    slug: "mariage",
    focus: ["wedding-revival"],
    fr: {
      eyebrow: "Photobook mariage",
      title: "L'album de mariage, offert à nouveau.",
      lede:
        "Nous restaurons les photographies du jour du mariage, puis nous les mettons en page dans l'ordre de la journée et les relions dans un livre 30 × 30 cm qui se transmet.",
      items: [
        { title: "Restauration complète", body: "Déjaunissement, suppression des traces de colle et de plastique, correction des teintes." },
        { title: "Mise en page sur mesure", body: "Le déroulé de la journée respecté : préparatifs, cérémonie, famille, soirée." },
        { title: "Format 30 × 30 cm lay-flat", body: "Pages à plat, ouverture complète, papier mat épais qui ne marque pas les plis." },
        { title: "Boîte de présentation", body: "Un écrin rigide pour protéger le livre et en faire un objet à offrir." },
      ],
    },
    en: {
      eyebrow: "Wedding photobook",
      title: "The wedding album, given again.",
      lede:
        "We restore the photographs of the wedding day, lay them out in the order of the day and bind them into a 30 × 30 cm book meant to be passed on.",
      items: [
        { title: "Full restoration", body: "De-yellowing, removal of glue and plastic traces, tone correction." },
        { title: "Bespoke layout", body: "The order of the day respected: preparations, ceremony, family, evening." },
        { title: "30 × 30 cm lay-flat", body: "Pages lie flat, full opening, thick matte paper that shows no crease." },
        { title: "Presentation box", body: "A rigid case to protect the book and make it an object to give." },
      ],
    },
  },
  {
    slug: "famille",
    focus: ["classic", "heritage-premium"],
    fr: {
      eyebrow: "Photobook famille",
      title: "Une boîte à chaussures transformée en livre.",
      lede:
        "Les photographies de famille dormaient dans un carton. Nous les restaurons, les classons et les relions pour qu'elles redeviennent un album que l'on feuillette.",
      items: [
        { title: "Classement", body: "Tri par époque et par personne, suppression des doublons, remise en ordre chronologique." },
        { title: "Restauration", body: "Chaque image traitée à la main, sans lissage des visages." },
        { title: "Plusieurs exemplaires", body: "Pour que chaque branche de la famille ait le sien, au prix d'une reproduction." },
        { title: "Fichiers livrés", body: "Les photographies restaurées vous sont également livrées en haute résolution." },
      ],
    },
    en: {
      eyebrow: "Family photobook",
      title: "A shoebox turned into a book.",
      lede:
        "The family photographs were sleeping in a box. We restore them, sort them and bind them so they become an album you leaf through again.",
      items: [
        { title: "Sorting", body: "Ordered by period and by person, duplicates removed, chronological sequence restored." },
        { title: "Restoration", body: "Every image worked on by hand, without smoothing faces." },
        { title: "Several copies", body: "So each branch of the family has its own, at reproduction price." },
        { title: "Files delivered", body: "The restored photographs are also delivered in high resolution." },
      ],
    },
  },
];
