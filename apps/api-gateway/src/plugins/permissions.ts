import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../lib/auth";

export type PermissionMap = Partial<Record<string, string[]>>;

export async function requireOrganizationPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permissions: PermissionMap,
) {
  try {
    const result = await auth.api.hasPermission({
      headers: fromNodeHeaders(request.headers),
      body: {
        permissions: permissions as any,
      },
    });

    if (!result.success) {
      reply.code(403).send({ message: "Insufficient permissions for this organization action." });
      return false;
    }

    return true;
  } catch {
    reply.code(403).send({ message: "Permission check failed for active organization context." });
    return false;
  }
}
