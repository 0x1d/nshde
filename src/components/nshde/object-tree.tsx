import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TreeNode {
  path: string;
  name: string;
  kind: "file" | "directory";
  children?: TreeNode[];
}

interface ObjectTreeProps {
  tree: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRefresh: () => void;
  runtimePath: string | null;
  onMountRuntime: (path: string) => void;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  runtimePath,
  onMountRuntime,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  runtimePath: string | null;
  onMountRuntime: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.kind === "directory";
  const selected = selectedPath === node.path;
  const mounted = runtimePath === node.path;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-0.5 pr-2 text-sm",
          selected ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {isDir ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
            <span className="truncate">{node.name}</span>
          </button>
        ) : (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            onClick={() => onSelect(node.path)}
          >
            <span className="w-3.5 shrink-0" />
            <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />
            <span className="truncate">{node.name}</span>
          </button>
        )}
        {!isDir && (node.path.endsWith(".nsh.tsx") || node.path.endsWith(".wasm")) && (
          <button
            type="button"
            title="Mount at runtime"
            onClick={() => onMountRuntime(node.path)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-0 group-hover:opacity-100",
              mounted
                ? "bg-emerald-700/80 text-emerald-100 opacity-100"
                : "bg-zinc-700 text-zinc-200 hover:bg-emerald-700/60",
            )}
          >
            {mounted ? "live" : "run"}
          </button>
        )}
      </div>
      {isDir && open && node.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          runtimePath={runtimePath}
          onMountRuntime={onMountRuntime}
        />
      ))}
    </div>
  );
}

export function ObjectTree({
  tree,
  selectedPath,
  onSelect,
  onRefresh,
  runtimePath,
  onMountRuntime,
}: ObjectTreeProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Object tree
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          Refresh
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tree.length === 0 ? (
          <p className="px-2 text-xs text-zinc-600">No components yet. Ask an agent to build one.</p>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
              runtimePath={runtimePath}
              onMountRuntime={onMountRuntime}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function useObjectTree(initialTree: TreeNode[] = []) {
  const [tree, setTree] = useState<TreeNode[]>(initialTree);
  const refresh = useCallback(async () => {
    const res = await fetch("/api/storage?tree=1", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tree: TreeNode[] };
    setTree(data.tree ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tree, refresh };
}
