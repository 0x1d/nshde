import { host } from "nsh";
import type { AgentDefinition, AgentId, AgentMessage } from "../lib/agents";
import type { StorageBackend } from "../lib/storage/types";

export interface TreeNode {
  path: string;
  name: string;
  kind: "file" | "directory";
  children?: TreeNode[];
}

function defaultBase(): string {
  if (typeof location === "undefined") return "http://127.0.0.1:43123";
  const { protocol, hostname, port, origin } = location;
  if (port === "43123" || port === "") return origin;
  if ((hostname === "127.0.0.1" || hostname === "localhost") && port !== "43123") {
    return `${protocol}//${hostname}:43123`;
  }
  return origin;
}

async function apiBase(): Promise<string> {
  if (host.available()) {
    try {
      const info = (await host.call("nshde.apiBase", {})) as { base: string };
      if (info.base) return info.base;
    } catch {
      /* fall through to fetch */
    }
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

async function hostOrFetch<T>(name: string, args: Record<string, unknown>, fetchFn: () => Promise<T>): Promise<T> {
  if (host.available()) {
    try {
      return (await host.call(name, args)) as T;
    } catch {
      /* host bridge failed — use direct fetch */
    }
  }
  return fetchFn();
}

export async function loadConfig(): Promise<{ backend: StorageBackend }> {
  return hostOrFetch("nshde.config", {}, () => fetchJson("/api/config"));
}

export async function loadTree(): Promise<{ tree: TreeNode[]; backend: StorageBackend }> {
  return hostOrFetch("nshde.storage.tree", {}, () => fetchJson("/api/storage?tree=1"));
}

export async function readFile(path: string): Promise<string> {
  if (path.endsWith(".wasm")) {
    return "// Binary WASM — edit via agent or external toolchain";
  }
  const data = await hostOrFetch("nshde.storage.read", { path }, () =>
    fetchJson<{ content?: string }>(`/api/storage?path=${encodeURIComponent(path)}`),
  );
  return (data as { content?: string }).content ?? "";
}

export async function writeFile(path: string, content: string): Promise<void> {
  await hostOrFetch(
    "nshde.storage.write",
    { path, content },
    () =>
      fetchJson("/api/storage", {
        method: "POST",
        body: JSON.stringify({ path, content }),
      }),
  );
}

export async function setBackend(backend: StorageBackend): Promise<void> {
  await hostOrFetch(
    "nshde.storage.backend",
    { backend },
    () =>
      fetchJson("/api/storage", {
        method: "POST",
        body: JSON.stringify({ backend }),
      }),
  );
}

export async function listAgents(): Promise<AgentDefinition[]> {
  const data = await hostOrFetch("nshde.agents.list", {}, () =>
    fetchJson<{ agents: AgentDefinition[] }>("/api/agents"),
  );
  return (data as { agents: AgentDefinition[] }).agents;
}

export async function generateModule(
  prompt: string,
  agentId: AgentId,
): Promise<{
  messages: AgentMessage[];
  generatedPath?: string;
  source?: string;
}> {
  return hostOrFetch("nshde.agents.generate", { prompt, agentId }, () =>
    fetchJson("/api/agents", {
      method: "POST",
      body: JSON.stringify({ prompt, agentId }),
    }),
  );
}

export async function previewUrl(path: string | null, revision: number): Promise<string> {
  const base = await apiBase();
  if (!path) return `${base}/preview/blank`;
  return `${base}/preview?path=${encodeURIComponent(path)}&r=${revision}`;
}
