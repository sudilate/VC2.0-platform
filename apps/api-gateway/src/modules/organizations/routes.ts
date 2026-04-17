import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { auth } from "../../lib/auth";
import {
  getActiveOrganizationIdOrThrow,
  getSessionOrThrow,
  requireActiveOrganization,
  requireSession,
} from "../../plugins/guards";
import { requireOrganizationPermission } from "../../plugins/permissions";

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

const listMembersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const inviteMemberBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "issuer", "verifier"]),
});

const updateMemberRoleParamsSchema = z.object({
  memberId: z.string().min(1),
});

const updateMemberRoleBodySchema = z.object({
  role: z.enum(["admin", "issuer", "verifier"]),
});

export interface OrganizationApi {
  createOrganization: typeof auth.api.createOrganization;
  listOrganizations: typeof auth.api.listOrganizations;
  setActiveOrganization: typeof auth.api.setActiveOrganization;
  getFullOrganization: typeof auth.api.getFullOrganization;
  listMembers: typeof auth.api.listMembers;
  createInvitation: typeof auth.api.createInvitation;
  updateMemberRole: typeof auth.api.updateMemberRole;
}

export interface OrganizationRouteDependencies {
  authApi?: OrganizationApi;
  sessionGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  activeOrganizationGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  permissionChecker?: (
    request: FastifyRequest,
    reply: FastifyReply,
    permissions: Parameters<typeof requireOrganizationPermission>[2],
  ) => Promise<boolean>;
}

export async function registerOrganizationRoutes(app: FastifyInstance, deps: OrganizationRouteDependencies = {}) {
  const authApi = deps.authApi ?? auth.api;
  const sessionGuard = deps.sessionGuard ?? requireSession;
  const activeOrganizationGuard = deps.activeOrganizationGuard ?? requireActiveOrganization;
  const permissionChecker = deps.permissionChecker ?? requireOrganizationPermission;

  app.post("/v1/organizations", { preHandler: [sessionGuard] }, async (request, reply) => {
    const session = getSessionOrThrow(request);
    const body = createOrganizationSchema.parse(request.body);

    const organization = await authApi.createOrganization({
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

  app.get("/v1/organizations", { preHandler: [sessionGuard] }, async (request) => {
    return authApi.listOrganizations({
      headers: fromNodeHeaders(request.headers),
    });
  });

  app.post("/v1/organizations/active", { preHandler: [sessionGuard] }, async (request) => {
    const body = setActiveOrganizationSchema.parse(request.body);
    return authApi.setActiveOrganization({
      headers: fromNodeHeaders(request.headers),
      body,
    });
  });

  app.get("/v1/organizations/active", { preHandler: [sessionGuard] }, async (request) => {
    const session = getSessionOrThrow(request);
    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      return { activeOrganization: null };
    }

    const activeOrganization = await authApi.getFullOrganization({
      headers: fromNodeHeaders(request.headers),
      query: {
        organizationId: activeOrganizationId,
      },
    });

    return { activeOrganization };
  });

  app.get("/v1/organizations/active/members", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { organization: ["read"] });
    if (!allowed) {
      return;
    }

    const query = listMembersQuerySchema.parse(request.query);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const members = await authApi.listMembers({
      headers: fromNodeHeaders(request.headers),
      query: {
        organizationId,
        limit: query.limit,
        offset: query.offset,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    return members;
  });

  app.post("/v1/organizations/active/invitations", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { member: ["invite"] });
    if (!allowed) {
      return;
    }

    const body = inviteMemberBodySchema.parse(request.body);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const invitation = await authApi.createInvitation({
      headers: fromNodeHeaders(request.headers),
      body: {
        email: body.email,
        role: body.role,
        organizationId,
      },
    });

    reply.code(201).send(invitation);
  });

  app.patch("/v1/organizations/active/members/:memberId", { preHandler: [sessionGuard, activeOrganizationGuard] }, async (request, reply) => {
    const allowed = await permissionChecker(request, reply, { member: ["update"] });
    if (!allowed) {
      return;
    }

    const params = updateMemberRoleParamsSchema.parse(request.params);
    const body = updateMemberRoleBodySchema.parse(request.body);
    const organizationId = getActiveOrganizationIdOrThrow(request);

    const updated = await authApi.updateMemberRole({
      headers: fromNodeHeaders(request.headers),
      body: {
        memberId: params.memberId,
        role: body.role,
        organizationId,
      },
    });

    return updated;
  });
}
