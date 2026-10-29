import { Image, Text, untracked, View } from "nsh";
import { keymap } from "nsh";
import { platform, windowSize } from "nsh";
import { Button, DockArea, type DockAreaRef, Tooltip } from "nsh/base";
import logo from "../../assets/logo.svg";
import { AgentPanelView } from "./agent-panel";
import {
  isDockCollapsed,
  panelRegistry,
  pathFromFilePanel,
  SETTINGS_PANEL,
  tabTitle,
  toggleDockCollapsed,
} from "./dock-layout";
import { EditorPanelView } from "./editor-panel";
import {
  IconAgents,
  IconClose,
  IconCollapse,
  IconExpand,
  IconObjectTree,
  IconRuntime,
  TipTextButton,
} from "./icons";
import { ObjectTreePanelView } from "./object-tree-panel";
import { RuntimePanelView } from "./runtime-panel";
import { SettingsPanelView } from "./settings-panel";
import {
  backend,
  bootError,
  bootIdeData,
  dockLayout,
  isFilePanel,
  isPathDirty,
  openSettingsInEditor,
  saveFile,
  syncActiveEditorFromLayout,
} from "./store";

const handleThumb =
  "rounded-full bg-border opacity-0 transition-opacity hover:opacity-100 data-[dragging=true]:opacity-100";

function runtimeStripCollapsed(layout: ReturnType<typeof dockLayout>): boolean {
  const center = layout().center;
  if (center.type !== "split" || center.axis !== "vertical") return false;
  const h = center.sizes?.[1];
  return h != null && h <= 40;
}

function toggleRuntimeStrip(collapsed: boolean) {
  const layout = dockLayout();
  const center = layout.center;
  if (center.type !== "split" || center.axis !== "vertical") return;
  dockLayout.set({
    ...layout,
    center: { ...center, sizes: [null, collapsed ? 36 : 220] },
  });
}

export function IdeApp() {
  bootIdeData();
  const layout = dockLayout;
  const wide = () => untracked(windowSize).width >= 900;
  const pointer = platform.desktop;
  let area!: DockAreaRef;

  keymap.bind("mod+s", () => {
    void saveFile();
  });

  const collapseLeft = () => layout.set(toggleDockCollapsed(layout(), "left", !isDockCollapsed(layout(), "left")));
  const collapseRight = () => layout.set(toggleDockCollapsed(layout(), "right", !isDockCollapsed(layout(), "right")));

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
              tabBarClass="flex-row items-center gap-1 border-b border-line"
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
              renderTab={(tab) => {
                const path = pathFromFilePanel(tab.panel);
                const unsaved = path ? isPathDirty(path) : false;
                const leftCollapsed = isDockCollapsed(layout(), "left");
                const rightCollapsed = isDockCollapsed(layout(), "right");
                const runtimeCollapsed = runtimeStripCollapsed(layout);

                return (
                  <View class="h-7 min-w-0 flex-1 flex-row items-center gap-1 px-2">
                    <If when={tab.panel === "tree"}>
                      <IconObjectTree />
                    </If>
                    <If when={tab.panel === "agents"}>
                      <IconAgents />
                    </If>
                    <If when={tab.panel === "runtime"}>
                      <IconRuntime />
                    </If>
                    <If when={tab.panel === SETTINGS_PANEL}>
                      <Text class="text-[13px] font-medium text-foreground">Settings</Text>
                    </If>
                    <If when={path}>
                      <Text
                        style={{ numberOfLines: 1 }}
                        class={`max-w-40 text-[13px] font-medium ${unsaved ? "text-warn" : tab.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      >
                        {tabTitle(tab.panel)}
                      </Text>
                    </If>
                    <If when={tab.closable && (pointer || tab.active) && path}>
                      <Button
                        onPress={() => area.closePanel(tab.panel)}
                        accessibilityLabel={`Close ${tabTitle(tab.panel)}`}
                        class="-mr-1 size-5 items-center justify-center rounded-md active:opacity-70"
                      >
                        <IconClose />
                      </Button>
                    </If>
                    <View class="min-w-0 flex-1" />
                    <If when={tab.panel === "tree" && tab.active}>
                      <View tooltip={<TooltipTip label={leftCollapsed ? "Expand object tree" : "Collapse object tree"} />}>
                        <Button
                          onPress={leftCollapsed ? collapseLeft : collapseLeft}
                          accessibilityLabel={leftCollapsed ? "Expand object tree" : "Collapse object tree"}
                          class="size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
                        >
                          {leftCollapsed ? <IconExpand /> : <IconCollapse />}
                        </Button>
                      </View>
                    </If>
                    <If when={tab.panel === "agents" && tab.active}>
                      <View tooltip={<TooltipTip label={rightCollapsed ? "Expand agents" : "Collapse agents"} />}>
                        <Button
                          onPress={collapseRight}
                          accessibilityLabel={rightCollapsed ? "Expand agents" : "Collapse agents"}
                          class="size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
                        >
                          {rightCollapsed ? <IconExpand /> : <IconCollapse />}
                        </Button>
                      </View>
                    </If>
                    <If when={tab.panel === "runtime" && tab.active}>
                      <View tooltip={<TooltipTip label={runtimeCollapsed ? "Expand runtime" : "Collapse runtime"} />}>
                        <Button
                          onPress={() => toggleRuntimeStrip(!runtimeCollapsed)}
                          accessibilityLabel={runtimeCollapsed ? "Expand runtime" : "Collapse runtime"}
                          class="size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
                        >
                          {runtimeCollapsed ? <IconExpand /> : <IconCollapse />}
                        </Button>
                      </View>
                    </If>
                    <If when={tab.active}>
                      <View
                        style={{ pointerEvents: "none" }}
                        class={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${unsaved ? "bg-warn" : "bg-brand"}`}
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
                if (panel.id === "tree") {
                  if (isDockCollapsed(layout(), "left")) {
                    return (
                      <View class="flex-1 items-center gap-2 py-2">
                        <TipTextButton label="Object tree" onPress={collapseLeft}>
                          <IconObjectTree />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return <ObjectTreePanelView />;
                }
                if (panel.id === "agents") {
                  if (isDockCollapsed(layout(), "right")) {
                    return (
                      <View class="flex-1 items-center gap-2 py-2">
                        <TipTextButton label="Agents" onPress={collapseRight}>
                          <IconAgents />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return <AgentPanelView />;
                }
                if (panel.id === "runtime") {
                  if (runtimeStripCollapsed(layout)) {
                    return (
                      <View class="flex-1 items-center justify-center">
                        <TipTextButton label="Runtime preview" onPress={() => toggleRuntimeStrip(false)}>
                          <IconRuntime />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return <RuntimePanelView />;
                }
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
          </View>
        </View>
      </View>
    </View>
  );
}

function TooltipTip(props: { label: string }) {
  return (
    <Tooltip delay={400}>
      <View class="rounded-md border border-border bg-popover px-2 py-1">
        <Text class="text-[11px] text-popover-foreground">{props.label}</Text>
      </View>
    </Tooltip>
  );
}
