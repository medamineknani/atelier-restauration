import "server-only";

import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

/**
 * Journal d'audit. Toute action sensible passe par ici : accès à un fichier
 * client, changement de statut, modification de prix, suppression.
 */
export async function logAudit(input: AuditInput) {
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
}
