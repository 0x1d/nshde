import { AlertCircle, Cpu, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { loadModuleFromStorage, type LoadedModule } from "@/lib/modules/loader";

interface RuntimePanelProps {
  modulePath: string | null;
  revision: number;
}

export function RuntimePanel({ modulePath, revision }: RuntimePanelProps) {
  const [loaded, setLoaded] = useState<LoadedModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modulePath) {
      setLoaded(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const isWasm = modulePath.endsWith(".wasm");
        let content: string | Uint8Array;
        if (isWasm) {
          const res = await fetch(`/api/storage?path=${encodeURIComponent(modulePath)}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Failed to load WASM from storage");
          content = new Uint8Array(await res.arrayBuffer());
        } else {
          const res = await fetch(`/api/storage?path=${encodeURIComponent(modulePath)}`, {
            cache: "no-store",
          });
          const data = (await res.json()) as { content: string };
          content = data.content;
        }
        const mod = await loadModuleFromStorage(modulePath, content);
        if (!cancelled) setLoaded(mod);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
          setLoaded(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modulePath, revision]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Cpu className="h-3.5 w-3.5" />
          Runtime preview
        </div>
        <span className="truncate font-mono text-[10px] text-zinc-600">
          {modulePath ?? "—"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!modulePath && (
          <p className="text-sm text-zinc-500">
            Mount a <code className="text-zinc-400">.nsh.tsx</code> or{" "}
            <code className="text-zinc-400">.wasm</code> module from the object tree or generate one with an agent.
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading module…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {loaded?.kind === "tsx" && !loading && !error && (
          <div className="nsh-runtime-root">
            <loaded.component />
          </div>
        )}
        {loaded?.kind === "wasm" && !loading && !error && (
          <div
            className="nsh-runtime-root prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: loaded.renderHtml() }}
          />
        )}
      </div>
    </div>
  );
}
