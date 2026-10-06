/**
 * Contrat de stockage.
 *
 * Une seule interface, deux implémentations : système de fichiers
 * (développement et installations sur serveur unique) et stockage objet
 * compatible S3 (production). Le reste de l'application ne connaît que cette
 * interface — changer d'hébergeur ne doit jamais toucher au code métier.
 *
 * Règle absolue : **aucune clé n'est jamais devinable**. Les fichiers des
 * clients sont privés et ne sortent que par `/api/files/[id]`, après
 * vérification des droits.
 *
 * Note de nommage : ce module s'appelait `storage/`. Ce nom est exclu par
 * défaut de nombreux outils de sauvegarde et d'ignore — le dossier disparaissait
 * silencieusement. Il s'appelle désormais `files/`.
 */

export type UploadTarget = {
  url: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: Date;
};

export interface StorageDriver {
  /** Nom du pilote, enregistré sur chaque fichier (`assets.storage_driver`). */
  readonly name: string;

  /** Écrit un objet. Remplace silencieusement l'existant. */
  put(key: string, body: Buffer, contentType?: string): Promise<void>;

  /** Lit un objet entier. `null` s'il n'existe pas. */
  get(key: string): Promise<Buffer | null>;

  /** Flux de lecture, quand le pilote le permet (évite de tout charger). */
  getStream?(key: string): Promise<ReadableStream<Uint8Array> | null>;

  remove(key: string): Promise<void>;

  /**
   * URL d'envoi direct, signée et à durée limitée.
   * `null` si le pilote ne sait pas : le serveur reprend alors la main.
   */
  createUploadUrl?(
    key: string,
    contentType: string,
    maxBytes: number,
    ttlSeconds: number,
  ): Promise<UploadTarget | null>;
}

/* -------------------------------------------------------------------------- */
/* Clés                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Arborescence des objets.
 *
 * `orders/{commande}/{nature}/…` : les originaux et les fichiers restaurés
 * d'une même commande sont séparés, ce qui rend les purges (90 jours pour les
 * originaux, 12 mois pour les restaurés) triviales et auditables.
 */
export const storageKeys = {
  original: (orderId: string, assetId: string, ext: string) =>
    `orders/${orderId}/originals/${assetId}.${ext}`,

  originalThumb: (orderId: string, assetId: string) =>
    `orders/${orderId}/thumbs/${assetId}.webp`,

  restored: (orderId: string, assetId: string, ext: string) =>
    `orders/${orderId}/restored/${assetId}.${ext}`,

  restoredThumb: (orderId: string, assetId: string) =>
    `orders/${orderId}/restored-thumbs/${assetId}.webp`,

  gallery: (slug: string, variant: string) => `gallery/${slug}/${variant}`,

  invoice: (orderId: string, number: string) => `invoices/${orderId}/${number}.pdf`,

  tmp: (token: string, filename: string) => `tmp/${token}/${filename}`,
} as const;
