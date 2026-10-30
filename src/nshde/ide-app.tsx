import { signal, Text, untracked, View } from "nsh";
import { Image } from "nsh";
import { keymap, platform, windowSize } from "nsh";
import { Button, DockArea, type DockAreaLayout, type DockAreaRef } from "nsh/base";
import logo from "../../assets/logo.svg";
import { AgentPanelView } from "./agent-panel";
import { dockHasPanel, pathFromFilePanel, SETTINGS_PANEL, TAB_RAIL, tabTitle } from "./dock-layout";
import { EditorPanelView } from "./editor-panel";
import { IconClose, IconSidePanel, TipIconButton, TipTextButton } from "./icons";
import { ObjectTreePanelView } from "./object-tree-panel";
import { RuntimePanelView } from "./runtime-panel";
import { SettingsPanelView } from "./settings-panel";
import {
  backend,
  bootError,
  bootIdeData,
  dockLayout,
  dockPanels,
  isFilePanel,
  isPathDirty,
  openSettingsInEditor,
  saveFile,
  syncActiveEditorFromLayout,
} from "./store";

/** Gallery resize thumb: quiet hairline, a pill while hovered, solid while dragged. */
const handleThumb =
  "h-11 w-[3px] rounded-full bg-muted-foreground opacity-0 scale-y-0 transition duration-150 ease-out group-hover:opacity-40 group-hover:scale-y-[0.45] group-active:opacity-90 group-active:scale-y-100";

const DOCKS: Record<string, string> = {
  left: "Object tree",
  right: "Agents",
  bottom: "Runtime",
};

function parseLayoutChange(payload: unknown): DockAreaLayout | null {
  if (payload && typeof payload === "object" && "center" in payload) {
    return payload as DockAreaLayout;
  }
  if (payload && typeof payload === "object" && "layout" in payload) {
    const layout = (payload as { layout: unknown }).layout;
    if (layout && typeof layout === "object" && "center" in layout) return layout as DockAreaLayout;
  }
  return null;
}

/** Title-bar control from the gallery dock demo: a raised button whose dot is lit while the dock shows. */
function DockToggle(props: { label: string; name: string; on: boolean; onPress: () => void }) {
  return (
    <Button
      onPress={props.onPress}
      selected={props.on}
      accessibilityLabel={props.label}
      class="h-8 flex-row items-center gap-2 rounded-lg border border-border bg-raised px-3 active:opacity-80"
    >
      <View class={`size-1.5 rounded-full ${props.on ? "bg-brand" : "bg-faint"}`} />
      <Text class="text-[13px] font-semibold text-foreground">{props.name}</Text>
    </Button>
  );
}

/**
 * The runtime dock closed. DockArea will not draw an open dock shorter than
 * 100 points, so the collapsed pane is this rail: one gallery tab, `h-9`.
 */
function RuntimeRail(props: { onPress: () => void }) {
  return (
    <View class="flex-row border-t border-line bg-inset" style={{ height: TAB_RAIL }}>
      <Button
        onPress={props.onPress}
        accessibilityLabel="Expand runtime preview"
        class="h-9 flex-row items-center px-3"
      >
        <Text class="text-[13px] font-medium text-foreground">Runtime</Text>
        <View pointerEvents="none" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand" />
      </Button>
    </View>
  );
}

export function IdeApp() {
  bootIdeData();
  const layout = dockLayout;
  const wide = () => untracked(windowSize).width >= 900;
  const pointer = platform.desktop;
  const initiallyWide = untracked(windowSize).width >= 600;
  const shown = signal<Record<"left" | "right" | "bottom", boolean>>({
    left: initiallyWide,
    right: initiallyWide,
    bottom: initiallyWide,
  });
  let area!: DockAreaRef;

  keymap.bind("mod+s", () => {
    void saveFile();
  });

  const runtimeRail = () => !shown().bottom && dockHasPanel(layout(), "bottom", "runtime");

  return (
    <View class="flex-1 bg-background">
      <View class="h-10 flex-row items-center border-b border-line px-3">
        <View class="flex-row items-center gap-2">
          <Image src={logo} class="size-6" accessibilityLabel="nshde logo" />
          <Text class="text-sm font-semibold tracking-tight text-foreground">nshde</Text>
        </View>
        <View class="ml-auto flex-row items-center gap-2">
          <If when={wide()}>
            <Text class="text-[11px] text-muted-foreground">
              Storage: <Text class="text-foreground">{backend()}</Text>
            </Text>
          </If>
          <DockToggle
            label="Toggle object tree"
            name="Tree"
            on={shown().left}
            onPress={() => area.toggleDock("left")}
          />
          <DockToggle
            label="Toggle agents"
            name="Agents"
            on={shown().right}
            onPress={() => area.toggleDock("right")}
          />
          <TipTextButton label="Settings" onPress={() => openSettingsInEditor()}>
            <Text class="text-sm text-muted-foreground">⚙</Text>
          </TipTextButton>
        </View>
      </View>

      <If when={bootError()}>
        {(err) => (
          <View class="border-b border-destructive/40 bg-destructive/10 px-4 py-2">
            <Text class="text-center text-xs text-destructive">{err()}</Text>
          </View>
        )}
      </If>

      <View class="flex-1 p-3">
        <View class="flex-1 overflow-hidden rounded-xl border border-border bg-card p-1">
          <View class="min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-inset">
            <DockArea
              ref={area}
              class="min-h-0 min-w-0 flex-1"
              layout={layout()}
              onLayoutChange={(payload) => {
                const parsed = parseLayoutChange(payload);
                if (!parsed?.center) return;
                layout.set(parsed);
                syncActiveEditorFromLayout(parsed);
              }}
              onDockOpenChange={(placement, open) => {
                // 0.3 reports (placement, open). Newer docs report one object.
                if (placement && typeof placement === "object") {
                  const event = placement as { placement?: string; open?: boolean };
                  const edge = event.placement;
                  if (edge === "left" || edge === "right" || edge === "bottom") {
                    shown.set({ ...shown(), [edge]: !!event.open });
                  }
                  return;
                }
                if (placement === "left" || placement === "right" || placement === "bottom") {
                  shown.set({ ...shown(), [placement]: !!open });
                }
              }}
              panels={dockPanels()}
              groupClass="flex-1 bg-inset"
              tabBarClass="flex-row gap-1 border-b border-line"
              tabClass="group"
              contentClass="flex-1 overflow-hidden"
              handleAccessibilityLabel="Resize panel"
              handleClass="basis-px bg-line"
              handleThumbClass={handleThumb}
              dockClass="bg-inset"
              dropIndicatorClass="rounded-lg border-2 border-brand bg-brand-tint"
              drawerClass="border-r border-border bg-card"
              sheetClass="rounded-t-2xl border-t border-border bg-card"
              backdropClass="bg-black/40"
              renderDock={(dock) => (
                <View class="h-8 flex-row items-center border-b border-line pl-3 pr-1">
                  <Text class="flex-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {DOCKS[dock.placement] ?? dock.placement}
                  </Text>
                  <TipIconButton
                    label={`Hide ${DOCKS[dock.placement] ?? dock.placement}`}
                    onPress={() => area.toggleDock(dock.placement)}
                  >
                    <IconSidePanel edge={dock.placement} />
                  </TipIconButton>
                </View>
              )}
              renderTab={(tab) => {
                const path = pathFromFilePanel(tab.panel);
                const unsaved = path ? isPathDirty(path) : false;
                return (
                  <View class="h-9 flex-row items-center gap-1 px-3">
                    <Text
                      numberOfLines={1}
                      class={`max-w-40 text-[13px] font-medium ${unsaved ? "text-warn" : tab.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
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
                        pointerEvents="none"
                        class={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${unsaved ? "bg-warn" : "bg-brand"}`}
                      />
                    </If>
                  </View>
                );
              }}
              renderDragPreview={(tab) => (
                <View class="rounded-lg border border-border bg-raised px-3 py-1.5">
                  <Text class="text-[13px] font-medium text-foreground">{tabTitle(tab.panel)}</Text>
                </View>
              )}
              renderPanel={(panel) => {
                if (panel.id === "tree") return <ObjectTreePanelView />;
                if (panel.id === "agents") return <AgentPanelView />;
                if (panel.id === "runtime") return <RuntimePanelView />;
                if (panel.id === SETTINGS_PANEL) return <SettingsPanelView />;
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
            <If when={runtimeRail()}>
              <RuntimeRail onPress={() => area.setDockOpen("bottom", true)} />
            </If>
          </View>
        </View>
      </View>
    </View>
  );
}
