import { config, connectDb } from "./config/index.js";
import { startCacheCleanup } from "prime-qa-api-common";
import { createApp } from "./app.js";

const app = createApp();

connectDb().then(() => {
  startCacheCleanup(5 * 60 * 1000);

  const server = app.listen(config.port, () =>
    console.log(`✅ User Service running on port ${config.port}`)
  );

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing server...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});
