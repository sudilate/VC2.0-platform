import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { permissionStatements } from "@vc-platform/types";
import { env } from "../config/env";
import { db } from "./db";

const ac = createAccessControl(permissionStatements);

const issuerRole = ac.newRole({
  organization: ["read"],
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
});

const verifierRole = ac.newRole({
  organization: ["read"],
  presentation: ["verify"],
});

const adminRole = ac.newRole({
  organization: ["read"],
  member: ["invite", "update"],
  schema: ["create", "read"],
  template: ["create", "read"],
  credential: ["issue", "read"],
  presentation: ["verify"],
  apiKey: ["create", "read", "revoke"],
});

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      ac,
      roles: {
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
