ALTER TABLE "credential_records" ALTER COLUMN "organization_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "issuer_did" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "subject_did" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "credential_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "organization_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "schema_uri" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_templates" ALTER COLUMN "organization_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_templates" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credential_templates" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "presentation_records" ALTER COLUMN "organization_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "presentation_records" ALTER COLUMN "verifier_did" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "presentation_records" ALTER COLUMN "holder_did" SET DATA TYPE text;