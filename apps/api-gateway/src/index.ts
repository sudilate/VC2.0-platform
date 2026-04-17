import { env } from "./config/env";
import { createApp } from "./app";
import "./lib/db";

const app = createApp();

await app.listen({
  host: "0.0.0.0",
  port: env.API_PORT,
});
