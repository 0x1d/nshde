import homepage from "../index.html";
import {
  handleAgentsGet,
  handleAgentsPost,
  handleConfigGet,
  handleStorageDelete,
  handleStorageGet,
  handleStoragePost,
} from "@/lib/api/http";

const port = Number(process.env.PORT) || 43123;

const server = Bun.serve({
  port,
  routes: {
    "/": homepage,
    "/api/agents": {
      GET: handleAgentsGet,
      POST: handleAgentsPost,
    },
    "/api/config": {
      GET: handleConfigGet,
    },
    "/api/storage": {
      GET: handleStorageGet,
      POST: handleStoragePost,
      DELETE: handleStorageDelete,
    },
  },
  development: process.env.NODE_ENV !== "production",
});

console.log(`nshde listening on ${server.url}`);
