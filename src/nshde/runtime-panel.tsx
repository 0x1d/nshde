import { Text, View } from "nsh";
import { WebView } from "nsh";

interface RuntimePanelProps {
  url: string;
  path: string | null;
}

export function RuntimePanel({ url, path }: RuntimePanelProps) {
  return (
    <View class="flex-1 bg-inset">
      <View class="h-9 flex-row items-center justify-between border-b border-border px-3">
        <Text class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runtime preview</Text>
        <Text style={{ numberOfLines: 1 }} class="max-w-[55%] font-mono text-[10px] text-muted-foreground">
          {path ?? "—"}
        </Text>
      </View>
      <View class="flex-1 bg-card">
        <If when={path} else={<EmptyState />}>
          <WebView src={url} class="flex-1" accessibilityLabel="Runtime module preview" />
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
