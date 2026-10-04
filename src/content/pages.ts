import type { Locale } from "@/lib/i18n";

/**
 * Contenu éditorial des pages de service.
 *
 * Séparation assumée :
 *  - ce module contient le **récit** (notre métier, notre méthode) — il vit avec
 *    le code, il est relu et versionné comme tel ;
 *  - la base de données contient tout ce qui est **commercial ou modifiable**
 *    (packs, prix, FAQ, témoignages, galerie, blocs de pages éditables).
 *  Les deux sont traduits et servis par locale.
 */

export type PageSection = {
  title: string;
  body: string[];
  list?: { title: string; body: string }[];
};

export type ServicePageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  lede: string;
  heroImage?: string;
  toc: string;
  sections: PageSection[];
  closing: { title: string; body: string };
  faqCategory: string;
};

const fr = {
  restoration: {
    slug: "restauration-photo",
    eyebrow: "Restauration numérique",
    title: "Rendre à une photographie ce que le temps lui a pris.",
    lede:
      "Nous restaurons à la main vos photographies abîmées, décolorées, rayées ou déchirées. Sans jamais trahir l'image d'origine.",
    toc: "Sommaire",
    sections: [
      {
        title: "Ce que nous réparons",
        body: [
          "Une photographie se dégrade de mille façons, et chacune demande un geste différent. La lumière a pâli, l'émulsion s'est craquelée, l'album a collé au papier, un pli traverse le visage. Nous traitons chaque problème séparément, jamais avec un réglage global.",
        ],
        list: [
          { title: "Rayures et pliures", body: "Reconstruction des zones rayées à partir des pixels voisins, sans lissage des textures." },
          { title: "Taches et moisissures", body: "Détection et suppression manuelle, restitution des teintes d'origine dessous." },
          { title: "Décoloration", body: "Retour à un contraste et une colorimétrie justes, sans virer ni saturer." },
          { title: "Déchirures", body: "Rapprochement des fragments, comblement des manques, restitution des contours." },
          { title: "Flou et basse résolution", body: "Amélioration de la netteté et agrandissement haute résolution quand le fichier le permet." },
          { title: "Bruit et grain", body: "Réduction du bruit qui préserve les visages — jamais d'effet peau plastique." },
        ],
      },
      {
        title: "Notre méthode",
        body: [
          "Chaque photographie est d'abord regardée. Nous évaluons les dommages, nous décidons de ce qui peut être récupéré, et nous vous le disons avant de commencer.",
          "Le travail se fait ensuite image par image, à la main. Aucun traitement automatique, aucune file d'attente algorithmique : c'est ce qui permet de respecter un visage, une lumière, une époque.",
          "Enfin, chaque résultat est revu avant d'être mis à disposition. Si quelque chose ne nous convient pas, nous recommençons.",
        ],
      },
      {
        title: "Ce que nous ne faisons pas",
        body: [
          "Nous ne transformons pas vos photographies en images modernes. Nous ne lissons pas les visages, nous ne modifions pas les expressions, nous n'ajoutons rien qui n'y était pas.",
          "Un défaut d'époque fait partie de la photographie. Un grain argentique, un léger flou de bougé, un cadrage hésitant : ce sont des traces de vie, pas des erreurs à corriger.",
        ],
      },
      {
        title: "Ce que vous recevez",
        body: [
          "Vos photographies restaurées en haute résolution, prêtes à être imprimées ou partagées. Un lien de téléchargement privé, valable douze mois.",
          "Et si vous le souhaitez, nous pouvons ensuite les relier dans un photobook : vos photos restaurées sont conservées douze mois, vous avez le temps d'y réfléchir.",
        ],
      },
    ],
    closing: {
      title: "Envoyez-nous une seule photo.",
      body: "Regardez ce que nous en faisons. Vous déciderez ensuite — et si cela ne vous convient pas, vous ne nous devez rien.",
    },
    faqCategory: "qualite",
  },
  enhancement: {
    slug: "amelioration-photo",
    eyebrow: "Amélioration photo",
    title: "Tout le détail qui manque à vos images.",
    lede:
      "Photos floues, sombres, bruitées, prises avec un vieux téléphone ou un appareil d'entrée de gamme : nous récupérons ce qui peut l'être.",
    toc: "Sommaire",
    sections: [
      {
        title: "Quand une photo est décevante",
        body: [
          "Une photographie numérique peut être techniquement correcte et pourtant décevante : trop sombre, trop bruitée, légèrement floue, aux couleurs ternes. Ce n'est pas une fatalité.",
          "La plupart de ces défauts viennent du capteur et de la compression, pas du moment photographié. Ce qui a été enregistré contient souvent bien plus que ce que l'on voit.",
        ],
        list: [
          { title: "Netteté", body: "Correction du flou de bougé et récupération des micro-détails." },
          { title: "Bruit numérique", body: "Débruitage qui préserve les textures et les visages." },
          { title: "Exposition", body: "Ouverture des ombres, retenue des hautes lumières, contraste juste." },
          { title: "Couleurs", body: "Correction de la dominante, saturation mesurée, blancs neutres." },
          { title: "Résolution", body: "Agrandissement haute résolution pour l'impression grand format." },
        ],
      },
      {
        title: "Les photos de vieux téléphones",
        body: [
          "Les premiers appareils photo de téléphone produisaient des fichiers de 2 ou 3 mégapixels, fortement compressés. Imprimés, ils deviennent vite inutilisables.",
          "Nous les agrandissons et les nettoyons pour qu'ils supportent l'impression et l'affichage sur grand écran, sans inventer de détails qui n'existent pas.",
        ],
      },
      {
        title: "Ce que l'on ne peut pas rattraper",
        body: [
          "Une zone complètement blanche ou totalement noire ne contient plus aucune information : rien ne peut la faire réapparaître. De même, un visage flou de très près ne redeviendra pas net.",
          "Nous vous le disons franchement. Mieux vaut une honnêteté immédiate qu'une promesse qui ne tient pas.",
        ],
      },
    ],
    closing: {
      title: "Faites-nous voir vos images.",
      body: "Nous vous disons ce qui est récupérable avant que vous ne vous engagiez.",
    },
    faqCategory: "qualite",
  },
  old: {
    slug: "restauration-photos-anciennes",
    eyebrow: "Photographies anciennes",
    title: "Les photographies de famille méritent mieux qu'un carton.",
    lede:
      "Tirages argentiques, portraits de studio, albums de famille : nous restaurons et numérisons les images qui dorment dans les boîtes depuis des décennies.",
    toc: "Sommaire",
    sections: [
      {
        title: "Pourquoi maintenant",
        body: [
          "Un tirage argentique se dégrade même à l'abri de la lumière. L'émulsion jaunit, le papier s'acidifie, les albums collent entre eux. Ce qui est encore lisible aujourd'hui ne le sera pas dans vingt ans.",
          "Le moment de numériser n'est pas « plus tard ». C'est maintenant, tant que l'image est encore là.",
        ],
      },
      {
        title: "Comment nous procéder",
        body: [
          "Vous nous envoyez vos tirages : vous les photographiez avec votre téléphone pour-commencer, ou vous nous les apportez à l'atelier pour une numérisation haute résolution.",
          "Nous restaurons ensuite chaque image, et nous vous livrons des fichiers exploitables, archivables, partageables avec toute la famille.",
        ],
        list: [
          { title: "Numérisation", body: "Scan haute résolution des tirages quand la qualité d'origine le justifie." },
          { title: "Restauration", body: "Suppression des défauts, correction des teintes, récupération des détails." },
          { title: "Archivage", body: "Fichiers haute résolution, nommés et classés, prêts à être transmis." },
          { title: "Transmission", body: "Possibilité de relier le tout dans un photobook, pour que l'album existe à nouveau." },
        ],
      },
      {
        title: "Des images qui n'appartiennent pas qu'à vous",
        body: [
          "Une photographie de famille appartient à toute une famille. Nous pouvons vous livrer les fichiers, mais aussi les mettre à disposition de plusieurs personnes si vous le souhaitez.",
          "C'est souvent le plus beau résultat de notre travail : un frère qui retrouve un visage, une cousine qui découvre un mariage.",
        ],
      },
    ],
    closing: {
      title: "Ouvrez la boîte.",
      body: "Envoyez-nous les premières photographies qui vous tombent sous la main. Nous vous dirons ce que nous pouvons en faire.",
    },
    faqCategory: "service",
  },
  wedding: {
    slug: "restauration-photo-mariage",
    eyebrow: "Mariage",
    title: "L'album de mariage de vos parents, comme neuf.",
    lede:
      "Albums de mariage décolorés, tirages jaunis, pages collées : nous redonnons vie aux images du plus beau jour de deux familles.",
    toc: "Sommaire",
    sections: [
      {
        title: "Un mariage, c'est deux familles",
        body: [
          "Un album de mariage n'est pas un document personnel : c'est le point de départ d'une histoire familiale. Tout le monde y figure, tout le monde s'y cherche.",
          "Le restaurer, c'est rendre à toute une famille des visages qu'elle n'a parfois jamais vus — un oncle parti trop tôt, une grand-mère au même âge que sa petite-fille.",
        ],
      },
      {
        title: "Ce que nous faisons",
        body: [
          "La plupart des albums de mariage des années 1960 à 1980 souffrent des mêmes maux : jaunissement, albums autocollants qui ont transféré leur colle, tirages gondolés.",
        ],
        list: [
          { title: "Déjaunissement", body: "Retour à des blancs neutres et des noirs profonds, sans virer au bleu." },
          { title: "Pages collées", body: "Séparation numérique des images, suppression des traces de colle et de plastique." },
          { title: "Recadrage", body: "Redressement, recadrage et rééquilibrage de la composition d'origine." },
          { title: "Mise en page", body: "Possibilité de recomposer un album complet, dans l'ordre du jour." },
        ],
      },
      {
        title: "Un cadeau qui ne s'improvise pas",
        body: [
          "Beaucoup de nos clients restaurent l'album de mariage de leurs parents pour un anniversaire de mariage, ou à la suite d'une disparition.",
          "Nous pouvons livrer les fichiers, ou produire un photobook Wedding Revival : même format 30 × 30, même papier, mais un objet neuf, offert dans une boîte.",
        ],
      },
    ],
    closing: {
      title: "Commencez par une photo des mariés.",
      body: "Une seule suffit pour que nous vous disions ce que nous pouvons faire du reste de l'album.",
    },
    faqCategory: "service",
  },
  colourisation: {
    slug: "colorisation-photos",
    eyebrow: "Colorisation",
    title: "La couleur qu'elles n'ont jamais eue.",
    lede:
      "Nous colorisons vos photographies noir et blanc à partir de recherches documentaires, jamais à l'instinct.",
    toc: "Sommaire",
    sections: [
      {
        title: "Coloriser, ce n'est pas inventer",
        body: [
          "Une colorisation réussie ne se remarque pas. Elle donne l'impression que la photographie a toujours été en couleur — ce qui demande de la rigueur, pas de l'imagination.",
          "Avant de poser la moindre teinte, nous cherchons : l'époque, le lieu, la saison, la lumière, les matières. Un uniforme, un tissu, une façade ont des couleurs documentées.",
        ],
      },
      {
        title: "Notre méthode",
        body: [
          "Nous travaillons par zones : peau, vêtements, ciel, végétation, bâti. Chaque zone reçoit une teinte cohérente avec l'époque et la lumière de la scène, puis un réglage d'ensemble harmonise le tout.",
        ],
        list: [
          { title: "Recherche", body: "Époque, lieu, mode, matériaux : tout ce qui permet de ne pas deviner." },
          { title: "Colorisation manuelle", body: "Zones séparées, densités et saturations ajustées une par une." },
          { title: "Harmonisation", body: "Un seul réglage d'ensemble pour que l'image reste une photographie, pas un montage." },
          { title: "Version N&B conservée", body: "Nous vous livrons systématiquement l'original restauré en noir et blanc." },
        ],
      },
      {
        title: "Quand la couleur n'est pas souhaitable",
        body: [
          "Certaines images perdent leur force en couleur : un portrait de studio des années 1920, une scène de deuil, une composition graphique très contrastée.",
          "Nous le signalons quand c'est le cas. Vous recevez alors les deux versions et vous choisissez.",
        ],
      },
    ],
    closing: {
      title: "Faites-nous voir votre photographie.",
      body: "Nous vous dirons ce que la colorisation peut apporter, ou pas.",
    },
    faqCategory: "qualite",
  },
} as const;

const en: Record<keyof typeof fr, ServicePageContent> = {
  restoration: {
    slug: "restauration-photo",
    eyebrow: "Digital restoration",
    title: "Give a photograph back what time has taken from it.",
    lede:
      "We restore by hand photographs that are damaged, faded, scratched or torn — without ever betraying the original image.",
    toc: "Contents",
    sections: [
      {
        title: "What we repair",
        body: [
          "A photograph degrades in a thousand ways, and each one calls for a different gesture. The light has faded, the emulsion has cracked, the album has stuck to the print, a crease runs across a face. We treat each problem separately — never with a global adjustment.",
        ],
        list: [
          { title: "Scratches and creases", body: "Rebuilding damaged areas from neighbouring pixels, without smoothing texture away." },
          { title: "Stains and mould", body: "Manual detection and removal, restoring the tones underneath." },
          { title: "Fading", body: "Returning to accurate contrast and colour, without casting or oversaturating." },
          { title: "Tears", body: "Reuniting fragments, filling the gaps, restoring outlines." },
          { title: "Blur and low resolution", body: "Sharpening and high-resolution upscaling where the file allows it." },
          { title: "Noise and grain", body: "Noise reduction that keeps faces intact — never a plastic-skin effect." },
        ],
      },
      {
        title: "Our method",
        body: [
          "Every photograph is looked at first. We assess the damage, decide what can be recovered, and tell you before we begin.",
          "The work then happens image by image, by hand. No automatic processing, no algorithmic queue: that is what allows us to respect a face, a light, a period.",
          "Finally, every result is reviewed before release. If something does not satisfy us, we start again.",
        ],
      },
      {
        title: "What we do not do",
        body: [
          "We do not turn your photographs into modern images. We do not smooth faces, we do not alter expressions, we add nothing that was not there.",
          "A period flaw is part of the photograph. Film grain, a slight motion blur, a hesitant framing: these are traces of life, not errors to be corrected.",
        ],
      },
      {
        title: "What you receive",
        body: [
          "Your restored photographs in high resolution, ready to print or to share. A private download link, valid for twelve months.",
          "And if you wish, we can then bind them into a photobook: your restored photographs are kept for twelve months, so you have time to decide.",
        ],
      },
    ],
    closing: {
      title: "Send us just one photograph.",
      body: "See what we do with it. Then decide — and if it does not convince you, you owe us nothing.",
    },
    faqCategory: "qualite",
  },
  enhancement: {
    slug: "amelioration-photo",
    eyebrow: "Photo enhancement",
    title: "All the detail your images are missing.",
    lede:
      "Blurry, dark, noisy photographs taken on an old phone or an entry-level camera: we recover what can be recovered.",
    toc: "Contents",
    sections: [
      {
        title: "When a photograph disappoints",
        body: [
          "A digital photograph can be technically correct and still disappointing: too dark, too noisy, slightly soft, colours flat. That is not inevitable.",
          "Most of these flaws come from the sensor and the compression, not from the moment photographed. What was recorded often holds far more than what you can see.",
        ],
        list: [
          { title: "Sharpness", body: "Correcting motion blur and recovering micro-detail." },
          { title: "Digital noise", body: "Denoising that preserves texture and faces." },
          { title: "Exposure", body: "Opening shadows, holding highlights, accurate contrast." },
          { title: "Colour", body: "Cast correction, measured saturation, neutral whites." },
          { title: "Resolution", body: "High-resolution upscaling for large-format printing." },
        ],
      },
      {
        title: "Old phone photographs",
        body: [
          "The first camera phones produced files of two or three megapixels, heavily compressed. Printed, they quickly become unusable.",
          "We enlarge and clean them so they hold up in print and on a large screen, without inventing detail that does not exist.",
        ],
      },
      {
        title: "What cannot be recovered",
        body: [
          "An area that is completely white or completely black holds no information at all: nothing can bring it back. Nor will a face blurred at close range become sharp.",
          "We tell you honestly. Better an immediate truth than a promise that will not hold.",
        ],
      },
    ],
    closing: {
      title: "Let us see your images.",
      body: "We tell you what is recoverable before you commit to anything.",
    },
    faqCategory: "qualite",
  },
  old: {
    slug: "restauration-photos-anciennes",
    eyebrow: "Old photographs",
    title: "Family photographs deserve better than a cardboard box.",
    lede:
      "Silver prints, studio portraits, family albums: we restore and digitise the images that have been sleeping in boxes for decades.",
    toc: "Contents",
    sections: [
      {
        title: "Why now",
        body: [
          "A silver print degrades even in the dark. The emulsion yellows, the paper turns acidic, albums stick together. What is still legible today will not be in twenty years.",
          "The time to digitise is not later. It is now, while the image is still there.",
        ],
      },
      {
        title: "How we proceed",
        body: [
          "You send us your prints: photograph them with your phone to begin with, or bring them to the workshop for a high-resolution scan.",
          "We then restore each image and deliver usable, archivable files you can share with the whole family.",
        ],
        list: [
          { title: "Scanning", body: "High-resolution scanning of prints when the original quality justifies it." },
          { title: "Restoration", body: "Flaw removal, tone correction, detail recovery." },
          { title: "Archiving", body: "High-resolution files, named and sorted, ready to be passed on." },
          { title: "Passing on", body: "The option of binding everything into a photobook, so the album exists again." },
        ],
      },
      {
        title: "Images that are not only yours",
        body: [
          "A family photograph belongs to a whole family. We can deliver the files to you, and also make them available to several relatives if you wish.",
          "It is often the finest outcome of our work: a brother finding a face again, a cousin discovering a wedding.",
        ],
      },
    ],
    closing: {
      title: "Open the box.",
      body: "Send us the first photographs that come to hand. We will tell you what we can do with them.",
    },
    faqCategory: "service",
  },
  wedding: {
    slug: "restauration-photo-mariage",
    eyebrow: "Wedding",
    title: "Your parents' wedding album, like new.",
    lede:
      "Faded wedding albums, yellowed prints, stuck pages: we bring back the images of the finest day in two families' lives.",
    toc: "Contents",
    sections: [
      {
        title: "A wedding means two families",
        body: [
          "A wedding album is not a personal document: it is the starting point of a family history. Everyone appears in it, everyone looks for themselves in it.",
          "Restoring it gives an entire family back faces it has sometimes never seen — an uncle who left too early, a grandmother at the same age as her granddaughter.",
        ],
      },
      {
        title: "What we do",
        body: [
          "Most wedding albums from the 1960s to the 1980s suffer from the same problems: yellowing, self-adhesive albums that have transferred their glue, warped prints.",
        ],
        list: [
          { title: "De-yellowing", body: "Returning to neutral whites and deep blacks, without a blue cast." },
          { title: "Stuck pages", body: "Digital separation of images, removal of glue and plastic traces." },
          { title: "Reframing", body: "Straightening, cropping and rebalancing the original composition." },
          { title: "Layout", body: "The option of recomposing a full album, in the order of the day." },
        ],
      },
      {
        title: "A gift that cannot be improvised",
        body: [
          "Many of our clients restore their parents' wedding album for a wedding anniversary, or following a bereavement.",
          "We can deliver the files, or produce a Wedding Revival photobook: same 30 × 30 format, same paper, but a new object, presented in a box.",
        ],
      },
    ],
    closing: {
      title: "Start with a photograph of the couple.",
      body: "One is enough for us to tell you what we can do with the rest of the album.",
    },
    faqCategory: "service",
  },
  colourisation: {
    slug: "colorisation-photos",
    eyebrow: "Colourisation",
    title: "The colour they never had.",
    lede:
      "We colourise your black and white photographs from documentary research, never by instinct.",
    toc: "Contents",
    sections: [
      {
        title: "To colourise is not to invent",
        body: [
          "A successful colourisation goes unnoticed. It gives the impression that the photograph was always in colour — which takes rigour, not imagination.",
          "Before laying down a single tone, we research: the period, the place, the season, the light, the materials. A uniform, a fabric, a facade have documented colours.",
        ],
      },
      {
        title: "Our method",
        body: [
          "We work by zones: skin, clothing, sky, vegetation, buildings. Each zone receives a tone consistent with the period and the light of the scene, then a single overall adjustment harmonises everything.",
        ],
        list: [
          { title: "Research", body: "Period, place, fashion, materials: everything that avoids guessing." },
          { title: "Manual colourisation", body: "Separate zones, densities and saturations adjusted one by one." },
          { title: "Harmonisation", body: "One overall adjustment so the image stays a photograph, not a montage." },
          { title: "B&W version kept", body: "We always deliver the restored original in black and white as well." },
        ],
      },
      {
        title: "When colour is not desirable",
        body: [
          "Some images lose their power in colour: a 1920s studio portrait, a mourning scene, a strongly graphic composition.",
          "We point it out when that is the case. You receive both versions and you choose.",
        ],
      },
    ],
    closing: {
      title: "Let us see your photograph.",
      body: "We will tell you what colourisation can bring — or cannot.",
    },
    faqCategory: "qualite",
  },
};

const content: Record<Locale, Record<keyof typeof fr, ServicePageContent>> = {
  fr: fr as unknown as Record<keyof typeof fr, ServicePageContent>,
  en,
  ar: fr as unknown as Record<keyof typeof fr, ServicePageContent>,
};

export function getServicePage(slug: string, locale: Locale): ServicePageContent | null {
  const key = (
    {
      "restauration-photo": "restoration",
      "amelioration-photo": "enhancement",
      "restauration-photos-anciennes": "old",
      "restauration-photo-mariage": "wedding",
      "colorisation-photos": "colourisation",
    } as Record<string, keyof typeof fr>
  )[slug];
  if (!key) return null;
  return content[locale]?.[key] ?? content.fr[key];
}

export const servicePageSlugs = [
  "restauration-photo",
  "amelioration-photo",
  "restauration-photos-anciennes",
  "restauration-photo-mariage",
  "colorisation-photos",
];
