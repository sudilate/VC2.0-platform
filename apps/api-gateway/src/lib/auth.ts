import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  authAccount,
  authApiKey,
  authInvitation,
  authMember,
  authOrganization,
  authSession,
  authUser,
  authVerification,
} from "@vc-platform/database";
import { permissionStatements } from "@vc-platform/types";
import { env } from "../config/env";
import { db } from "./db";

const organizationStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl({
  ...permissionStatements,
  ...organizationStatements,
});

const issuerRole = ac.newRole({
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
});

const verifierRole = ac.newRole({
  presentation: ["verify"],
});

const adminRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
  presentation: ["verify"],
  apiKey: ["create", "read", "revoke"],
});

const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
  presentation: ["verify"],
  apiKey: ["create", "read", "revoke"],
});

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_BASE_URL,
  trustedOrigins: [env.WEB_PLATFORM_ORIGIN],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
      organization: authOrganization,
      member: authMember,
      invitation: authInvitation,
      apikey: authApiKey,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        issuer: issuerRole,
        verifier: verifierRole,
      },
      async sendInvitationEmail(data) {
        console.info("Send invitation", data.id, data.email);
      },
    }),
    apiKey([
      {
        configId: "org-keys",
        defaultPrefix: "org_",
        references: "organization",
      },
    ]),
  ],
});
