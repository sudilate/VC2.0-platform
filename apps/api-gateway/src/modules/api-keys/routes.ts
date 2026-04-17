import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { environments } from "@vc-platform/types";
import { auth } from "../../lib/auth";
import {
  getActiveOrganizationIdOrThrow,
  normalizeApiKeyMetadata,
  parseEnvironmentMetadata,
  requireActiveOrganization,
  requireSession,
} from "../../plugins/guards";
import { requireOrganizationPermission } from "../../plugins/permissions";

const createApiKeySchema = z.object({
  environment: z.enum(environments),
  name: z.string().min(2).max(120).optional(),
  expiresIn: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listApiKeysSchema = z.object({
  environment: z.enum(environments).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const revokeApiKeySchema = z.object({
  id: z.string().min(1),
});

export interface ApiKeyApi {
  createApiKey: typeof auth.api.createApiKey;
  listApiKeys: typeof auth.api.listApiKeys;
  deleteApiKey: typeof auth.api.deleteApiKey;
}

export interface ApiKeyRouteDependencies {
  authApi?: ApiKeyApi;
  sessionGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  activeOrganizationGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  permissionChecker?: (
    request: FastifyRequest,
    reply: FastifyReply,
    permissions: Parameters<typeof requireOrganizationPermission>[2],
  ) => Promise<boolean>;
}

export async function registerApiKeyRoutes(app: FastifyInstance, deps: ApiKeyRouteDependencies = {}) {
  const authApi = deps.authApi ?? auth.api;
  const sessionGuard = deps.sessionGuard ?? requireSession;
  const activeOrganizationGuard = deps.activeOrganizationGuard ?? requireActiveOrganization;
  const permissionChecker = deps.permissionChecker ?? requireOrganizationPermission;

  app.post("/v1/api-keys", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const body = createApiKeySchema.parse(request.body);
    const allowed = await permissionChecker(request, reply, { apiKey: ["create"] });
    if (!allowed) {
      return;
    }

    const organizationId = getActiveOrganizationIdOrThrow(request);

    const response = await authApi.createApiKey({
      headers: fromNodeHeaders(request.headers),
      body: {
        configId: "org-keys",
        organizationId,
        name: body.name,
        expiresIn: body.expiresIn,
        metadata: normalizeApiKeyMetadata(body.environment, body.metadata),
      },
    });

    reply.code(201).send(response);
  });

  app.get("/v1/api-keys", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { apiKey: ["read"] });
    if (!allowed) {
      return;
    }

    const query = listApiKeysSchema.parse(request.query);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const listed = await authApi.listApiKeys({
      headers: fromNodeHeaders(request.headers),
      query: {
        configId: "org-keys",
        organizationId,
        limit: query.limit,
        offset: query.offset,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    const filteredKeys = query.environment
      ? listed.apiKeys.filter((apiKey) => parseEnvironmentMetadata(apiKey.metadata) === query.environment)
      : listed.apiKeys;

    return {
      apiKeys: filteredKeys,
      total: filteredKeys.length,
      limit: query.limit,
      offset: query.offset,
    };
  });

  app.post("/v1/api-keys/:id/revoke", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { apiKey: ["revoke"] });
    if (!allowed) {
      return;
    }

    const params = revokeApiKeySchema.parse(request.params);

    const deleted = await authApi.deleteApiKey({
      headers: fromNodeHeaders(request.headers),
      body: {
        configId: "org-keys",
        keyId: params.id,
      },
    });

    return {
      success: deleted.success,
    };
  });
}
