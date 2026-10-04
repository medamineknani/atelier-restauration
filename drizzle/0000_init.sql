CREATE TYPE "public"."asset_kind" AS ENUM('original', 'restored', 'gallery_before', 'gallery_after', 'avatar', 'invoice', 'preview');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('pending', 'processing', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."extra_pricing_mode" AS ENUM('flat', 'per_photo', 'per_page', 'per_copy');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."locale_code" AS ENUM('fr', 'en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."order_kind" AS ENUM('digital', 'photobook', 'extra');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_payment', 'received', 'processing', 'restoring', 'checking', 'ready', 'shipped', 'completed', 'on_hold', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."product_family" AS ENUM('digital', 'photobook');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('pack', 'extra');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"governorate" text,
	"postal_code" text,
	"country" text DEFAULT 'TN' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"transformation_id" uuid,
	"uploaded_by" uuid,
	"kind" "asset_kind" NOT NULL,
	"status" "asset_status" DEFAULT 'pending' NOT NULL,
	"storage_driver" text DEFAULT 'local' NOT NULL,
	"storage_bucket" text,
	"storage_key" text NOT NULL,
	"original_filename" text DEFAULT '' NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" text,
	"thumb_key" text,
	"blur_placeholder" text,
	"exif_stripped" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"paired_asset_id" uuid,
	"released_at" timestamp with time zone,
	"retain_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text,
	"message" text NOT NULL,
	"locale" "locale_code" DEFAULT 'fr' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "download_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"asset_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_downloads" integer DEFAULT 20 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "download_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text DEFAULT 'service' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_translations" (
	"faq_id" uuid NOT NULL,
	"locale" "locale_code" NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	CONSTRAINT "faq_translations_faq_id_locale_pk" PRIMARY KEY("faq_id","locale")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"number" text NOT NULL,
	"amount_millimes" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot" jsonb,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"item_type" "product_kind" NOT NULL,
	"name_snapshot" text NOT NULL,
	"unit_price_millimes" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_millimes" integer NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"message" text,
	"visible_to_client" boolean DEFAULT true NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" uuid,
	"guest_email" text,
	"guest_access_token_hash" text,
	"kind" "order_kind" DEFAULT 'digital' NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"locale" "locale_code" DEFAULT 'fr' NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"subtotal_millimes" integer DEFAULT 0 NOT NULL,
	"shipping_millimes" integer DEFAULT 0 NOT NULL,
	"discount_millimes" integer DEFAULT 0 NOT NULL,
	"total_millimes" integer DEFAULT 0 NOT NULL,
	"photos_quota" integer DEFAULT 0 NOT NULL,
	"photos_count" integer DEFAULT 0 NOT NULL,
	"estimated_ready_at" timestamp with time zone,
	"customer_snapshot" jsonb NOT NULL,
	"customer_notes" text,
	"internal_notes" text,
	"shipping_carrier" text,
	"shipping_tracking" text,
	"draft_expires_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "page_block_translations" (
	"page_block_id" uuid NOT NULL,
	"locale" "locale_code" NOT NULL,
	"title" text,
	"content" text,
	"data" jsonb,
	CONSTRAINT "page_block_translations_page_block_id_locale_pk" PRIMARY KEY("page_block_id","locale")
);
--> statement-breakpoint
CREATE TABLE "page_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" text NOT NULL,
	"block_key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_millimes" integer NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"raw_payload" jsonb,
	"failure_reason" text,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"old_price_millimes" integer NOT NULL,
	"new_price_millimes" integer NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"family" "product_family" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_extras" (
	"pack_id" uuid NOT NULL,
	"extra_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_extras_pack_id_extra_id_pk" PRIMARY KEY("pack_id","extra_id")
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"product_id" uuid NOT NULL,
	"locale" "locale_code" NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"cta_label" text,
	CONSTRAINT "product_translations_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "product_kind" NOT NULL,
	"family" "product_family" NOT NULL,
	"category_id" uuid,
	"price_millimes" integer NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"photos_included" integer,
	"photos_min" integer,
	"photos_max" integer,
	"pages_included" integer,
	"turnaround_days_min" integer DEFAULT 5 NOT NULL,
	"turnaround_days_max" integer DEFAULT 7 NOT NULL,
	"extra_photos_granted" integer DEFAULT 0 NOT NULL,
	"extra_pages_granted" integer DEFAULT 0 NOT NULL,
	"pricing_mode" "extra_pricing_mode" DEFAULT 'flat' NOT NULL,
	"max_quantity" integer,
	"requires_shipping" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonial_translations" (
	"testimonial_id" uuid NOT NULL,
	"locale" "locale_code" NOT NULL,
	"quote" text NOT NULL,
	CONSTRAINT "testimonial_translations_testimonial_id_locale_pk" PRIMARY KEY("testimonial_id","locale")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"author_location" text,
	"author_context" text,
	"rating" integer,
	"avatar_asset_id" uuid,
	"is_approved" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transformation_translations" (
	"transformation_id" uuid NOT NULL,
	"locale" "locale_code" NOT NULL,
	"title" text NOT NULL,
	"work_description" text,
	"alt_before" text,
	"alt_after" text,
	CONSTRAINT "transformation_translations_transformation_id_locale_pk" PRIMARY KEY("transformation_id","locale")
);
--> statement-breakpoint
CREATE TABLE "transformations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'famille' NOT NULL,
	"before_asset_id" uuid,
	"after_asset_id" uuid,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transformations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"preferred_locale" "locale_code" DEFAULT 'fr' NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text DEFAULT 'magic_link' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_tokens" ADD CONSTRAINT "download_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_tokens" ADD CONSTRAINT "download_tokens_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_translations" ADD CONSTRAINT "faq_translations_faq_id_faq_items_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."faq_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_block_translations" ADD CONSTRAINT "page_block_translations_page_block_id_page_blocks_id_fk" FOREIGN KEY ("page_block_id") REFERENCES "public"."page_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_extras" ADD CONSTRAINT "product_extras_pack_id_products_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_extras" ADD CONSTRAINT "product_extras_extra_id_products_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonial_translations" ADD CONSTRAINT "testimonial_translations_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformation_translations" ADD CONSTRAINT "transformation_translations_transformation_id_transformations_id_fk" FOREIGN KEY ("transformation_id") REFERENCES "public"."transformations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assets_order_kind_idx" ON "assets" USING btree ("order_id","kind","position");--> statement-breakpoint
CREATE INDEX "assets_checksum_idx" ON "assets" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE INDEX "assets_retain_idx" ON "assets" USING btree ("retain_until");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "download_tokens_order_idx" ON "download_tokens" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "faq_category_idx" ON "faq_items" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "invoices_order_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_notes_order_idx" ON "order_notes" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_status_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_guest_email_idx" ON "orders" USING btree ("guest_email");--> statement-breakpoint
CREATE UNIQUE INDEX "page_blocks_unique" ON "page_blocks" USING btree ("page_key","block_key");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_unique" ON "payments" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "price_history_product_idx" ON "price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_family_idx" ON "products" USING btree ("family","kind");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "testimonials_approved_idx" ON "testimonials" USING btree ("is_approved","sort_order");--> statement-breakpoint
CREATE INDEX "transformations_category_idx" ON "transformations" USING btree ("category","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email")) WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_token_unique" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_email_idx" ON "verification_tokens" USING btree ("email");