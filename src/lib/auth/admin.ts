import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * Accès à l'administration.
 *
 * Le back-office n'est pas multilingue et n'emprunte rien au site public :
 * sa garde lui est propre. Un client connecté qui tape `/admin` n'est pas
 * « presque » autorisé — il est redirigé, sans fuite d'information.
 */
export async function currentAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.role === "admin" || user.role === "superadmin" ? user : null;
}

/** Garde de page : redirige vers la connexion admin en mémorisant la cible. */
export async function requireAdminPage(returnTo = "/admin"): Promise<SessionUser> {
  const admin = await currentAdmin();
  if (!admin) redirect(`/admin/connexion?suivant=${encodeURIComponent(returnTo)}`);
  return admin;
}

/** Garde réservée au superadmin : prix, catalogue, équipe, paramètres sensibles. */
export async function requireSuperAdminPage(returnTo = "/admin"): Promise<SessionUser> {
  const admin = await currentAdmin();
  if (!admin) redirect(`/admin/connexion?suivant=${encodeURIComponent(returnTo)}`);
  if (admin.role !== "superadmin") redirect(`${returnTo}?erreur=permissions`);
  return admin;
}
