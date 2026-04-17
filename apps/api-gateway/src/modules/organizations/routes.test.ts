import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerOrganizationRoutes } from "./routes";

function makeSessionGuard(activeOrganizationId = "org_1") {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.authSession = {
      user: {
        id: "user_1",
        email: "user@example.com",
        name: "User One",
      },
      session: {
        id: "session_1",
        userId: "user_1",
        activeOrganizationId,
      },
    };
  };
}

const noOpActiveGuard = async () => {
  return;
};

const allowPermission = async () => true;

describe("organization routes", () => {
  let app = Fastify();

  beforeEach(async () => {
    const fakeApi = {
      async createOrganization(input: { body: { name: string; slug: string } }) {
        return {
          id: "org_1",
          name: input.body.name,
          slug: input.body.slug,
        };
      },
      async setActiveOrganization(input: { body: { organizationId?: string } }) {
        return {
          activeOrganizationId: input.body.organizationId,
        };
      },
      async getFullOrganization() {
        return {
          id: "org_1",
          name: "Acme",
          slug: "acme",
          members: [],
        };
      },
      async listMembers() {
        return {
          members: [
            {
              id: "member_1",
              organizationId: "org_1",
              userId: "user_1",
              role: "admin",
              user: {
                id: "user_1",
                email: "user@example.com",
                name: "User One",
                image: undefined,
              },
            },
          ],
          total: 1,
        };
      },
      async createInvitation(input: { body: { email: string; role: string; organizationId: string } }) {
        return {
          id: "invite_1",
          email: input.body.email,
          role: input.body.role,
          organizationId: input.body.organizationId,
          status: "pending",
        };
      },
      async updateMemberRole(input: { body: { memberId: string; role: string } }) {
        return {
          id: input.body.memberId,
          role: input.body.role,
        };
      },
    };

    app = Fastify();
    await registerOrganizationRoutes(app, {
      authApi: fakeApi as never,
      sessionGuard: makeSessionGuard("org_1"),
      activeOrganizationGuard: noOpActiveGuard,
      permissionChecker: allowPermission,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("lists active organization members", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/active/members",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { members: Array<{ id: string }> };
    expect(body.members).toHaveLength(1);
    expect(body.members[0]?.id).toBe("member_1");
  });

  it("creates invitation in active organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/active/invitations",
      payload: {
        email: "issuer@example.com",
        role: "issuer",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as { organizationId: string; email: string };
    expect(body.organizationId).toBe("org_1");
    expect(body.email).toBe("issuer@example.com");
  });

  it("updates member role in active organization", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/active/members/member_1",
      payload: {
        role: "verifier",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { id: string; role: string };
    expect(body.id).toBe("member_1");
    expect(body.role).toBe("verifier");
  });
});
