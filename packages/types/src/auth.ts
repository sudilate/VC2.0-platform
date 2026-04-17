export const environments = ["development", "staging", "production"] as const;
export type Environment = (typeof environments)[number];

export const organizationRoles = ["owner", "admin", "issuer", "verifier"] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const permissionStatements = {
  organization: ["read"],
  member: ["invite", "update"],
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
  presentation: ["verify"],
  apiKey: ["create", "read", "revoke"],
} as const;

export type PermissionStatements = typeof permissionStatements;
