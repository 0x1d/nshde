import type { JSX } from "nsh";
import { Scroll, signal, Text, View } from "nsh";
import { Button, Collapsible } from "nsh/base";
import type { TreeNode } from "./api";
import { IconButton, IconChevron, IconLive, IconPlay } from "./icons";
import { isPathDirty, mountRuntime, openFileInEditor, runtimePath, selectedPath, tree } from "./store";

function TreeRow(props: {
  node: TreeNode;
  depth: number;
  open?: boolean;
  onPress: () => void;
  trailing?: JSX.Element;
}) {
  const isDir = props.node.kind === "directory";
  const isSelected = () => !isDir && selectedPath() === props.node.path;
  const dirty = () => !isDir && isPathDirty(props.node.path);
  return (
    <View
      class={`h-6 flex-row items-center gap-1 rounded-sm pr-1 ${isSelected() ? "bg-accent" : "hover:bg-hover"}`}
      style={{ paddingLeft: 4 + props.depth * 12 }}
    >
      <Button
        onPress={props.onPress}
        accessibilityLabel={props.node.name}
        accessibilityState={isDir ? { expanded: !!props.open } : undefined}
        class="min-w-0 flex-1 flex-row items-center gap-1.5 px-0 hover:bg-transparent"
      >
        <If when={isDir} else={<View class="w-3.5" />}>
          <IconChevron open={props.open} />
        </If>
        <Text numberOfLines={1} class="flex-1 font-mono text-[13px] text-foreground">
          {props.node.name}
        </Text>
        <If when={dirty()}>
          <View class="size-1.5 rounded-full bg-warn" />
        </If>
      </Button>
      {props.trailing}
    </View>
  );
}

function TreeItem(props: { node: TreeNode; depth: number }) {
  const open = signal(props.node.kind === "directory" && props.depth < 1);
  const isDir = props.node.kind === "directory";
  const runnable =
    !isDir && (props.node.path.endsWith(".nsh.tsx") || props.node.path.endsWith(".wasm"));
  const isLive = () => runtimePath() === props.node.path;

  const trailing = runnable ? (
    <IconButton
      label={isLive() ? "Module is live" : "Mount at runtime"}
      selected={isLive()}
      onPress={() => mountRuntime(props.node.path)}
    >
      <If when={isLive()} else={<IconPlay />}>
        <IconLive active />
      </If>
    </IconButton>
  ) : undefined;

  if (!isDir) {
    return (
      <TreeRow
        node={props.node}
        depth={props.depth}
        onPress={() => openFileInEditor(props.node.path)}
        trailing={trailing}
      />
    );
  }

  return (
    <Collapsible
      open={open()}
      content={
        <View>
          <Each of={props.node.children ?? []}>
            {(child) => <TreeItem node={child()} depth={props.depth + 1} />}
          </Each>
        </View>
      }
    >
      <TreeRow node={props.node} depth={props.depth} open={open()} onPress={() => open.set(!open())} />
    </Collapsible>
  );
}

export function ObjectTreePanelView() {
  return (
    <Scroll class="flex-1 bg-inset">
      <View class="gap-px py-1">
        <If when={tree().length === 0}>
          <Text class="px-3 py-2 text-[13px] text-muted-foreground">No components yet. Ask an agent to build one.</Text>
        </If>
        <Each of={tree()}>{(node) => <TreeItem node={node()} depth={0} />}</Each>
      </View>
    </Scroll>
  );
}
