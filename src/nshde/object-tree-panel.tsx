import { Scroll, signal, Text, View } from "nsh";
import { Button } from "nsh/base";
import type { TreeNode } from "./api";
import { IconButton, IconChevron, IconLive, IconPlay } from "./icons";
import { mountRuntime, openFileInEditor, runtimePath, selectedPath, tree } from "./store";

function TreeItem(props: { node: TreeNode; depth: number }) {
  const open = signal(props.node.kind === "directory" && props.depth < 1);

  const isDir = props.node.kind === "directory";
  const runnable =
    !isDir && (props.node.path.endsWith(".nsh.tsx") || props.node.path.endsWith(".wasm"));
  const isLive = () => runtimePath() === props.node.path;
  const isSelected = () => selectedPath() === props.node.path;

  return (
    <View>
      <View
        class={`flex-row items-center gap-1 rounded-md py-0.5 pr-1 ${isSelected() && !isDir ? "bg-hover" : "hover:bg-hover"}`}
        style={{ paddingLeft: 8 + props.depth * 14 }}
      >
        <If when={isDir}>
          <Button
            onPress={() => open.set(!open())}
            class="min-w-0 flex-1 flex-row items-center gap-2 px-0 hover:bg-transparent"
          >
            <IconChevron open={open()} />
            <View class="size-1.5 rounded-full bg-brand" />
            <Text class="flex-1 font-mono text-xs text-foreground">{props.node.name}</Text>
          </Button>
        </If>
        <If when={!isDir}>
          <Button
            onPress={() => openFileInEditor(props.node.path)}
            class="min-w-0 flex-1 flex-row items-center gap-2 px-0 hover:bg-transparent"
          >
            <View class="w-3" />
            <View class="size-1.5 rounded-full bg-faint" />
            <Text class="flex-1 font-mono text-xs text-foreground">{props.node.name}</Text>
          </Button>
        </If>
        <If when={runnable}>
          <IconButton
            label={isLive() ? "Module is live" : "Mount at runtime"}
            selected={isLive()}
            onPress={() => mountRuntime(props.node.path)}
          >
            <If when={isLive()} else={<IconPlay tint="var(--muted-foreground)" />}>
              <IconLive active />
            </If>
          </IconButton>
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
    <Scroll class="flex-1 p-2">
      <If when={tree().length === 0}>
        <Text class="px-2 py-3 text-xs text-muted-foreground">No components yet. Ask an agent to build one.</Text>
      </If>
      <Each of={tree()}>{(node) => <TreeItem node={node()} depth={0} />}</Each>
    </Scroll>
  );
}
