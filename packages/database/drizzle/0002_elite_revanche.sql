ALTER TABLE "credential_records" DROP CONSTRAINT "credential_records_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_records" DROP CONSTRAINT "credential_records_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_schemas" DROP CONSTRAINT "credential_schemas_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_schemas" DROP CONSTRAINT "credential_schemas_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_templates" DROP CONSTRAINT "credential_templates_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_templates" DROP CONSTRAINT "credential_templates_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "presentation_records" DROP CONSTRAINT "presentation_records_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "organization_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_records" ALTER COLUMN "created_by" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "organization_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_schemas" ALTER COLUMN "created_by" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_templates" ALTER COLUMN "organization_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_templates" ALTER COLUMN "created_by" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "presentation_records" ALTER COLUMN "organization_id" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "credential_records" ADD CONSTRAINT "credential_records_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_records" ADD CONSTRAINT "credential_records_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_schemas" ADD CONSTRAINT "credential_schemas_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_schemas" ADD CONSTRAINT "credential_schemas_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_templates" ADD CONSTRAINT "credential_templates_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_templates" ADD CONSTRAINT "credential_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_records" ADD CONSTRAINT "presentation_records_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;