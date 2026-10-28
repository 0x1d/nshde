import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";

const Monaco = lazy(() => import("@monaco-editor/react"));

interface CodeEditorProps {
  path: string | null;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  readOnly?: boolean;
}

export function CodeEditor({
  path,
  value,
  onChange,
  onSave,
  readOnly,
}: CodeEditorProps) {
  const language = path?.endsWith(".json")
    ? "json"
    : path?.endsWith(".wasm")
      ? "plaintext"
      : "typescript";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="truncate font-mono text-xs text-zinc-400">
          {path ?? "No file selected"}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={!path || readOnly}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium",
            path && !readOnly
              ? "bg-sky-600 text-white hover:bg-sky-500"
              : "bg-zinc-800 text-zinc-500",
          )}
        >
          Save
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Loading editor…
            </div>
          }
        >
          <Monaco
            height="100%"
            language={language}
            theme="vs-dark"
            value={value}
            onChange={(v) => onChange(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-geist-mono), monospace",
              readOnly,
              scrollBeyondLastLine: false,
              padding: { top: 12 },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
