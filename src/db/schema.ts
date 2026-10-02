import type { GenerationOutputs } from "@/modules/generation/results";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STAFF", "VIEWER"]);
export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "INCOMPLETE",
  "READY",
  "APPROVED",
  "GENERATING",
  "GENERATED",
  "PUBLISHED",
  "ARCHIVED",
  "ERROR",
]);
export const generationStatusEnum = pgEnum("generation_status", [
  "QUEUED",
  "PREPARING",
  "UPLOADING_PHOTO",
  "CREATING_CANVA_DESIGN",
  "FINALIZING",
  "DONE",
  "ERROR",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  role: userRoleEnum("role").default("STAFF").notNull(),
  canGenerate: boolean("can_generate").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("app_users_email_uq").on(t.email)]);

export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => appUsers.id),
  provider: varchar("provider", { length: 40 }).notNull(),
  encryptedAccessToken: text("encrypted_access_token"),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  ...timestamps,
}, (t) => [index("oauth_connections_user_idx").on(t.userId)]);

export const workerCategories = pgTable("worker_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 80 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("worker_categories_code_uq").on(t.code)]);

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("skills_code_uq").on(t.code)]);

export const experienceLevels = pgTable("experience_levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("experience_levels_code_uq").on(t.code)]);

export const salaryZones = pgTable("salary_zones", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("salary_zones_code_uq").on(t.code)]);

export const placementOptions = pgTable("placement_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  salaryZoneId: uuid("salary_zone_id").references(() => salaryZones.id),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("placement_options_code_uq").on(t.code)]);

export const salaryRates = pgTable("salary_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => workerCategories.id),
  experienceLevelId: uuid("experience_level_id").notNull().references(() => experienceLevels.id),
  salaryZoneId: uuid("salary_zone_id").notNull().references(() => salaryZones.id),
  salaryMin: numeric("salary_min", { precision: 12, scale: 0 }).notNull(),
  salaryMax: numeric("salary_max", { precision: 12, scale: 0 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  version: varchar("version", { length: 30 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => appUsers.id),
  ...timestamps,
}, (t) => [
  index("salary_rates_category_idx").on(t.categoryId),
  index("salary_rates_experience_idx").on(t.experienceLevelId),
  index("salary_rates_zone_idx").on(t.salaryZoneId),
  index("salary_rates_effective_from_idx").on(t.effectiveFrom),
]);

export const canvaTemplates = pgTable("canva_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  canvaTemplateId: varchar("canva_template_id", { length: 80 }).notNull(),
  version: varchar("version", { length: 30 }).notNull(),
  contentType: varchar("content_type", { length: 60 }).notNull(),
  requiredFieldsJson: jsonb("required_fields_json").$type<string[]>().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("canva_templates_code_uq").on(t.code)]);

export const publishChannels = pgTable("publish_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("publish_channels_code_uq").on(t.code)]);

export const ctaProfiles = pgTable("cta_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  primaryPhone: varchar("primary_phone", { length: 30 }),
  secondaryPhone: varchar("secondary_phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 320 }),
  ctaText: text("cta_text"),
  qrTarget: varchar("qr_target", { length: 500 }),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const registerMappings = pgTable("register_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  mappingType: varchar("mapping_type", { length: 40 }).notNull(),
  sourceValue: varchar("source_value", { length: 200 }).notNull(),
  targetCode: varchar("target_code", { length: 80 }).notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [index("register_mappings_type_source_idx").on(t.mappingType, t.sourceValue)]);

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerRegister: varchar("worker_register", { length: 80 }).notNull(),
  templateCode: varchar("template_code", { length: 40 }).notNull(),
  templateVersion: varchar("template_version", { length: 30 }).notNull(),
  contentHash: varchar("content_hash", { length: 128 }).notNull(),
  status: generationStatusEnum("status").default("QUEUED").notNull(),
  providerJobId: varchar("provider_job_id", { length: 180 }),
  canvaDesignId: varchar("canva_design_id", { length: 100 }),
  resultJson: jsonb("result_json").$type<GenerationOutputs>().default({}).notNull(),
  errorCode: varchar("error_code", { length: 80 }),
  errorMessage: text("error_message"),
  requestedBy: uuid("requested_by").references(() => appUsers.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("generation_jobs_worker_idx").on(t.workerRegister),
  index("generation_jobs_status_idx").on(t.status),
  index("generation_jobs_provider_idx").on(t.providerJobId),
  uniqueIndex("generation_jobs_idempotency_uq").on(t.workerRegister, t.templateVersion, t.contentHash),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerRegister: varchar("worker_register", { length: 80 }),
  userId: uuid("user_id").references(() => appUsers.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 180 }),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("audit_logs_worker_idx").on(t.workerRegister), index("audit_logs_created_idx").on(t.createdAt)]);

export const integrationHealth = pgTable("integration_health", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  message: text("message"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  metadataJson: jsonb("metadata_json"),
}, (t) => [index("integration_health_provider_idx").on(t.provider, t.checkedAt)]);

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  valueJson: jsonb("value_json").notNull(),
  updatedBy: uuid("updated_by").references(() => appUsers.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
