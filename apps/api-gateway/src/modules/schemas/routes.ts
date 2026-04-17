import type { FastifyInstance } from "fastify";

export async function registerSchemaRoutes(app: FastifyInstance) {
  app.post("/v1/schemas", async (_request, reply) => {
    reply.code(501).send({ message: "Schema creation is not implemented yet." });
  });
}
