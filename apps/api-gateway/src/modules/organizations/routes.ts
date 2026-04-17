import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { auth } from "../../lib/auth";
import { getSessionOrThrow, requireSession } from "../../plugins/guards";

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  keepCurrentActiveOrganization: z.boolean().optional(),
});

const setActiveOrganizationSchema = z.object({
  organizationId: z.string().nullable().optional(),
  organizationSlug: z.string().optional(),
});

export async function registerOrganizationRoutes(app: FastifyInstance) {
  app.post("/v1/organizations", { preHandler: [requireSession] }, async (request, reply) => {
    const session = getSessionOrThrow(request);
    const body = createOrganizationSchema.parse(request.body);

    const organization = await auth.api.createOrganization({
      headers: fromNodeHeaders(request.headers),
      body: {
        name: body.name,
        slug: body.slug,
        logo: body.logo,
        metadata: body.metadata,
        userId: session.user.id,
        keepCurrentActiveOrganization: body.keepCurrentActiveOrganization,
      },
    });

    reply.code(201).send({ organization });
  });

  app.post("/v1/organizations/active", { preHandler: [requireSession] }, async (request) => {
    const body = setActiveOrganizationSchema.parse(request.body);
    return auth.api.setActiveOrganization({
      headers: fromNodeHeaders(request.headers),
      body,
    });
  });

  app.get("/v1/organizations/active", { preHandler: [requireSession] }, async (request) => {
    const session = getSessionOrThrow(request);
    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      return { activeOrganization: null };
    }

    const activeOrganization = await auth.api.getFullOrganization({
      headers: fromNodeHeaders(request.headers),
      query: {
        organizationId: activeOrganizationId,
      },
    });

    return { activeOrganization };
  });
}
