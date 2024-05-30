import { Hono } from "hono";
import { getThing } from "./lib/thing";

const app = new Hono();

app.get("/", (c) => {
  return c.text(getThing());
});

export default {
  fetch: app.fetch,
  port: 4000,
};

console.log("Thing is running on port 4000...");

process.on("SIGINT", () => {
  process.nextTick(() => process.exit(0));
});
