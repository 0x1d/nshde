import { host } from "nsh";
import type { AgentDefinition, AgentId, AgentMessage } from "../lib/agents";
import type { StorageBackend } from "../lib/storage/types";

export interface TreeNode {
  path: string;
  name: string;
  kind: "file" | "directory";
  children?: TreeNode[];
}

const defaultBase = () =>
  typeof location !== "undefined"
    ? `${location.protocol}//${location.hostname}:43123`
    : "http://127.0.0.1:43123";

async function apiBase(): Promise<string> {
  if (host.available()) {
    const info = (await host.call("nshde.apiBase", {})) as { base: string };
    return info.base;
  }
  return defaultBase();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await apiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}

export async function loadConfig(): Promise<{ backend: StorageBackend }> {
  if (host.available()) {
    return host.call("nshde.config", {}) as Promise<{ backend: StorageBackend }>;
  }
  return fetchJson("/api/config");
}

export async function loadTree(): Promise<{ tree: TreeNode[]; backend: StorageBackend }> {
  if (host.available()) {
    return host.call("nshde.storage.tree", {}) as Promise<{
      tree: TreeNode[];
      backend: StorageBackend;
    }>;
  }
  return fetchJson("/api/storage?tree=1");
}

export async function readFile(path: string): Promise<string> {
  if (path.endsWith(".wasm")) {
    return "// Binary WASM — edit via agent or external toolchain";
  }
  if (host.available()) {
    const data = (await host.call("nshde.storage.read", { path })) as { content?: string };
    return data.content ?? "";
  }
  const data = await fetchJson<{ content?: string }>(
    `/api/storage?path=${encodeURIComponent(path)}`,
  );
  return data.content ?? "";
}

export async function writeFile(path: string, content: string): Promise<void> {
  if (host.available()) {
    await host.call("nshde.storage.write", { path, content });
    return;
  }
  await fetchJson("/api/storage", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export async function setBackend(backend: StorageBackend): Promise<void> {
  if (host.available()) {
    await host.call("nshde.storage.backend", { backend });
    return;
  }
  await fetchJson("/api/storage", {
    method: "POST",
    body: JSON.stringify({ backend }),
  });
}

export async function listAgents(): Promise<AgentDefinition[]> {
  if (host.available()) {
    const data = (await host.call("nshde.agents.list", {})) as { agents: AgentDefinition[] };
    return data.agents;
  }
  const data = await fetchJson<{ agents: AgentDefinition[] }>("/api/agents");
  return data.agents;
}

export async function generateModule(
  prompt: string,
  agentId: AgentId,
): Promise<{
  messages: AgentMessage[];
  generatedPath?: string;
  source?: string;
}> {
  if (host.available()) {
    return host.call("nshde.agents.generate", { prompt, agentId }) as Promise<{
      messages: AgentMessage[];
      generatedPath?: string;
      source?: string;
    }>;
  }
  return fetchJson("/api/agents", {
    method: "POST",
    body: JSON.stringify({ prompt, agentId }),
  });
}

export async function previewUrl(path: string | null, revision: number): Promise<string> {
  const base = await apiBase();
  if (!path) return `${base}/preview/blank`;
  return `${base}/preview?path=${encodeURIComponent(path)}&r=${revision}`;
}
