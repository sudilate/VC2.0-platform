import { jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { authOrganization, authUser } from "./better-auth";

export const schemaStatusEnum = pgEnum("schema_status", ["draft", "published", "archived"]);
export const templateStatusEnum = pgEnum("template_status", ["draft", "active", "archived"]);
export const credentialFormatEnum = pgEnum("credential_format", ["vc-jsonld", "sd-jwt"]);
export const credentialStatusEnum = pgEnum("credential_status", ["issued", "revoked"]);
export const presentationStatusEnum = pgEnum("presentation_status", ["verified", "rejected"]);

export const credentialSchemas = pgTable("credential_schemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: varchar("organization_id", { length: 128 }).notNull().references(() => authOrganization.id),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 64 }).notNull(),
  schemaUri: varchar("schema_uri", { length: 2048 }).notNull(),
  schemaJson: jsonb("schema_json").$type<Record<string, unknown>>().notNull(),
  status: schemaStatusEnum("status").notNull().default("draft"),
  createdBy: varchar("created_by", { length: 128 }).notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const credentialTemplates = pgTable("credential_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: varchar("organization_id", { length: 128 }).notNull().references(() => authOrganization.id),
  schemaId: uuid("schema_id").notNull().references(() => credentialSchemas.id),
  name: varchar("name", { length: 255 }).notNull(),
  templateJson: jsonb("template_json").$type<Record<string, unknown>>().notNull(),
  status: templateStatusEnum("status").notNull().default("draft"),
  createdBy: varchar("created_by", { length: 128 }).notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const credentialRecords = pgTable("credential_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: varchar("organization_id", { length: 128 }).notNull().references(() => authOrganization.id),
  templateId: uuid("template_id").references(() => credentialTemplates.id),
  issuerDid: varchar("issuer_did", { length: 2048 }).notNull(),
  subjectDid: varchar("subject_did", { length: 2048 }).notNull(),
  credentialId: varchar("credential_id", { length: 2048 }).notNull(),
  format: credentialFormatEnum("format").notNull(),
  status: credentialStatusEnum("status").notNull().default("issued"),
  credentialJson: jsonb("credential_json").$type<Record<string, unknown>>().notNull(),
  proofJson: jsonb("proof_json").$type<Record<string, unknown> | null>(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: varchar("created_by", { length: 128 }).notNull().references(() => authUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  credentialIdUniqueIndex: uniqueIndex("credential_records_credential_id_unique").on(table.credentialId),
}));

export const presentationRecords = pgTable("presentation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: varchar("organization_id", { length: 128 }).notNull().references(() => authOrganization.id),
  verifierDid: varchar("verifier_did", { length: 2048 }).notNull(),
  holderDid: varchar("holder_did", { length: 2048 }),
  presentationJson: jsonb("presentation_json").$type<Record<string, unknown>>().notNull(),
  verificationResultJson: jsonb("verification_result_json").$type<Record<string, unknown>>().notNull(),
  status: presentationStatusEnum("status").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
