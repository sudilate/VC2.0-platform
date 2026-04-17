import type { FastifyInstance } from "fastify";

export async function registerCredentialRoutes(app: FastifyInstance) {
  app.post("/v1/credentials/issue", async (_request, reply) => {
    reply.code(501).send({ message: "Credential issuance is not implemented yet." });
  });
}
