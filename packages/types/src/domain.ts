import type { Environment, OrganizationRole } from "./auth";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  organizationId: string;
  environment: Environment;
  name: string;
  prefix: string;
  hashedKey: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CredentialSchemaRecord {
  id: string;
  organizationId: string;
  name: string;
  version: string;
  schemaUri: string;
  schemaJson: Record<string, unknown>;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialTemplateRecord {
  id: string;
  organizationId: string;
  schemaId: string;
  name: string;
  templateJson: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialRecord {
  id: string;
  organizationId: string;
  templateId: string | null;
  issuerDid: string;
  subjectDid: string;
  credentialId: string;
  format: "vc-jsonld" | "sd-jwt";
  status: "issued" | "revoked";
  credentialJson: Record<string, unknown>;
  proofJson: Record<string, unknown> | null;
  issuedAt: string;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PresentationRecord {
  id: string;
  organizationId: string;
  verifierDid: string;
  holderDid: string | null;
  presentationJson: Record<string, unknown>;
  verificationResultJson: Record<string, unknown>;
  status: "verified" | "rejected";
  verifiedAt: string | null;
  createdAt: string;
}
