import type { FastifyInstance } from "fastify";

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.post("/v1/templates", async (_request, reply) => {
    reply.code(501).send({ message: "Template creation is not implemented yet." });
  });
}
