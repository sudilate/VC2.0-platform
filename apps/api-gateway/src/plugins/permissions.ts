import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { permissionStatements } from "@vc-platform/types";
import { auth } from "../lib/auth";

type PermissionMap = Partial<{
  [Resource in keyof typeof permissionStatements]: Array<(typeof permissionStatements)[Resource][number]>;
}>;

export async function requireOrganizationPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permissions: PermissionMap,
) {
  try {
    const result = await auth.api.hasPermission({
      headers: fromNodeHeaders(request.headers),
      body: {
        permissions,
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
