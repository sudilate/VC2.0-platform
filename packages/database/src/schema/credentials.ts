import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authOrganization, authUser } from "./better-auth";

export const schemaStatusEnum = pgEnum("schema_status", ["draft", "published", "archived"]);
export const templateStatusEnum = pgEnum("template_status", ["draft", "active", "archived"]);
export const credentialFormatEnum = pgEnum("credential_format", ["vc-jsonld", "sd-jwt"]);
export const credentialStatusEnum = pgEnum("credential_status", ["issued", "revoked"]);
export const presentationStatusEnum = pgEnum("presentation_status", ["verified", "rejected"]);

export const credentialSchemas = pgTable("credential_schemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => authOrganization.id),
  name: text("name").notNull(),
  version: text("version").notNull(),
  schemaUri: text("schema_uri").notNull(),
  schemaJson: jsonb("schema_json").$type<Record<string, unknown>>().notNull(),
  status: schemaStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const credentialTemplates = pgTable("credential_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => authOrganization.id),
  schemaId: uuid("schema_id").notNull().references(() => credentialSchemas.id),
  name: text("name").notNull(),
  templateJson: jsonb("template_json").$type<Record<string, unknown>>().notNull(),
  status: templateStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const credentialRecords = pgTable("credential_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => authOrganization.id),
  templateId: uuid("template_id").references(() => credentialTemplates.id),
  issuerDid: text("issuer_did").notNull(),
  subjectDid: text("subject_did").notNull(),
  credentialId: text("credential_id").notNull(),
  format: credentialFormatEnum("format").notNull(),
  status: credentialStatusEnum("status").notNull().default("issued"),
  credentialJson: jsonb("credential_json").$type<Record<string, unknown>>().notNull(),
  proofJson: jsonb("proof_json").$type<Record<string, unknown> | null>(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: text("created_by").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  credentialIdUniqueIndex: uniqueIndex("credential_records_credential_id_unique").on(table.credentialId),
}));

export const presentationRecords = pgTable("presentation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => authOrganization.id),
  verifierDid: text("verifier_did").notNull(),
  holderDid: text("holder_did"),
  presentationJson: jsonb("presentation_json").$type<Record<string, unknown>>().notNull(),
  verificationResultJson: jsonb("verification_result_json").$type<Record<string, unknown>>().notNull(),
  status: presentationStatusEnum("status").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
