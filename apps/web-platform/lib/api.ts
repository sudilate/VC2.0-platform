const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type Environment = "development" | "staging" | "production";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationMember {
  id: string;
  role: "owner" | "admin" | "issuer" | "verifier";
  userId?: string;
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  organizationId?: string;
  organizationName?: string;
  inviterId?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface ApiKeyRecord {
  id: string;
  name?: string | null;
  start?: string | null;
  prefix?: string | null;
  metadata?: unknown;
  createdAt?: string;
  expiresAt?: string | null;
  enabled?: boolean;
}

export interface SchemaRecord {
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

export interface TemplateRecord {
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

export interface CredentialVerificationResult {
  success: boolean;
  isSignatureValid?: boolean;
  issuerDid?: string;
  verificationMethod?: string;
  errors?: string[];
}

export interface ActiveOrganizationResponse {
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
    members?: OrganizationMember[];
    invitations?: InvitationRecord[];
  } | null;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
    return `${response.status} ${response.statusText}`;
  }

  return `${response.status} ${response.statusText}`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function listOrganizations() {
  return apiFetch<OrganizationSummary[]>("/v1/organizations", {
    method: "GET",
  });
}

export async function getActiveOrganization() {
  return apiFetch<ActiveOrganizationResponse>("/v1/organizations/active", {
    method: "GET",
  });
}

export async function createOrganization(input: { name: string; slug: string }) {
  return apiFetch<{ organization: OrganizationSummary }>("/v1/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setActiveOrganization(input: { organizationId?: string | null; organizationSlug?: string }) {
  return apiFetch<{ activeOrganizationId?: string | null }>("/v1/organizations/active", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listMembers() {
  return apiFetch<{ members: OrganizationMember[]; total?: number }>("/v1/organizations/active/members", {
    method: "GET",
  });
}

export async function createInvitation(input: { email: string; role: "admin" | "issuer" | "verifier" }) {
  return apiFetch<InvitationRecord>("/v1/organizations/active/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMemberRole(memberId: string, input: { role: "admin" | "issuer" | "verifier" }) {
  return apiFetch<OrganizationMember>(`/v1/organizations/active/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listUserInvitations() {
  return apiFetch<{ invitations: InvitationRecord[] }>("/v1/invitations", {
    method: "GET",
  });
}

export async function acceptInvitation(invitationId: string) {
  return apiFetch<{ invitation: InvitationRecord; member: OrganizationMember | null }>(`/v1/invitations/${invitationId}/accept`, {
    method: "POST",
  });
}

export async function rejectInvitation(invitationId: string) {
  return apiFetch<{ invitation: InvitationRecord | null; member: null }>(`/v1/invitations/${invitationId}/reject`, {
    method: "POST",
  });
}

export async function listApiKeys(environment?: Environment) {
  const query = environment ? `?environment=${environment}` : "";
  return apiFetch<{ apiKeys: ApiKeyRecord[]; total: number }>(`/v1/api-keys${query}`, {
    method: "GET",
  });
}

export async function createApiKey(input: { environment: Environment; name?: string; expiresIn?: number }) {
  return apiFetch<{ key: string; apiKey: ApiKeyRecord }>("/v1/api-keys", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function revokeApiKey(id: string) {
  return apiFetch<{ success: boolean }>(`/v1/api-keys/${id}/revoke`, {
    method: "POST",
  });
}

export async function listSchemas() {
  return apiFetch<{ schemas: SchemaRecord[] }>("/v1/schemas", {
    method: "GET",
  });
}

export async function createSchema(input: {
  name: string;
  version: string;
  schemaUri: string;
  schemaJson: Record<string, unknown>;
}) {
  return apiFetch<{ schema: SchemaRecord }>("/v1/schemas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listTemplates() {
  return apiFetch<{ templates: TemplateRecord[] }>("/v1/templates", {
    method: "GET",
  });
}

export async function createTemplate(input: {
  schemaId: string;
  name: string;
  templateJson: Record<string, unknown>;
}) {
  return apiFetch<{ template: TemplateRecord }>("/v1/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function issueCredential(input: {
  templateId: string;
  issuerDid: string;
  subjectDid: string;
  claims: Record<string, unknown>;
  format?: "vc-jsonld" | "sd-jwt";
}) {
  return apiFetch<{ credential: CredentialRecord }>("/v1/credentials/issue", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listIssuedCredentials() {
  return apiFetch<{ credentials: CredentialRecord[] }>("/v1/credentials", {
    method: "GET",
  });
}

export async function verifyCredential(input: { credential: Record<string, unknown> }) {
  return apiFetch<{ verification: CredentialVerificationResult; errors: string[] }>("/v1/credentials/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
