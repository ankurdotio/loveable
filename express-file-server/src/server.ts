import app from "./app/app.js";
import { PORT, WORK_FOLDER } from "./config/env.js";

app.listen(PORT, () => {
  console.log(`file-server listening on :${PORT} (WORK_FOLDER=${WORK_FOLDER})`);
});
