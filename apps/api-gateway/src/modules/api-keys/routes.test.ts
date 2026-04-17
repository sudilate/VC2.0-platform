import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerApiKeyRoutes } from "./routes";

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

type ApiKeyRecord = {
  id: string;
  configId: string;
  referenceId: string;
  metadata: unknown;
};

describe("api key routes", () => {
  let app = Fastify();
  const keys: ApiKeyRecord[] = [];

  beforeEach(async () => {
    keys.length = 0;

    const fakeApi = {
      async createApiKey(input: { body: { configId?: string; organizationId?: string; metadata?: unknown } }) {
        const key = {
          id: crypto.randomUUID(),
          configId: input.body.configId ?? "org-keys",
          referenceId: input.body.organizationId ?? "org_1",
          metadata: input.body.metadata,
        } satisfies ApiKeyRecord;

        keys.push(key);

        return {
          key: `org_${crypto.randomUUID().slice(0, 8)}`,
          apiKey: key,
        };
      },
      async listApiKeys(_input: unknown) {
        return {
          apiKeys: keys,
          total: keys.length,
        };
      },
      async deleteApiKey(input: { body: { keyId: string } }) {
        const index = keys.findIndex((item) => item.id === input.body.keyId);
        if (index >= 0) {
          keys.splice(index, 1);
        }

        return { success: true };
      },
    };

    app = Fastify();
    await registerApiKeyRoutes(app, {
      authApi: fakeApi as never,
      sessionGuard: makeSessionGuard("org_1"),
      activeOrganizationGuard: noOpActiveGuard,
      permissionChecker: allowPermission,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates org-scoped api key and stamps environment metadata", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
      payload: {
        environment: "staging",
        name: "staging key",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as { apiKey: ApiKeyRecord };
    expect(body.apiKey.referenceId).toBe("org_1");
    expect(body.apiKey.metadata).toEqual({ environment: "staging" });
  });

  it("lists keys and filters by environment", async () => {
    keys.push(
      {
        id: crypto.randomUUID(),
        configId: "org-keys",
        referenceId: "org_1",
        metadata: { environment: "development" },
      },
      {
        id: crypto.randomUUID(),
        configId: "org-keys",
        referenceId: "org_1",
        metadata: { environment: "production" },
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/api-keys?environment=production",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { apiKeys: ApiKeyRecord[] };
    expect(body.apiKeys).toHaveLength(1);
    expect(body.apiKeys[0]?.metadata).toEqual({ environment: "production" });
  });

  it("revokes api key by id", async () => {
    const keyId = crypto.randomUUID();
    keys.push({
      id: keyId,
      configId: "org-keys",
      referenceId: "org_1",
      metadata: { environment: "development" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/api-keys/${keyId}/revoke`,
    });

    expect(response.statusCode).toBe(200);
    expect(keys).toHaveLength(0);
  });
});
