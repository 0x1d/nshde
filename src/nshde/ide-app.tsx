import { signal, Text, untracked, View } from "nsh";
import { keymap } from "nsh";
import { Button, DockArea, type DockAreaLayout, Sheet } from "nsh/base";
import { windowSize } from "nsh";
import type { StorageBackend } from "../lib/storage/types";
import { AgentPanelView } from "./agent-panel";
import { EditorPanelView } from "./editor-panel";
import { ObjectTreePanelView } from "./object-tree-panel";
import { RuntimePanelView } from "./runtime-panel";
import {
  backend,
  bootError,
  bootIdeData,
  changeBackend,
  dirty,
  saveFile,
  settingsOpen,
} from "./store";

const PANEL_TITLES: Record<string, string> = {
  tree: "Object tree",
  editor: "Editor",
  runtime: "Runtime preview",
  agents: "Agents",
};

function initialLayout(): DockAreaLayout {
  return {
    center: {
      type: "split",
      axis: "vertical",
      children: [
        { type: "tabs", panels: ["editor"], activeIndex: 0 },
        { type: "tabs", panels: ["runtime"], activeIndex: 0 },
      ],
      sizes: [null, 240],
    },
    left: { layout: { type: "tabs", panels: ["tree"] }, size: 240, open: true },
    right: { layout: { type: "tabs", panels: ["agents"] }, size: 320, open: true },
  };
}

export function IdeApp() {
  bootIdeData();
  const layout = signal<DockAreaLayout>(initialLayout());
  const wide = () => untracked(windowSize).width >= 900;

  keymap.bind("mod+s", () => {
    if (dirty()) void saveFile();
  });

  const handleThumb =
    "rounded-full bg-border opacity-0 transition-opacity hover:opacity-100 data-[dragging=true]:opacity-100";

  return (
    <View class="flex-1 bg-background">
      <View class="h-11 flex-row items-center justify-between border-b border-border px-4">
        <View class="flex-row items-center gap-3">
          <View class="size-8 items-center justify-center rounded-lg bg-primary">
            <Text class="text-sm font-bold text-primary-foreground">N</Text>
          </View>
          <View class="gap-0.5">
            <Text class="text-sm font-semibold text-foreground">nshde</Text>
            <Text class="text-[11px] text-muted-foreground">Recursive IDE · NSH shell</Text>
          </View>
        </View>
        <View class="flex-row items-center gap-2">
          <If when={wide()}>
            <Text class="text-[11px] text-muted-foreground">
              Storage: <Text class="text-foreground">{backend()}</Text>
            </Text>
          </If>
          <Button
            onPress={() => settingsOpen.set(true)}
            accessibilityLabel="Storage settings"
            class="size-8 items-center justify-center rounded-md hover:bg-accent active:opacity-70"
          >
            <Text class="text-sm text-muted-foreground">⚙</Text>
          </Button>
        </View>
      </View>

      <If when={bootError()}>
        {(err) => (
          <View class="border-b border-destructive/40 bg-destructive/10 px-4 py-2">
            <Text class="text-center text-xs text-destructive">{err()}</Text>
          </View>
        )}
      </If>

      <If when={dirty()}>
        <View class="border-b border-warn/30 bg-warn/10 px-4 py-1">
          <Text class="text-center text-xs text-warn">Unsaved changes — press Save in the editor or ⌘/Ctrl+S</Text>
        </View>
      </If>

      <View class="flex-1">
        <DockArea
          class="flex-1"
          layout={layout()}
          onLayoutChange={({ layout: next }) => layout.set(next)}
          panels={[
            { id: "tree", closable: false },
            { id: "editor", closable: false },
            { id: "runtime", closable: false },
            { id: "agents", closable: false },
          ]}
          groupClass="flex-1 bg-card"
          tabBarClass="flex-row border-b border-border"
          contentClass="flex-1"
          handleAccessibilityLabel="Resize panel"
          handleClass="basis-px bg-border"
          handleThumbClass={handleThumb}
          dockClass="bg-card border-border"
          sheetClass="h-72 rounded-t-2xl border-t border-border bg-card"
          backdropClass="bg-black/40"
          renderTab={(tab) => (
            <View class="h-8 flex-row items-center gap-2 px-3">
              <Text
                class={`truncate text-xs font-medium ${tab.active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {PANEL_TITLES[tab.panel] ?? tab.panel}
              </Text>
              <If when={tab.active}>
                <View class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              </If>
            </View>
          )}
          renderPanel={(panel) => {
            switch (panel.id) {
              case "tree":
                return <ObjectTreePanelView />;
              case "editor":
                return <EditorPanelView />;
              case "runtime":
                return <RuntimePanelView />;
              case "agents":
                return <AgentPanelView />;
              default:
                return (
                  <View class="flex-1 items-center justify-center">
                    <Text class="text-sm text-muted-foreground">Unknown panel</Text>
                  </View>
                );
            }
          }}
        />
      </View>

      <Sheet open={settingsOpen()} onOpenChange={(open) => settingsOpen.set(open)}>
        <View class="gap-3 p-4">
          <Text class="text-base font-semibold text-foreground">File storage backend</Text>
          <Text class="text-sm text-muted-foreground">Where module files are persisted on the server.</Text>
          <View class="flex-row flex-wrap gap-2 pt-2">
            <Each of={["fs", "memory", "s3"] as StorageBackend[]}>
              {(b) => (
                <Button
                  onPress={() => void changeBackend(b())}
                  selected={backend() === b()}
                  class="rounded-md px-3 py-2 text-sm font-medium selected:bg-primary selected:text-primary-foreground hover:bg-accent"
                >
                  <Text class={backend() === b() ? "text-primary-foreground" : "text-foreground"}>{b()}</Text>
                </Button>
              )}
            </Each>
          </View>
        </View>
      </Sheet>
    </View>
  );
}
