/**
 * Remplace le module `server-only` hors de Next.
 *
 * Next le fournit lui-même et l'utilise pour empêcher qu'un module serveur ne
 * finisse dans le bundle du navigateur. Dans un test Node, la question ne se
 * pose pas : tout est serveur.
 */
export {};
