import { PROJECT_ID, S3_BUCKET, S3_REGION, WORK_FOLDER } from "./config/env.js";
import { bootstrap } from "./service/sync.service.js";
import { startWatcher } from "./service/watcher.service.js";

async function main() {
  console.log(`[sync] project=${PROJECT_ID} bucket=${S3_BUCKET} region=${S3_REGION} folder=${WORK_FOLDER}`);

  await bootstrap();
  const watcher = startWatcher();

  const shutdown = async (signal: string) => {
    console.log(`[sync] received ${signal}, closing watcher`);
    await watcher.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[sync] fatal", error);
  process.exit(1);
});
