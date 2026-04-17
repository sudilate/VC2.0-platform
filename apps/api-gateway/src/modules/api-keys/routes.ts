import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { environments } from "@vc-platform/types";
import { auth } from "../../lib/auth";
import { normalizeApiKeyMetadata, parseEnvironmentMetadata, requireSession } from "../../plugins/guards";

const createApiKeySchema = z.object({
  organizationId: z.string().min(1),
  environment: z.enum(environments),
  name: z.string().min(2).max(120).optional(),
  expiresIn: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listApiKeysSchema = z.object({
  organizationId: z.string().min(1),
  environment: z.enum(environments).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function registerApiKeyRoutes(app: FastifyInstance) {
  app.post("/v1/api-keys", { preHandler: [requireSession] }, async (request, reply) => {
    const body = createApiKeySchema.parse(request.body);

    const response = await auth.api.createApiKey({
      headers: fromNodeHeaders(request.headers),
      body: {
        configId: "org-keys",
        organizationId: body.organizationId,
        name: body.name,
        expiresIn: body.expiresIn,
        metadata: normalizeApiKeyMetadata(body.environment, body.metadata),
      },
    });

    reply.code(201).send(response);
  });

  app.get("/v1/api-keys", { preHandler: [requireSession] }, async (request) => {
    const query = listApiKeysSchema.parse(request.query);

    const listed = await auth.api.listApiKeys({
      headers: fromNodeHeaders(request.headers),
      query: {
        configId: "org-keys",
        organizationId: query.organizationId,
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
}
