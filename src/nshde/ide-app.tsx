import { Image, Text, untracked, View } from "nsh";
import { keymap } from "nsh";
import { platform, windowSize } from "nsh";
import { Button, DockArea, type DockAreaRef, Sheet } from "nsh/base";
import type { StorageBackend } from "../lib/storage/types";
import logo from "../../assets/logo.svg";
import { AgentPanelView } from "./agent-panel";
import {
  dockRegionTitle,
  panelRegistry,
  pathFromFilePanel,
  tabTitle,
} from "./dock-layout";
import { EditorPanelView } from "./editor-panel";
import { IconClose, IconPanelHide } from "./icons";
import { ObjectTreePanelView } from "./object-tree-panel";
import { RuntimePanelView } from "./runtime-panel";
import {
  backend,
  bootError,
  bootIdeData,
  changeBackend,
  dirty,
  dockLayout,
  isFilePanel,
  saveFile,
  settingsOpen,
  syncActiveEditorFromLayout,
} from "./store";

const handleThumb =
  "rounded-full bg-border opacity-0 transition-opacity hover:opacity-100 data-[dragging=true]:opacity-100";

export function IdeApp() {
  bootIdeData();
  const layout = dockLayout;
  const wide = () => untracked(windowSize).width >= 900;
  const pointer = platform.desktop;
  let area!: DockAreaRef;

  keymap.bind("mod+s", () => {
    if (dirty()) void saveFile();
  });

  return (
    <View class="flex-1 bg-background">
      <View class="relative h-11 flex-row items-center border-b border-line px-3">
        <View class="pointer-events-none absolute inset-0 flex-row items-center justify-center gap-2">
          <Image src={logo} class="size-7" accessibilityLabel="nshde logo" />
          <Text class="text-sm font-semibold tracking-tight text-foreground">nshde</Text>
        </View>
        <View class="ml-auto flex-row items-center gap-2">
          <If when={wide()}>
            <Text class="text-[11px] text-muted-foreground">
              Storage: <Text class="text-foreground">{backend()}</Text>
            </Text>
          </If>
          <Button
            onPress={() => settingsOpen.set(true)}
            accessibilityLabel="Storage settings"
            class="size-8 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
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
          <Text class="text-center text-xs text-warn">Unsaved changes — Save icon in editor or ⌘/Ctrl+S</Text>
        </View>
      </If>

      <View class="flex-1 p-3">
        <View class="flex-1 overflow-hidden rounded-xl border border-border bg-card p-1">
          <View class="flex-1 overflow-hidden rounded-lg border border-line bg-inset">
            <DockArea
              ref={area}
              class="flex-1"
              layout={layout()}
              onLayoutChange={({ layout: next }) => {
                layout.set(next);
                syncActiveEditorFromLayout(next);
              }}
              panels={panelRegistry(layout())}
              groupClass="flex-1 bg-inset"
              tabBarClass="flex-row gap-1 border-b border-line"
              tabClass="group"
              contentClass="flex-1"
              handleAccessibilityLabel="Resize panel"
              handleClass="basis-px bg-line"
              handleThumbClass={handleThumb}
              dockClass="bg-inset"
              dropIndicatorClass="rounded-lg border-2 border-brand bg-brand-tint"
              drawerClass="border-r border-border bg-card"
              sheetClass="rounded-t-2xl border-t border-border bg-card"
              backdropClass="bg-black/40"
              renderTab={(tab) => (
                <View testID={`tab-${tab.panel}`} class="h-9 flex-row items-center gap-1 px-3">
                  <Text
                    style={{ numberOfLines: 1 }}
                    class={`max-w-44 text-[13px] font-medium ${tab.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                  >
                    {tabTitle(tab.panel)}
                  </Text>
                  <If when={tab.closable && (pointer || tab.active)}>
                    <Button
                      onPress={() => area.closePanel(tab.panel)}
                      accessibilityLabel={`Close ${tabTitle(tab.panel)}`}
                      class={
                        pointer
                          ? "absolute right-1 top-2 size-5 items-center justify-center rounded-md bg-inset opacity-0 transition-opacity group-hover:opacity-100 hover:bg-raised"
                          : "-mr-1.5 size-5 items-center justify-center rounded-md active:opacity-70"
                      }
                    >
                      <IconClose />
                    </Button>
                  </If>
                  <If when={tab.active}>
                    <View
                      style={{ pointerEvents: "none" }}
                      class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand"
                    />
                  </If>
                </View>
              )}
              renderDock={(dock) => (
                <View class="h-7 flex-row items-center justify-end border-b border-line px-1">
                  <Button
                    onPress={() => area.toggleDock(dock.placement)}
                    accessibilityLabel={`Hide ${dockRegionTitle(dock.placement)}`}
                    class="size-7 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
                  >
                    <IconPanelHide />
                  </Button>
                </View>
              )}
              renderDragPreview={(tab) => (
                <View class="rounded-lg border border-border bg-raised px-3 py-1.5">
                  <Text class="text-[13px] font-medium text-foreground">{tabTitle(tab.panel)}</Text>
                </View>
              )}
              renderPanel={(panel) => {
                if (panel.id === "tree") return <ObjectTreePanelView />;
                if (panel.id === "runtime") return <RuntimePanelView />;
                if (panel.id === "agents") return <AgentPanelView />;
                const path = pathFromFilePanel(panel.id);
                if (path) return <EditorPanelView path={path} />;
                if (isFilePanel(panel.id)) return null;
                return (
                  <View class="flex-1 items-center justify-center">
                    <Text class="text-sm text-muted-foreground">Unknown panel</Text>
                  </View>
                );
              }}
              renderEmpty={() => (
                <View class="flex-1 items-center justify-center gap-1">
                  <Text class="text-sm font-semibold text-foreground">No editor tabs open</Text>
                  <Text class="text-xs text-muted-foreground">Pick a file from the object tree</Text>
                </View>
              )}
            />
          </View>
        </View>
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
