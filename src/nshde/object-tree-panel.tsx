import { Scroll, signal, Text, View } from "nsh";
import { Button } from "nsh/base";
import type { TreeNode } from "./api";
import { loadFile, mountRuntime, refreshTree, runtimePath, selectedPath, tree } from "./store";

function TreeItem(props: { node: TreeNode; depth: number }) {
  const open = signal(props.depth < 2);
  const isDir = props.node.kind === "directory";
  const runnable =
    !isDir && (props.node.path.endsWith(".nsh.tsx") || props.node.path.endsWith(".wasm"));

  return (
    <View>
      <View
        class={`flex-row items-center gap-1 rounded-md py-0.5 pr-2 ${selectedPath() === props.node.path ? "bg-accent" : "hover:bg-accent/60"}`}
        style={{ paddingLeft: props.depth * 12 + 4 }}
      >
        <If when={isDir}>
          <Button
            onPress={() => open.set(!open())}
            class="min-w-0 flex-1 flex-row items-center gap-1 px-0 hover:bg-transparent"
          >
            <Text class="w-3.5 text-center text-[10px] text-muted-foreground">{open() ? "▾" : "▸"}</Text>
            <Text class="text-amber-500/90">📁</Text>
            <Text class="flex-1 truncate text-sm text-foreground">{props.node.name}</Text>
          </Button>
        </If>
        <If when={!isDir}>
          <Button
            onPress={() => void loadFile(props.node.path)}
            class="min-w-0 flex-1 flex-row items-center gap-1 px-0 hover:bg-transparent"
          >
            <Text class="w-3.5" />
            <Text class="text-brand">📄</Text>
            <Text class="flex-1 truncate text-sm text-foreground">{props.node.name}</Text>
          </Button>
        </If>
        <If when={runnable}>
          <Button
            onPress={() => mountRuntime(props.node.path)}
            accessibilityLabel={runtimePath() === props.node.path ? "Module is live" : "Mount at runtime"}
            class={`rounded px-1.5 py-0.5 ${runtimePath() === props.node.path ? "bg-up/20" : "bg-muted hover:bg-up/20"}`}
          >
            <Text
              class={`text-[10px] font-semibold uppercase ${runtimePath() === props.node.path ? "text-up" : "text-muted-foreground"}`}
            >
              {runtimePath() === props.node.path ? "live" : "run"}
            </Text>
          </Button>
        </If>
      </View>
      <If when={isDir && open()}>
        <Each of={props.node.children ?? []}>
          {(child) => <TreeItem node={child()} depth={props.depth + 1} />}
        </Each>
      </If>
    </View>
  );
}

export function ObjectTreePanelView() {
  return (
    <View class="flex-1 bg-card">
      <View class="h-9 flex-row items-center justify-between border-b border-border px-3">
        <Text class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Object tree</Text>
        <Button onPress={() => void refreshTree()} class="rounded px-2 py-1 hover:bg-accent active:opacity-70">
          <Text class="text-xs text-brand">Refresh</Text>
        </Button>
      </View>
      <Scroll class="flex-1 p-2">
        <If when={tree().length === 0}>
          <Text class="px-2 text-xs text-muted-foreground">No components yet. Ask an agent to build one.</Text>
        </If>
        <Each of={tree()}>
          {(node) => <TreeItem node={node()} depth={0} />}
        </Each>
      </Scroll>
    </View>
  );
}
