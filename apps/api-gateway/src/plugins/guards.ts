import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    reply.code(401).send({
      message: "Unauthorized",
    });
    return;
  }

  request.authSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    session: {
      id: session.session.id,
      userId: session.session.userId,
      activeOrganizationId: (session.session as { activeOrganizationId?: string | null }).activeOrganizationId,
    },
  };
}

export async function requireActiveOrganization(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authSession?.session.activeOrganizationId) {
    reply.code(400).send({
      message: "No active organization set for this session.",
    });
    return;
  }
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({
      message: "Missing API key",
    });
    return;
  }

  if (authHeader.length < 20) {
    reply.code(401).send({
      message: "Invalid API key",
    });
    return;
  }

  reply.header("x-api-key-present", "true");
  return;
}

export function getSessionOrThrow(request: FastifyRequest) {
  if (!request.authSession) {
    throw new Error("Session guard must run before accessing session context.");
  }

  return request.authSession;
}

export function getActiveOrganizationIdOrThrow(request: FastifyRequest): string {
  const session = getSessionOrThrow(request);
  if (!session.session.activeOrganizationId) {
    throw new Error("Active organization is not set on session context.");
  }

  return session.session.activeOrganizationId;
}

export function parseEnvironmentMetadata(metadata: unknown): string | null {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as { environment?: unknown };
      return typeof parsed.environment === "string" ? parsed.environment : null;
    } catch {
      return null;
    }
  }

  if (typeof metadata === "object") {
    const maybeObject = metadata as { environment?: unknown };
    return typeof maybeObject.environment === "string" ? maybeObject.environment : null;
  }

  return null;
}

export function normalizeApiKeyMetadata(environment: string, metadata: Record<string, unknown> = {}) {
  return {
    ...metadata,
    environment,
  };
}
