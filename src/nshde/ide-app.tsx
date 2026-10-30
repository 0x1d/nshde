import { Image, keymap, signal, Text, untracked, View, windowSize } from "nsh";
import { Button, DockArea, type DockAreaLayout, type DockAreaRef } from "nsh/base";
import logo from "../../assets/logo.svg";
import { AgentPanelView } from "./agent-panel";
import {
  agentPanelId,
  dockHasPanel,
  pathFromFilePanel,
  sessionIdFromPanel,
  SESSIONS_PANEL,
  SETTINGS_PANEL,
  tabTitle,
} from "./dock-layout";
import { EditorPanelView } from "./editor-panel";
import { IconClose, IconLayout, TipIconButton, TipTextButton } from "./icons";
import { ObjectTreePanelView } from "./object-tree-panel";
import { RuntimePanelView } from "./runtime-panel";
import { SessionPanelView } from "./session-panel";
import { SettingsPanelView } from "./settings-panel";
import {
  backend,
  bootError,
  bootIdeData,
  dirty,
  dockLayout,
  dockPanels,
  isFilePanel,
  isPathDirty,
  openSettingsInEditor,
  saveFile,
  selectedPath,
  sessions,
  syncActiveEditorFromLayout,
} from "./store";

/** Gallery resize thumb: quiet hairline, a pill while hovered, solid while dragged. */
const handleThumb =
  "h-11 w-[3px] rounded-full bg-muted-foreground opacity-0 scale-y-0 transition duration-150 ease-out group-hover:opacity-40 group-hover:scale-y-[0.45] group-active:opacity-90 group-active:scale-y-100";

const DOCKS: Record<string, string> = {
  left: "Agents",
  right: "Explorer",
  bottom: "Runtime",
};

type Edge = "left" | "right" | "bottom";

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

function LayoutToggle(props: { edge: Edge; label: string; on: boolean; onPress: (open: boolean) => void }) {
  return (
    <Button
      selected={props.on}
      accessibilityLabel={props.label}
      onPress={() => props.onPress(!props.on)}
      class="size-7 items-center justify-center rounded-md hover:bg-hover selected:bg-hover"
    >
      <IconLayout edge={props.edge} active={props.on} />
    </Button>
  );
}

/**
 * The icon column stays when its dock closes. DockArea will not draw an open
 * dock shorter than 100 points, so the collapsed pane is this rail.
 */
function ActivityRail(props: { edge: "left" | "right"; open: boolean; onPress: (open: boolean) => void }) {
  const label = props.edge === "left" ? "Agents" : "Explorer";
  return (
    <View
      accessibilityLabel={props.edge === "left" ? "Primary side bar" : "Secondary side bar"}
      class={`w-12 items-center bg-inset py-1.5 ${props.edge === "left" ? "border-r border-line" : "border-l border-line"}`}
    >
      <Button
        selected={props.open}
        accessibilityLabel={label}
        onPress={() => props.onPress(!props.open)}
        class="relative size-10 items-center justify-center rounded-md hover:bg-hover selected:bg-accent"
      >
        <IconLayout edge={props.edge} active={props.open} />
        <If when={props.open}>
          <View
            class={`absolute bottom-2 top-2 w-0.5 rounded-full bg-brand ${props.edge === "right" ? "right-0" : "left-0"}`}
          />
        </If>
      </Button>
    </View>
  );
}

function RuntimeRail(props: { onPress: () => void }) {
  return (
    <View class="h-9 flex-row items-center border-t border-line bg-inset px-1">
      <Button
        onPress={props.onPress}
        accessibilityLabel="Expand runtime"
        class="h-8 flex-row items-center gap-2 rounded-md px-2.5 hover:bg-hover"
      >
        <IconLayout edge="bottom" active />
        <Text class="text-[13px] font-medium text-foreground">Runtime</Text>
      </Button>
    </View>
  );
}

function StatusBar() {
  const path = selectedPath();
  const name = path?.split("/").pop();
  return (
    <View class="h-[22px] flex-row items-center gap-2.5 border-t border-line bg-inset px-2.5">
      <Text class="text-[11px] text-muted-foreground">nshde</Text>
      <View class="h-3 w-px bg-line" />
      <Text class="text-[11px] text-faint">{backend()}</Text>
      <View class="flex-1" />
      <If when={dirty()}>
        <Text class="text-[11px] text-warn">Unsaved</Text>
      </If>
      <If when={name}>
        <Text class="text-[11px] text-faint">{name}</Text>
      </If>
    </View>
  );
}

export function IdeApp() {
  bootIdeData();
  const layout = dockLayout;
  const width = () => windowSize().width;
  const roomy = () => width() >= 840;
  const showStorage = () => width() >= 1100;
  const initiallyWide = untracked(windowSize).width >= 600;
  const shown = signal<Record<Edge, boolean>>({
    left: initiallyWide,
    right: initiallyWide,
    bottom: initiallyWide,
  });
  let area!: DockAreaRef;
  // A renamed session has to redraw the tab. `titleFor` reads `sessions` too,
  // in case DockArea calls an earlier `renderTab` after the list has changed.
  sessions();

  keymap.bind("mod+s", () => {
    void saveFile();
  });
  keymap.bind("mod+b", () => area.toggleDock("left"));
  keymap.bind("mod+j", () => area.toggleDock("bottom"));

  const titleFor = (panel: string) => {
    const sessionId = sessionIdFromPanel(panel);
    if (!sessionId) return tabTitle(panel);
    return sessions().find((session) => session.id === sessionId)?.title ?? "New agent";
  };
  const runtimeRail = () => !shown().bottom && dockHasPanel(layout(), "bottom", "runtime");
  const setEdge = (edge: Edge, open: boolean) => area.setDockOpen(edge, open);

  return (
    <View class="flex-1 bg-background">
      <View accessibilityLabel="Workspace" class="h-9 flex-row items-center gap-1 border-b border-line bg-inset px-2">
        <Image src={logo} class="size-5" accessibilityLabel="nshde logo" />
        <Text class="px-1 text-[13px] font-semibold tracking-tight text-foreground">nshde</Text>
        <View class="flex-1" />
        <If when={showStorage()}>
          <Text class="mr-2 text-[11px] text-faint">Storage {backend()}</Text>
        </If>
        <View accessibilityLabel="Layout" class="flex-row items-center">
          <LayoutToggle edge="left" label="Toggle agents" on={shown().left} onPress={(open) => setEdge("left", open)} />
          <LayoutToggle edge="bottom" label="Toggle runtime" on={shown().bottom} onPress={(open) => setEdge("bottom", open)} />
          <LayoutToggle edge="right" label="Toggle explorer" on={shown().right} onPress={(open) => setEdge("right", open)} />
        </View>
        <View class="mx-1 h-4 w-px bg-line" />
        <TipTextButton label="Settings" onPress={() => openSettingsInEditor()}>
          <Text class="text-sm text-muted-foreground">⚙</Text>
        </TipTextButton>
      </View>

      <If when={bootError()}>
        {(err) => (
          <View class="border-b border-destructive/40 bg-destructive/10 px-4 py-2">
            <Text class="text-center text-xs text-destructive">{err()}</Text>
          </View>
        )}
      </If>

      <View class="min-h-0 flex-1 flex-row">
        <If when={roomy()}>
          <ActivityRail edge="left" open={shown().left} onPress={(open) => setEdge("left", open)} />
        </If>
        <View class="min-h-0 min-w-0 flex-1 flex-col">
          <DockArea
            ref={area}
            class="min-h-0 min-w-0 flex-1 bg-background"
            layout={layout()}
            onLayoutChange={(payload) => {
              const parsed = parseLayoutChange(payload);
              if (!parsed?.center) return;
              layout.set(parsed);
              syncActiveEditorFromLayout(parsed);
            }}
            onDockOpenChange={(placement, open) => {
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
            groupClass="min-h-0 min-w-0 flex-1 bg-background"
            tabBarClass="flex-row items-end border-b border-line bg-inset"
            tabClass="group"
            contentClass="flex-1 overflow-hidden"
            handleAccessibilityLabel="Resize panel"
            handleClass="basis-px bg-line"
            handleThumbClass={handleThumb}
            dockClass="bg-inset"
            dropIndicatorClass="rounded-md border-2 border-brand bg-brand-tint"
            drawerClass="border-r border-border bg-inset"
            sheetClass="rounded-t-2xl border-t border-border bg-inset"
            backdropClass="bg-black/40"
            renderDock={(dock) => (
              <View class="h-8 flex-row items-center border-b border-line bg-inset pl-3 pr-1">
                <Text class="flex-1 text-[11px] font-semibold tracking-wide text-faint">
                  {DOCKS[dock.placement] ?? dock.placement}
                </Text>
                <TipIconButton
                  label={`Collapse ${DOCKS[dock.placement] ?? dock.placement}`}
                  onPress={() => area.toggleDock(dock.placement)}
                >
                  <IconLayout edge={dock.placement} active />
                </TipIconButton>
              </View>
            )}
            renderTab={(tab) => {
              const path = pathFromFilePanel(tab.panel);
              const unsaved = path ? isPathDirty(path) : false;
              const active = tab.active;
              return (
                <View
                  class={`h-[34px] flex-row items-center gap-1.5 border-t-2 px-3 ${
                    active
                      ? unsaved
                        ? "border-warn bg-background"
                        : "border-foreground bg-background"
                      : "border-transparent"
                  }`}
                >
                  <If when={unsaved}>
                    <View class="size-1.5 rounded-full bg-warn" />
                  </If>
                  <Text
                    numberOfLines={1}
                    class={`max-w-40 text-[13px] ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                  >
                    {titleFor(tab.panel)}
                  </Text>
                  <If when={tab.closable && active}>
                    <Button
                      onPress={() => area.closePanel(tab.panel)}
                      accessibilityLabel={`Close ${titleFor(tab.panel)}`}
                      class="size-5 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
                    >
                      <IconClose />
                    </Button>
                  </If>
                </View>
              );
            }}
            renderDragPreview={(tab) => (
              <View class="rounded-md border border-border bg-raised px-3 py-1.5">
                <Text class="text-[13px] font-medium text-foreground">{titleFor(tab.panel)}</Text>
              </View>
            )}
            renderPanel={(panel) => {
              if (panel.id === "tree") return <ObjectTreePanelView />;
              if (panel.id === SESSIONS_PANEL) return <SessionPanelView />;
              const sessionId = sessionIdFromPanel(panel.id);
              if (sessionId) return <AgentPanelView sessionId={sessionId} />;
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
                <Text class="text-xs text-muted-foreground">Pick a file from the explorer</Text>
              </View>
            )}
          />
          <If when={runtimeRail()}>
            <RuntimeRail onPress={() => area.setDockOpen("bottom", true)} />
          </If>
        </View>
        <If when={roomy()}>
          <ActivityRail edge="right" open={shown().right} onPress={(open) => setEdge("right", open)} />
        </If>
      </View>
      <StatusBar />
    </View>
  );
}
