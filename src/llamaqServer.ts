import { bullBoardService } from "@/apps/bullboard/bullBoardService";
import { llamaQManager } from "@/apps/llamaq/lib/llamaQManager";
import { llamaqRouter } from "@/apps/llamaq/llamaqRouter";
import { Hono } from "hono";

const PORT = 4000;

const queues = await llamaQManager.bootstrap();

queues.forEach((queue) => bullBoardService.addQueue(queue));

const app = new Hono();

bullBoardService.registerRouter(app, "/ui");

app.route("/llamaq", llamaqRouter);
app.get("/", (c) => {
  return c.text("yaaay");
});

export default {
  fetch: app.fetch,
  port: PORT,
};

console.log(`LlamaQ Running...`);
console.log(`To access the Bull UI, open http://localhost:${PORT}/ui`);

process.on("SIGINT", () => {
  process.nextTick(() => process.exit(0));
});
