import type { Locale } from "@/lib/i18n";

/**
 * Pages légales — structure et contenu de départ.
 * ⚠️ Ces textes devront être relus et validés par un juriste tunisien
 * (droit de la consommation, INPDP — loi n° 2004-63 sur les données
 * personnelles). Ils fournissent la structure et une base rédactionnelle,
 * pas un texte juridique validé.
 */

export type LegalSection = { title: string; paragraphs: string[] };
export type LegalPage = { slug: string; title: string; updated: string; sections: LegalSection[] };

const fr: Record<string, LegalPage> = {
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    updated: "Octobre 2026",
    sections: [
      {
        title: "Éditeur du site",
        paragraphs: [
          "Le présent site est édité par Atelier Restauration, atelier de restauration et de préservation de photographies, dont le siège est situé à Tunis, Tunisie.",
          "Contact : bonjour@atelier-restauration.tn — téléphone : +216 71 000 000.",
        ],
      },
      {
        title: "Activité",
        paragraphs: [
          "Atelier Restauration propose la restauration numérique de photographies anciennes ou endommagées, ainsi que la conception et la production de photobooks imprimés.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "L'ensemble des contenus présents sur ce site (textes, photographies, mises en page, marques) est protégé. Les photographies présentées dans la galerie sont des exemples de travaux réalisés ou des images de démonstration ; elles ne peuvent être reproduites sans autorisation écrite.",
          "Les photographies confiées par les clients demeurent leur propriété exclusive. Aucun droit n'est cédé à l'atelier.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Le site est hébergé au sein de l'Union européenne. Les fichiers transmis par les clients sont stockés sur une infrastructure chiffrée, distincte de l'espace public du site.",
        ],
      },
    ],
  },
  "conditions-vente": {
    slug: "conditions-vente",
    title: "Conditions générales de vente",
    updated: "Octobre 2026",
    sections: [
      {
        title: "Objet",
        paragraphs: [
          "Les présentes conditions régissent les ventes de prestations de restauration numérique de photographies et de photobooks conclues sur ce site entre Atelier Restauration et tout client consommateur.",
        ],
      },
      {
        title: "Commande",
        paragraphs: [
          "Le client sélectionne une formule, téléverse ses photographies, renseigne ses coordonnées et confirme sa commande. Un numéro de commande lui est attribué et un récapitulatif lui est adressé par email.",
        ],
      },
      {
        title: "Prix et paiement",
        paragraphs: [
          "Les prix sont indiqués en dinars tunisiens, toutes taxes comprises. Le paiement s'effectue par virement bancaire, en espèces à l'atelier, ou à la livraison pour les photobooks.",
          "Le travail commence à la réception du règlement, sauf accord contraire.",
        ],
      },
      {
        title: "Délais",
        paragraphs: [
          "Les délais annoncés sur chaque formule sont des estimations exprimées en jours ouvrés. Ils courent à compter de la réception du paiement et des photographies. Le client est informé de l'avancement depuis son espace de suivi.",
        ],
      },
      {
        title: "Rétractation et annulation",
        paragraphs: [
          "Le client peut annuler sa commande tant que le travail de restauration n'a pas commencé. Passé ce stade, la prestation étant réalisée sur mesure, l'annulation n'est plus possible.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: [
          "L'atelier s'engage à apporter tout le soin possible aux photographies confiées. Lorsqu'une photographie est jugée irrécupérable, le client en est informé avant le début du travail et n'est pas facturé pour celle-ci.",
        ],
      },
    ],
  },
  "politique-confidentialite": {
    slug: "politique-confidentialite",
    title: "Politique de confidentialité",
    updated: "Octobre 2026",
    sections: [
      {
        title: "Données collectées",
        paragraphs: [
          "Nous collectons uniquement les données nécessaires au traitement d'une commande : nom, prénom, adresse email, numéro de téléphone, adresse de livraison le cas échéant, ainsi que les photographies que vous nous confiez.",
        ],
      },
      {
        title: "Photographies confiées",
        paragraphs: [
          "Vos photographies sont stockées dans un espace privé chiffré, accessibles à un nombre restreint de personnes. Elles ne sont jamais rendues publiques, jamais cédées, jamais utilisées à des fins commerciales sans votre accord écrit.",
          "Les métadonnées (dont la géolocalisation) sont supprimées dès la réception des fichiers.",
        ],
      },
      {
        title: "Durées de conservation",
        paragraphs: [
          "Les originaux sont supprimés 90 jours après la livraison. Les photographies restaurées restent disponibles au téléchargement pendant 12 mois. Les factures sont conservées 10 ans, conformément aux obligations comptables.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition sur vos données. Toute demande peut être adressée à bonjour@atelier-restauration.tn et est traitée sous 30 jours.",
          "Vous pouvez également demander la suppression immédiate de vos fichiers depuis votre espace client.",
        ],
      },
      {
        title: "Cookies",
        paragraphs: [
          "Ce site utilise des cookies strictement nécessaires au fonctionnement de la commande et de la session. Aucun cookie publicitaire n'est déposé.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookies",
    updated: "Octobre 2026",
    sections: [
      {
        title: "Ce que nous déposons",
        paragraphs: [
          "Un cookie de session, nécessaire à votre connexion et au suivi de votre commande. Un cookie de langue, pour mémoriser votre choix. Rien d'autre.",
        ],
      },
      {
        title: "Ce que nous ne déposons pas",
        paragraphs: [
          "Aucun cookie publicitaire, aucun traceur tiers, aucune mesure d'audience qui nécessiterait un consentement préalable.",
        ],
      },
      {
        title: "Gestion",
        paragraphs: [
          "Vous pouvez à tout moment supprimer les cookies depuis les réglages de votre navigateur. La suppression du cookie de session vous déconnecte ; elle n'affecte pas vos commandes en cours.",
        ],
      },
    ],
  },
};

const en: Record<string, LegalPage> = {
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Legal notice",
    updated: "October 2026",
    sections: [
      {
        title: "Publisher",
        paragraphs: [
          "This site is published by Atelier Restauration, a photograph restoration and preservation workshop based in Tunis, Tunisia.",
          "Contact: bonjour@atelier-restauration.tn — telephone: +216 71 000 000.",
        ],
      },
      {
        title: "Activity",
        paragraphs: [
          "Atelier Restauration provides digital restoration of old or damaged photographs, as well as the design and production of printed photobooks.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "All content on this site (text, photographs, layouts, trademarks) is protected. Photographs shown in the gallery are examples of completed work or demonstration images; they may not be reproduced without written permission.",
          "Photographs entrusted by clients remain their exclusive property. No rights are transferred to the workshop.",
        ],
      },
      {
        title: "Hosting",
        paragraphs: [
          "The site is hosted within the European Union. Files uploaded by clients are stored on encrypted infrastructure, separate from the public space of the site.",
        ],
      },
    ],
  },
  "conditions-vente": {
    slug: "conditions-vente",
    title: "Terms of sale",
    updated: "October 2026",
    sections: [
      {
        title: "Purpose",
        paragraphs: [
          "These terms govern sales of digital photograph restoration services and photobooks concluded on this site between Atelier Restauration and any consumer client.",
        ],
      },
      {
        title: "Ordering",
        paragraphs: [
          "The client selects a pack, uploads their photographs, provides their details and confirms the order. An order number is assigned and a summary is emailed to them.",
        ],
      },
      {
        title: "Price and payment",
        paragraphs: [
          "Prices are shown in Tunisian dinars, inclusive of tax. Payment is made by bank transfer, in cash at the workshop, or on delivery for photobooks.",
          "Work begins once payment is received, unless otherwise agreed.",
        ],
      },
      {
        title: "Timelines",
        paragraphs: [
          "Timelines shown on each pack are estimates expressed in business days. They run from receipt of payment and photographs. The client is kept informed of progress in their tracking space.",
        ],
      },
      {
        title: "Cancellation",
        paragraphs: [
          "The client may cancel the order as long as restoration work has not begun. Beyond that point, the service being bespoke, cancellation is no longer possible.",
        ],
      },
      {
        title: "Liability",
        paragraphs: [
          "The workshop undertakes to take every possible care of the photographs entrusted to it. Where a photograph is judged beyond recovery, the client is informed before work begins and is not charged for it.",
        ],
      },
    ],
  },
  "politique-confidentialite": {
    slug: "politique-confidentialite",
    title: "Privacy policy",
    updated: "October 2026",
    sections: [
      {
        title: "Data collected",
        paragraphs: [
          "We collect only the data required to process an order: name, email address, telephone number, delivery address where applicable, and the photographs you entrust to us.",
        ],
      },
      {
        title: "Photographs entrusted",
        paragraphs: [
          "Your photographs are stored in a private encrypted space accessible to a restricted number of people. They are never made public, never transferred, never used for commercial purposes without your written consent.",
          "Metadata (including location data) is removed on receipt of the files.",
        ],
      },
      {
        title: "Retention periods",
        paragraphs: [
          "Originals are deleted 90 days after delivery. Restored photographs remain available for download for 12 months. Invoices are kept for 10 years, in accordance with accounting obligations.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "You have the right to access, correct, erase and object to the processing of your data. Any request may be sent to bonjour@atelier-restauration.tn and is handled within 30 days.",
          "You may also request immediate deletion of your files from your account area.",
        ],
      },
      {
        title: "Cookies",
        paragraphs: [
          "This site uses cookies strictly necessary for the operation of the order process and the session. No advertising cookie is set.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookies",
    updated: "October 2026",
    sections: [
      {
        title: "What we set",
        paragraphs: [
          "A session cookie, required for your sign-in and for tracking your order. A language cookie, to remember your choice. Nothing else.",
        ],
      },
      {
        title: "What we do not set",
        paragraphs: [
          "No advertising cookie, no third-party tracker, no audience measurement requiring prior consent.",
        ],
      },
      {
        title: "Managing cookies",
        paragraphs: [
          "You may delete cookies at any time from your browser settings. Deleting the session cookie signs you out; it does not affect your orders in progress.",
        ],
      },
    ],
  },
};

const pages: Record<Locale, Record<string, LegalPage>> = { fr, en, ar: fr };

export const legalSlugs = Object.keys(fr);

export function getLegalPage(slug: string, locale: Locale): LegalPage | null {
  return pages[locale]?.[slug] ?? pages.fr[slug] ?? null;
}
