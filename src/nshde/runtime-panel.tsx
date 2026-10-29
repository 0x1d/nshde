import { Text, View } from "nsh";
import { WebView } from "nsh";
import { previewSrc, runtimePath } from "./store";

export function RuntimePanelView() {
  return (
    <View class="flex-1 bg-inset">
      <View class="h-9 flex-row items-center justify-between border-b border-border px-3">
        <Text class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runtime preview</Text>
        <Text class="max-w-[55%] truncate font-mono text-[10px] text-muted-foreground">
          {runtimePath() ?? "—"}
        </Text>
      </View>
      <View class="flex-1 bg-card">
        <If when={runtimePath()} else={<EmptyState />}>
          {() => <WebView src={previewSrc()} class="flex-1" accessibilityLabel="Runtime module preview" />}
        </If>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View class="flex-1 justify-center p-4">
      <Text class="text-sm text-muted-foreground">
        Mount a .nsh.tsx or .wasm module from the object tree, or generate one with an agent.
      </Text>
    </View>
  );
}
