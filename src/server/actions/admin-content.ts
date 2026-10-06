"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  contactRequests,
  faqItems,
  faqTranslations,
  testimonials,
  testimonialTranslations,
  transformations,
  transformationTranslations,
} from "@/server/db/schema";
import { currentAdmin } from "@/lib/auth/admin";
import { logAudit } from "@/server/services/audit";

/**
 * Édition du contenu du site.
 *
 * Fichier séparé des actions de commande : le contenu et la production ont
 * des cycles de vie différents, et mélanger les deux donnerait un module
 * fourre-tout. Réservé à l'équipe (`admin` et `superadmin`) — seuls les prix
 * et les comptes exigent le superadmin.
 */

function revalidateContent() {
  revalidatePath("/", "layout");
  for (const locale of ["fr", "en", "ar"] as const) {
    revalidatePath(`/${locale}`, "layout");
  }
  revalidatePath("/admin/contenu");
}

async function requireTeam() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

/* -------------------------------------------------------------------------- */
/* Questions fréquentes                                                        */
/* -------------------------------------------------------------------------- */

export async function saveFaq(formData: FormData) {
  const admin = await requireTeam();

  const id = z.string().uuid().optional().parse(formData.get("id") ?? undefined) || null;
  const values = {
    category: z.string().trim().min(1).parse(formData.get("category") ?? "service"),
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    isPublished: formData.get("isPublished") === "on",
  };

  let faqId = id;
  if (id) {
    await db.update(faqItems).set(values).where(eq(faqItems.id, id));
  } else {
    const [created] = await db.insert(faqItems).values(values).returning();
    faqId = created!.id;
  }

  for (const locale of ["fr", "en"] as const) {
    const question = String(formData.get(`question.${locale}`) ?? "").trim();
    const answer = String(formData.get(`answer.${locale}`) ?? "").trim();
    if (!question && !answer) continue;

    const entry = { question, answer };
    await db
      .insert(faqTranslations)
      .values({ faqId: faqId!, locale, ...entry })
      .onConflictDoUpdate({
        target: [faqTranslations.faqId, faqTranslations.locale],
        set: entry,
      });
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: id ? "faq.updated" : "faq.created",
    entityType: "faq",
    entityId: faqId!,
  });

  revalidateContent();
  redirect("/admin/contenu/faq");
}

export async function deleteFaq(formData: FormData) {
  const admin = await requireTeam();
  const id = z.string().uuid().parse(formData.get("id"));

  await db.delete(faqItems).where(eq(faqItems.id, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "faq.deleted",
    entityType: "faq",
    entityId: id,
  });

  revalidateContent();
  redirect("/admin/contenu/faq");
}

/* -------------------------------------------------------------------------- */
/* Témoignages                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Modération des témoignages.
 *
 * Un témoignage n'apparaît jamais sans approbation explicite : c'est la voix
 * d'un client réel, publiée au nom de l'atelier.
 */
export async function saveTestimonial(formData: FormData) {
  const admin = await requireTeam();

  const id = z.string().uuid().optional().parse(formData.get("id") ?? undefined) || null;
  const values = {
    authorName: z.string().trim().min(1).parse(formData.get("authorName")),
    authorLocation: z.string().trim().optional().parse(formData.get("authorLocation") ?? undefined) || null,
    authorContext: z.string().trim().optional().parse(formData.get("authorContext") ?? undefined) || null,
    rating: Number(formData.get("rating") ?? 5) || 5,
    isApproved: formData.get("isApproved") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };

  let itemId = id;
  if (id) {
    await db.update(testimonials).set(values).where(eq(testimonials.id, id));
  } else {
    const [created] = await db.insert(testimonials).values(values).returning();
    itemId = created!.id;
  }

  for (const locale of ["fr", "en"] as const) {
    const quote = String(formData.get(`quote.${locale}`) ?? "").trim();
    if (!quote) continue;

    await db
      .insert(testimonialTranslations)
      .values({ testimonialId: itemId!, locale, quote })
      .onConflictDoUpdate({
        target: [testimonialTranslations.testimonialId, testimonialTranslations.locale],
        set: { quote },
      });
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: id ? "testimonial.updated" : "testimonial.created",
    entityType: "testimonial",
    entityId: itemId!,
    metadata: { approved: values.isApproved },
  });

  revalidateContent();
  redirect("/admin/contenu/temoignages");
}

export async function deleteTestimonial(formData: FormData) {
  const admin = await requireTeam();
  const id = z.string().uuid().parse(formData.get("id"));

  await db.delete(testimonials).where(eq(testimonials.id, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "testimonial.deleted",
    entityType: "testimonial",
    entityId: id,
  });

  revalidateContent();
  redirect("/admin/contenu/temoignages");
}

/* -------------------------------------------------------------------------- */
/* Galerie avant / après                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Modification d'une transformation.
 *
 * Les deux images ne se remplacent pas ici : une paire avant/après est
 * produite par `npm run gallery` depuis `assets/sources`, puis reprise dans
 * cet écran pour sa légende, sa catégorie et sa publication.
 */
export async function saveTransformation(formData: FormData) {
  const admin = await requireTeam();

  const id = z.string().uuid().parse(formData.get("id"));
  await db
    .update(transformations)
    .set({
      category: z.string().trim().min(1).parse(formData.get("category") ?? "famille"),
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      isPublished: formData.get("isPublished") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    })
    .where(eq(transformations.id, id));

  for (const locale of ["fr", "en"] as const) {
    const title = String(formData.get(`title.${locale}`) ?? "").trim();
    if (!title) continue;

    const entry = {
      title,
      workDescription: String(formData.get(`workDescription.${locale}`) ?? "").trim() || null,
      altBefore: String(formData.get(`altBefore.${locale}`) ?? "").trim() || null,
      altAfter: String(formData.get(`altAfter.${locale}`) ?? "").trim() || null,
    };

    await db
      .insert(transformationTranslations)
      .values({ transformationId: id, locale, ...entry })
      .onConflictDoUpdate({
        target: [transformationTranslations.transformationId, transformationTranslations.locale],
        set: entry,
      });
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "transformation.updated",
    entityType: "transformation",
    entityId: id,
  });

  revalidateContent();
  redirect("/admin/contenu/galerie");
}

/* -------------------------------------------------------------------------- */
/* Demandes de contact                                                         */
/* -------------------------------------------------------------------------- */

export async function markContactHandled(formData: FormData) {
  const admin = await requireTeam();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["new", "read", "handled", "spam"]).parse(formData.get("status") ?? "handled");

  await db
    .update(contactRequests)
    .set({ status, handledBy: admin.id })
    .where(eq(contactRequests.id, id));

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: "contact.status_changed",
    entityType: "contact_request",
    entityId: id,
    metadata: { status },
  });

  revalidatePath("/admin/demandes");
  redirect("/admin/demandes");
}
