import Fastify from "fastify";
import { env } from "./config/env";
import { registerApiKeyRoutes } from "./modules/api-keys/routes";
import { registerCredentialRoutes } from "./modules/credentials/routes";
import { registerOrganizationRoutes } from "./modules/organizations/routes";
import { registerPresentationRoutes } from "./modules/presentations/routes";
import { registerSchemaRoutes } from "./modules/schemas/routes";
import { registerTemplateRoutes } from "./modules/templates/routes";
import { registerAuthRoutes } from "./plugins/auth-routes";

export function createApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "api-gateway",
  }));

  void registerAuthRoutes(app);
  void registerOrganizationRoutes(app);
  void registerApiKeyRoutes(app);
  void registerSchemaRoutes(app);
  void registerTemplateRoutes(app);
  void registerCredentialRoutes(app);
  void registerPresentationRoutes(app);

  return app;
}
