import "dotenv/config";
import { app } from "./app.js";
import { connectStore, isMemoryMode } from "./store.js";

const port = process.env.PORT ?? 4000;
connectStore().then(() => app.listen(port, () => {
  console.log(`Helpdesk API listening on http://localhost:${port} (${isMemoryMode ? "memory development mode" : "MongoDB"})`);
})).catch((error) => {
  console.error("Could not start the API:", error);
  process.exitCode = 1;
});
