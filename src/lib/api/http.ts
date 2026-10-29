import { AGENTS, generateModuleFromPrompt, type AgentId } from "@/lib/agents";
import {
  getStorageBackend,
  getStorageProvider,
  getStorageProviderReady,
  getStorageTree,
  setStorageBackend,
} from "@/lib/storage/registry";
import type { StorageBackend } from "@/lib/storage/types";

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return Response.json(data, { ...init, headers });
}

export function handleAgentsGet() {
  return json({ agents: AGENTS });
}

export async function handleAgentsPost(req: Request) {
  const body = (await req.json()) as {
    prompt?: string;
    agentId?: AgentId;
    save?: boolean;
  };

  if (!body.prompt?.trim()) {
    return json({ error: "prompt required" }, { status: 400 });
  }

  const agentId = body.agentId ?? "implementer";
  const { path, source, reply } = generateModuleFromPrompt(body.prompt, agentId);

  if (body.save !== false) {
    await (await getStorageProviderReady()).write(path, source);
  }

  const messages = [
    {
      id: crypto.randomUUID(),
      agentId,
      role: "assistant" as const,
      content: reply,
      timestamp: new Date().toISOString(),
    },
  ];

  return json({
    messages,
    generatedPath: path,
    source,
  });
}

export function handleConfigGet() {
  return json({
    backend: getStorageBackend(),
    options: [
      { id: "fs", label: "Local filesystem", description: ".nshde-data on server" },
      { id: "memory", label: "In-memory", description: "Ephemeral, seeded demo files" },
      { id: "s3", label: "Amazon S3", description: "Uses AWS creds when configured" },
    ],
  });
}

export async function handleStorageGet(req: Request) {
  const provider = await getStorageProviderReady();
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const tree = url.searchParams.get("tree");

  if (tree === "1") {
    const data = await getStorageTree();
    return json({
      backend: getStorageBackend(),
      tree: data,
    });
  }

  if (!path) {
    return json({ error: "path required" }, { status: 400 });
  }

  try {
    const content = await provider.read(path);
    if (content instanceof Uint8Array) {
      return new Response(content, {
        headers: {
          "Content-Type": "application/wasm",
          "X-Nshde-Path": path,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    return json({ path, content, backend: getStorageBackend() });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "read failed" },
      { status: 404 },
    );
  }
}

export async function handleStoragePost(req: Request) {
  const body = (await req.json()) as {
    path?: string;
    content?: string;
    backend?: StorageBackend;
  };

  if (body.backend) {
    await setStorageBackend(body.backend);
    return json({ ok: true, backend: body.backend });
  }

  if (!body.path || body.content === undefined) {
    return json({ error: "path and content required" }, { status: 400 });
  }

  const provider = await getStorageProviderReady();
  await provider.write(body.path, body.content);
  return json({ ok: true, path: body.path });
}

export async function handleStorageDelete(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return json({ error: "path required" }, { status: 400 });
  }
  await getStorageProvider().delete(path);
  return json({ ok: true });
}
