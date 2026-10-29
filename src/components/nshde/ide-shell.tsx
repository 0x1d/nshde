"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { ObjectTree, useObjectTree } from "./object-tree";
import { CodeEditor } from "./code-editor";
import { AgentPanel } from "./agent-panel";
import { RuntimePanel } from "./runtime-panel";
import type { StorageBackend } from "@/lib/storage/types";

import type { TreeNode } from "./object-tree";

interface IdeShellProps {
  initialTree?: TreeNode[];
}

export function IdeShell({ initialTree = [] }: IdeShellProps) {
  const { tree, refresh } = useObjectTree(initialTree);
  const [selectedPath, setSelectedPath] = useState<string | null>("components/welcome.nsh.tsx");
  const [editorValue, setEditorValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [runtimePath, setRuntimePath] = useState<string | null>("components/welcome.nsh.tsx");
  const [runtimeRevision, setRuntimeRevision] = useState(0);
  const [backend, setBackend] = useState<StorageBackend>("fs");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadFile = useCallback(async (path: string) => {
    if (path.endsWith(".wasm")) {
      setEditorValue("// Binary WASM — edit via agent or external toolchain");
      setSelectedPath(path);
      setDirty(false);
      return;
    }
    const res = await fetch(`/api/storage?path=${encodeURIComponent(path)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { content?: string };
    setEditorValue(data.content ?? "");
    setSelectedPath(path);
    setDirty(false);
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { backend: StorageBackend }) => setBackend(d.backend));
  }, []);

  useEffect(() => {
    if (selectedPath) void loadFile(selectedPath);
  }, [selectedPath, loadFile]);

  async function saveFile() {
    if (!selectedPath || selectedPath.endsWith(".wasm")) return;
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedPath, content: editorValue }),
    });
    setDirty(false);
    if (runtimePath === selectedPath) {
      setRuntimeRevision((r) => r + 1);
    }
    await refresh();
  }

  function handleModuleGenerated(path: string, source: string) {
    refresh();
    setSelectedPath(path);
    setEditorValue(source);
    setDirty(false);
    setRuntimePath(path);
    setRuntimeRevision((r) => r + 1);
  }

  async function changeBackend(next: StorageBackend) {
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backend: next }),
    });
    setBackend(next);
    setSettingsOpen(false);
    await refresh();
    if (selectedPath) await loadFile(selectedPath);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-sky-600 text-sm font-bold">
            N
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">nshde</h1>
            <p className="text-[11px] text-zinc-500">Recursive IDE · NSH runtime shell</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-zinc-600 sm:inline">
            Storage: <span className="text-zinc-400">{backend}</span>
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded-md p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            title="Storage settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {settingsOpen && (
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">File storage backend</p>
          <div className="flex flex-wrap gap-2">
            {(["fs", "memory", "s3"] as StorageBackend[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => changeBackend(b)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  backend === b
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr_300px]">
        <ObjectTree
          tree={tree}
          selectedPath={selectedPath}
          onSelect={(p) => loadFile(p)}
          onRefresh={refresh}
          runtimePath={runtimePath}
          onMountRuntime={(p) => {
            setRuntimePath(p);
            setRuntimeRevision((r) => r + 1);
          }}
        />

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="min-h-[240px] flex-1 lg:min-h-0">
            <CodeEditor
              path={selectedPath}
              value={editorValue}
              onChange={(v) => {
                setEditorValue(v);
                setDirty(true);
              }}
              onSave={saveFile}
            />
          </div>
          <div className="h-[220px] shrink-0 lg:h-[38%]">
            <RuntimePanel modulePath={runtimePath} revision={runtimeRevision} />
          </div>
        </div>

        <AgentPanel onModuleGenerated={handleModuleGenerated} />
      </div>

      {dirty && (
        <div className="shrink-0 border-t border-amber-900/40 bg-amber-950/30 px-4 py-1 text-center text-xs text-amber-200/90">
          Unsaved changes — press Save in the editor
        </div>
      )}
    </div>
  );
}
