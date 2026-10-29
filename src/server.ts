import previewPage from "../preview.html";
import {
  handleAgentsGet,
  handleAgentsPost,
  handleConfigGet,
  handleStorageDelete,
  handleStorageGet,
  handleStoragePost,
} from "@/lib/api/http";

const port = Number(process.env.PORT) || 43123;

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

const server = Bun.serve({
  port,
  routes: {
    "/": new Response(
      "nshde API — run the IDE with: nsh run App.tsx --target web (API on this port)\n",
      { headers: { "Content-Type": "text/plain", ...corsHeaders() } },
    ),
    "/preview": previewPage,
    "/preview/blank": previewPage,
    "/favicon.ico": Bun.file("public/favicon.ico"),
    "/api/agents": {
      GET: () => withCors(handleAgentsGet()),
      POST: (req) => withCors(handleAgentsPost(req)),
      OPTIONS: () => new Response(null, { headers: corsHeaders() }),
    },
    "/api/config": {
      GET: () => withCors(handleConfigGet()),
      OPTIONS: () => new Response(null, { headers: corsHeaders() }),
    },
    "/api/storage": {
      GET: (req) => withCors(handleStorageGet(req)),
      POST: (req) => withCors(handleStoragePost(req)),
      DELETE: (req) => withCors(handleStorageDelete(req)),
      OPTIONS: () => new Response(null, { headers: corsHeaders() }),
    },
  },
  development: process.env.NODE_ENV !== "production",
});

console.log(`nshde API listening on ${server.url}`);
