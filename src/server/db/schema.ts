import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ========================================================================== */
/* Énumérations                                                                */
/* ========================================================================== */

export const userRole = pgEnum("user_role", ["client", "admin", "superadmin"]);

export const orderStatus = pgEnum("order_status", [
  "draft",
  "awaiting_payment",
  "received",
  "processing",
  "restoring",
  "checking",
  "ready",
  "shipped",
  "completed",
  "on_hold",
  "cancelled",
  "refunded",
]);

export const orderKind = pgEnum("order_kind", ["digital", "photobook", "extra"]);

export const productKind = pgEnum("product_kind", ["pack", "extra"]);
export const productFamily = pgEnum("product_family", ["digital", "photobook"]);
export const extraPricingMode = pgEnum("extra_pricing_mode", [
  "flat",
  "per_photo",
  "per_page",
  "per_copy",
]);

export const assetKind = pgEnum("asset_kind", [
  "original",
  "restored",
  "gallery_before",
  "gallery_after",
  "avatar",
  "invoice",
  "preview",
]);

export const assetStatus = pgEnum("asset_status", [
  "pending",
  "processing",
  "ready",
  "failed",
  "deleted",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);
export const localeCode = pgEnum("locale_code", ["fr", "en", "ar"]);

/* ========================================================================== */
/* Comptes                                                                     */
/* ========================================================================== */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull().default(""),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("client"),
    preferredLocale: localeCode("preferred_locale").notNull().default("fr"),
    notifyEmail: boolean("notify_email").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(sql`lower(${t.email})`).where(sql`${t.deletedAt} is null`),
    index("users_role_idx").on(t.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_unique").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** Jetons à usage unique : lien magique, réinitialisation, vérification d'email. */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    purpose: text("purpose").notNull().default("magic_link"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("verification_token_unique").on(t.tokenHash), index("verification_email_idx").on(t.email)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    governorate: text("governorate"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("TN"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ========================================================================== */
/* Catalogue                                                                   */
/* ========================================================================== */

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  family: productFamily("family").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    kind: productKind("kind").notNull(),
    family: productFamily("family").notNull(),
    categoryId: uuid("category_id").references(() => productCategories.id),

    priceMillimes: integer("price_millimes").notNull(),
    currency: text("currency").notNull().default("TND"),

    photosIncluded: integer("photos_included"),
    photosMin: integer("photos_min"),
    photosMax: integer("photos_max"),
    pagesIncluded: integer("pages_included"),

    turnaroundDaysMin: integer("turnaround_days_min").notNull().default(5),
    turnaroundDaysMax: integer("turnaround_days_max").notNull().default(7),

    extraPhotosGranted: integer("extra_photos_granted").notNull().default(0),
    extraPagesGranted: integer("extra_pages_granted").notNull().default(0),
    pricingMode: extraPricingMode("pricing_mode").notNull().default("flat"),
    maxQuantity: integer("max_quantity"),

    requiresShipping: boolean("requires_shipping").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_family_idx").on(t.family, t.kind), index("products_active_idx").on(t.isActive)],
);

export const productTranslations = pgTable(
  "product_translations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: localeCode("locale").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ctaLabel: text("cta_label"),
  },
  (t) => [primaryKey({ columns: [t.productId, t.locale] })],
);

export const productExtras = pgTable(
  "product_extras",
  {
    packId: uuid("pack_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    extraId: uuid("extra_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isRecommended: boolean("is_recommended").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.packId, t.extraId] })],
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    oldPriceMillimes: integer("old_price_millimes").notNull(),
    newPriceMillimes: integer("new_price_millimes").notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("price_history_product_idx").on(t.productId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ========================================================================== */
/* Commandes                                                                   */
/* ========================================================================== */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    guestEmail: text("guest_email"),
    guestAccessTokenHash: text("guest_access_token_hash"),

    kind: orderKind("kind").notNull().default("digital"),
    status: orderStatus("status").notNull().default("draft"),
    locale: localeCode("locale").notNull().default("fr"),
    currency: text("currency").notNull().default("TND"),

    subtotalMillimes: integer("subtotal_millimes").notNull().default(0),
    shippingMillimes: integer("shipping_millimes").notNull().default(0),
    discountMillimes: integer("discount_millimes").notNull().default(0),
    totalMillimes: integer("total_millimes").notNull().default(0),

    photosQuota: integer("photos_quota").notNull().default(0),
    photosCount: integer("photos_count").notNull().default(0),
    estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),

    customerSnapshot: jsonb("customer_snapshot")
      .$type<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        line1?: string;
        line2?: string;
        city?: string;
        governorate?: string;
        postalCode?: string;
        country?: string;
      }>()
      .notNull(),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),

    shippingCarrier: text("shipping_carrier"),
    shippingTracking: text("shipping_tracking"),

    draftExpiresAt: timestamp("draft_expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_user_idx").on(t.userId),
    index("orders_guest_email_idx").on(t.guestEmail),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    itemType: productKind("item_type").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    unitPriceMillimes: integer("unit_price_millimes").notNull(),
    quantity: integer("quantity").notNull().default(1),
    totalMillimes: integer("total_millimes").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    message: text("message"),
    visibleToClient: boolean("visible_to_client").notNull().default(true),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const orderNotes = pgTable(
  "order_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default(""),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_notes_order_idx").on(t.orderId, t.createdAt)],
);

/* ========================================================================== */
/* Fichiers                                                                    */
/* ========================================================================== */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    transformationId: uuid("transformation_id"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),

    kind: assetKind("kind").notNull(),
    status: assetStatus("status").notNull().default("pending"),

    storageDriver: text("storage_driver").notNull().default("local"),
    storageBucket: text("storage_bucket"),
    storageKey: text("storage_key").notNull().unique(),

    originalFilename: text("original_filename").notNull().default(""),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    checksumSha256: text("checksum_sha256"),

    thumbKey: text("thumb_key"),
    blurPlaceholder: text("blur_placeholder"),
    exifStripped: boolean("exif_stripped").notNull().default(false),

    position: integer("position").notNull().default(0),
    pairedAssetId: uuid("paired_asset_id"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    retainUntil: timestamp("retain_until", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("assets_order_kind_idx").on(t.orderId, t.kind, t.position),
    index("assets_checksum_idx").on(t.checksumSha256),
    index("assets_retain_idx").on(t.retainUntil),
  ],
);

export const downloadTokens = pgTable(
  "download_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    maxDownloads: integer("max_downloads").notNull().default(20),
    downloadCount: integer("download_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("download_tokens_order_idx").on(t.orderId)],
);

/**
 * Jetons d'accès invité à une commande.
 *
 * Plusieurs jetons valides coexistent pour une même commande : chaque email
 * envoyé en crée un nouveau **sans invalider les précédents**. Un client qui
 * rouvre un ancien message doit tomber sur sa commande, pas sur un 404.
 */
export const orderAccessTokens = pgTable(
  "order_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label").notNull().default("lien email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_access_tokens_order_idx").on(t.orderId)],
);

/* ========================================================================== */
/* Paiements & factures                                                        */
/* ========================================================================== */

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    status: paymentStatus("status").notNull().default("pending"),
    amountMillimes: integer("amount_millimes").notNull(),
    currency: text("currency").notNull().default("TND"),
    rawPayload: jsonb("raw_payload").$type<unknown>(),
    failureReason: text("failure_reason"),
    confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    uniqueIndex("payments_provider_ref_unique").on(t.provider, t.providerRef),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    number: text("number").notNull().unique(),
    amountMillimes: integer("amount_millimes").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    snapshot: jsonb("snapshot").$type<unknown>(),
  },
  (t) => [index("invoices_order_idx").on(t.orderId)],
);

/* ========================================================================== */
/* Contenu du site                                                             */
/* ========================================================================== */

export const transformations = pgTable(
  "transformations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull().default("famille"),
    beforeAssetId: uuid("before_asset_id"),
    afterAssetId: uuid("after_asset_id"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transformations_category_idx").on(t.category, t.sortOrder)],
);

export const transformationTranslations = pgTable(
  "transformation_translations",
  {
    transformationId: uuid("transformation_id")
      .notNull()
      .references(() => transformations.id, { onDelete: "cascade" }),
    locale: localeCode("locale").notNull(),
    title: text("title").notNull(),
    workDescription: text("work_description"),
    altBefore: text("alt_before"),
    altAfter: text("alt_after"),
  },
  (t) => [primaryKey({ columns: [t.transformationId, t.locale] })],
);

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorName: text("author_name").notNull(),
    authorLocation: text("author_location"),
    authorContext: text("author_context"),
    rating: integer("rating"),
    avatarAssetId: uuid("avatar_asset_id"),
    isApproved: boolean("is_approved").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("testimonials_approved_idx").on(t.isApproved, t.sortOrder)],
);

export const testimonialTranslations = pgTable(
  "testimonial_translations",
  {
    testimonialId: uuid("testimonial_id")
      .notNull()
      .references(() => testimonials.id, { onDelete: "cascade" }),
    locale: localeCode("locale").notNull(),
    quote: text("quote").notNull(),
  },
  (t) => [primaryKey({ columns: [t.testimonialId, t.locale] })],
);

export const faqItems = pgTable(
  "faq_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: text("category").notNull().default("service"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("faq_category_idx").on(t.category, t.sortOrder)],
);

export const faqTranslations = pgTable(
  "faq_translations",
  {
    faqId: uuid("faq_id")
      .notNull()
      .references(() => faqItems.id, { onDelete: "cascade" }),
    locale: localeCode("locale").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
  },
  (t) => [primaryKey({ columns: [t.faqId, t.locale] })],
);

export const pageBlocks = pgTable(
  "page_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageKey: text("page_key").notNull(),
    blockKey: text("block_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("page_blocks_unique").on(t.pageKey, t.blockKey)],
);

export const pageBlockTranslations = pgTable(
  "page_block_translations",
  {
    pageBlockId: uuid("page_block_id")
      .notNull()
      .references(() => pageBlocks.id, { onDelete: "cascade" }),
    locale: localeCode("locale").notNull(),
    title: text("title"),
    content: text("content"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [primaryKey({ columns: [t.pageBlockId, t.locale] })],
);

/* ========================================================================== */
/* Technique                                                                   */
/* ========================================================================== */

export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull().default({}),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("jobs_status_idx").on(t.status, t.runAfter)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_actor_idx").on(t.actorId),
  ],
);

export const contactRequests = pgTable("contact_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  locale: localeCode("locale").notNull().default("fr"),
  status: text("status").notNull().default("new"),
  handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ========================================================================== */
/* Types exportés                                                              */
/* ========================================================================== */

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Transformation = typeof transformations.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;

export type OrderStatusCode = Order["status"];
