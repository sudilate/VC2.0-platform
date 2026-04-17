import type { FastifyInstance } from "fastify";

export async function registerPresentationRoutes(app: FastifyInstance) {
  app.post("/v1/presentations/verify", async (_request, reply) => {
    reply.code(501).send({ message: "Presentation verification is not implemented yet." });
  });
}
