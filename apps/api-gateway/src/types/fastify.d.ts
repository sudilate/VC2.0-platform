import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    authSession?: {
      user: {
        id: string;
        email: string;
        name?: string | null;
      };
      session: {
        id: string;
        userId: string;
        activeOrganizationId?: string | null;
      };
    };
  }
}
