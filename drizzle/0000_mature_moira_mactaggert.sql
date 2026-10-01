CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'INCOMPLETE', 'READY', 'APPROVED', 'GENERATING', 'GENERATED', 'PUBLISHED', 'ARCHIVED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('QUEUED', 'PREPARING', 'UPLOADING_PHOTO', 'CREATING_CANVA_DESIGN', 'FINALIZING', 'DONE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'STAFF', 'VIEWER');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value_json" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(200),
	"role" "user_role" DEFAULT 'STAFF' NOT NULL,
	"can_generate" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_register" varchar(80),
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(180),
	"before_json" jsonb,
	"after_json" jsonb,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canva_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	"canva_template_id" varchar(80) NOT NULL,
	"version" varchar(30) NOT NULL,
	"content_type" varchar(60) NOT NULL,
	"required_fields_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cta_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"primary_phone" varchar(30),
	"secondary_phone" varchar(30),
	"email" varchar(320),
	"website" varchar(320),
	"cta_text" text,
	"qr_target" varchar(500),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_register" varchar(80) NOT NULL,
	"template_code" varchar(40) NOT NULL,
	"template_version" varchar(30) NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"status" "generation_status" DEFAULT 'QUEUED' NOT NULL,
	"provider_job_id" varchar(180),
	"canva_design_id" varchar(100),
	"error_code" varchar(80),
	"error_message" text,
	"requested_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"status" varchar(30) NOT NULL,
	"message" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" varchar(40) NOT NULL,
	"encrypted_access_token" text,
	"encrypted_refresh_token" text,
	"expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"salary_zone_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "register_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_type" varchar(40) NOT NULL,
	"source_value" varchar(200) NOT NULL,
	"target_code" varchar(80) NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"experience_level_id" uuid NOT NULL,
	"salary_zone_id" uuid NOT NULL,
	"salary_min" numeric(12, 0) NOT NULL,
	"salary_max" numeric(12, 0) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" varchar(30) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"icon" varchar(80),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_app_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_requested_by_app_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_options" ADD CONSTRAINT "placement_options_salary_zone_id_salary_zones_id_fk" FOREIGN KEY ("salary_zone_id") REFERENCES "public"."salary_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rates" ADD CONSTRAINT "salary_rates_category_id_worker_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."worker_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rates" ADD CONSTRAINT "salary_rates_experience_level_id_experience_levels_id_fk" FOREIGN KEY ("experience_level_id") REFERENCES "public"."experience_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rates" ADD CONSTRAINT "salary_rates_salary_zone_id_salary_zones_id_fk" FOREIGN KEY ("salary_zone_id") REFERENCES "public"."salary_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rates" ADD CONSTRAINT "salary_rates_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_uq" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_worker_idx" ON "audit_logs" USING btree ("worker_register");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "canva_templates_code_uq" ON "canva_templates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "experience_levels_code_uq" ON "experience_levels" USING btree ("code");--> statement-breakpoint
CREATE INDEX "generation_jobs_worker_idx" ON "generation_jobs" USING btree ("worker_register");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generation_jobs_provider_idx" ON "generation_jobs" USING btree ("provider_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_idempotency_uq" ON "generation_jobs" USING btree ("worker_register","template_version","content_hash");--> statement-breakpoint
CREATE INDEX "integration_health_provider_idx" ON "integration_health" USING btree ("provider","checked_at");--> statement-breakpoint
CREATE INDEX "oauth_connections_user_idx" ON "oauth_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "placement_options_code_uq" ON "placement_options" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "publish_channels_code_uq" ON "publish_channels" USING btree ("code");--> statement-breakpoint
CREATE INDEX "register_mappings_type_source_idx" ON "register_mappings" USING btree ("mapping_type","source_value");--> statement-breakpoint
CREATE INDEX "salary_rates_category_idx" ON "salary_rates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "salary_rates_experience_idx" ON "salary_rates" USING btree ("experience_level_id");--> statement-breakpoint
CREATE INDEX "salary_rates_zone_idx" ON "salary_rates" USING btree ("salary_zone_id");--> statement-breakpoint
CREATE INDEX "salary_rates_effective_from_idx" ON "salary_rates" USING btree ("effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_zones_code_uq" ON "salary_zones" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_code_uq" ON "skills" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_categories_code_uq" ON "worker_categories" USING btree ("code");