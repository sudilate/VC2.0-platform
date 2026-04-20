import type { FastifyInstance } from "fastify";

// Presentation routes are now handled by the credentials module
// This module can be extended for other presentation-related features
// such as presentation creation, request/response flows, etc.

export async function registerPresentationRoutes(app: FastifyInstance) {
  // Placeholder for future presentation-specific routes
  // The actual verification endpoint is at /v1/presentations/verify in credentials module
}
