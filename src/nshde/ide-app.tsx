import type { JSX } from "nsh";
import { Image, Text, untracked, View } from "nsh";
import { keymap } from "nsh";
import { platform, windowSize } from "nsh";
import { Button, DockArea, type DockAreaLayout, type DockAreaRef } from "nsh/base";
import logo from "../../assets/logo.svg";
import { AgentPanelView } from "./agent-panel";
import { isDockCollapsed, normalizeDockLayout, pathFromFilePanel, SETTINGS_PANEL, tabTitle, toggleDockCollapsed } from "./dock-layout";
import { EditorPanelView } from "./editor-panel";
import {
  IconClose,
  IconCollapseHorizontal,
  IconCollapseVertical,
  IconObjectTree3D,
  IconSidePanelRight,
  TipIconButton,
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
  dockPanels,
  isFilePanel,
  isPathDirty,
  openSettingsInEditor,
  saveFile,
  syncActiveEditorFromLayout,
} from "./store";

const handleThumb =
  "rounded-full bg-border opacity-0 transition-opacity hover:opacity-100 data-[dragging=true]:opacity-100";

const DOCK_CHROME = new Set(["tree", "agents", "runtime"]);

function DockHeader(props: {
  placement: "left" | "right" | "bottom";
  collapsed: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
  children: JSX.Element;
}) {
  return (
    <View class="h-7 w-full flex-row items-center justify-between border-b border-line px-1">
      <View class="flex-row items-center gap-1">{props.children}</View>
      <TipIconButton label={props.collapsed ? props.expandLabel : props.collapseLabel} onPress={props.onToggle}>
        <If
          when={props.placement === "bottom"}
          else={<IconCollapseHorizontal expand={props.collapsed} side={props.placement} />}
        >
          <IconCollapseVertical expand={props.collapsed} />
        </If>
      </TipIconButton>
    </View>
  );
}

function parseLayoutChange(payload: unknown): DockAreaLayout | null {
  if (payload && typeof payload === "object" && "center" in payload) {
    return payload as DockAreaLayout;
  }
  if (payload && typeof payload === "object" && "layout" in payload) {
    return (payload as { layout: DockAreaLayout }).layout;
  }
  return null;
}

/** DockArea mounts `renderPanel` once per panel; collapse must react inside the panel. */
function TreeDockPanel() {
  const collapsed = () => isDockCollapsed(dockLayout(), "left");
  const toggle = () =>
    dockLayout.set(toggleDockCollapsed(dockLayout(), "left", !collapsed()));
  return (
    <If when={collapsed()} else={<ObjectTreePanelView />}>
      <View class="flex-1 items-center overflow-hidden py-1">
        <TipTextButton label="Expand object tree" onPress={toggle}>
          <IconObjectTree3D />
        </TipTextButton>
      </View>
    </If>
  );
}

function AgentsDockPanel() {
  const collapsed = () => isDockCollapsed(dockLayout(), "right");
  const toggle = () =>
    dockLayout.set(toggleDockCollapsed(dockLayout(), "right", !collapsed()));
  return (
    <If when={collapsed()} else={<AgentPanelView />}>
      <View class="flex-1 items-center overflow-hidden py-1">
        <TipTextButton label="Expand agents" onPress={toggle}>
          <IconSidePanelRight />
        </TipTextButton>
      </View>
    </If>
  );
}

function RuntimeDockPanel() {
  const collapsed = () => isDockCollapsed(dockLayout(), "bottom");
  const toggle = () =>
    dockLayout.set(toggleDockCollapsed(dockLayout(), "bottom", !collapsed()));
  return (
    <If when={collapsed()} else={<RuntimePanelView />}>
      <View class="h-full items-center justify-center overflow-hidden">
        <TipTextButton label="Expand runtime preview" onPress={toggle}>
          <Text class="text-[10px] text-muted-foreground">Runtime</Text>
        </TipTextButton>
      </View>
    </If>
  );
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
  const collapseBottom = () =>
    layout.set(toggleDockCollapsed(layout(), "bottom", !isDockCollapsed(layout(), "bottom")));

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
              onLayoutChange={(payload) => {
                const parsed = parseLayoutChange(payload);
                if (!parsed?.center) return;
                const next = normalizeDockLayout(parsed);
                layout.set(next);
                syncActiveEditorFromLayout(next);
              }}
              panels={dockPanels()}
              groupClass="flex-1 bg-inset"
              tabBarClass="flex-row w-full items-stretch border-b border-line"
              tabClass="group min-w-0"
              contentClass="flex-1 overflow-hidden"
              handleAccessibilityLabel="Resize panel"
              handleClass="basis-px bg-line"
              handleThumbClass={handleThumb}
              dockClass="bg-inset"
              dropIndicatorClass="rounded-lg border-2 border-brand bg-brand-tint"
              drawerClass="border-r border-border bg-card"
              sheetClass="rounded-t-2xl border-t border-border bg-card"
              backdropClass="bg-black/40"
              renderDock={(dock) => {
                if (dock.placement === "left") {
                  if (isDockCollapsed(layout(), "left")) {
                    return (
                      <View class="h-7 w-full items-center justify-center border-b border-line">
                        <TipTextButton label="Expand object tree" onPress={collapseLeft}>
                          <IconObjectTree3D />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return (
                    <DockHeader
                      placement="left"
                      collapsed={false}
                      onToggle={collapseLeft}
                      expandLabel="Expand object tree"
                      collapseLabel="Collapse object tree"
                    >
                      <IconObjectTree3D />
                    </DockHeader>
                  );
                }
                if (dock.placement === "right") {
                  if (isDockCollapsed(layout(), "right")) {
                    return (
                      <View class="h-7 w-full items-center justify-center border-b border-line">
                        <TipTextButton label="Expand agents" onPress={collapseRight}>
                          <IconSidePanelRight />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return (
                    <DockHeader
                      placement="right"
                      collapsed={false}
                      onToggle={collapseRight}
                      expandLabel="Expand agents"
                      collapseLabel="Collapse agents"
                    >
                      <Text class="text-[13px] font-medium text-foreground">Agents</Text>
                    </DockHeader>
                  );
                }
                if (dock.placement === "bottom") {
                  if (isDockCollapsed(layout(), "bottom")) {
                    return (
                      <View class="h-7 w-full flex-row items-center justify-end border-b border-line px-1">
                        <TipTextButton label="Expand runtime preview" onPress={collapseBottom}>
                          <IconCollapseVertical expand />
                        </TipTextButton>
                      </View>
                    );
                  }
                  return (
                    <DockHeader
                      placement="bottom"
                      collapsed={false}
                      onToggle={collapseBottom}
                      expandLabel="Expand runtime preview"
                      collapseLabel="Collapse runtime preview"
                    >
                      <Text class="text-[13px] font-medium text-foreground">Runtime</Text>
                    </DockHeader>
                  );
                }
                return null;
              }}
              renderTab={(tab) => {
                if (DOCK_CHROME.has(tab.panel)) {
                  return <View class="h-0 w-0 overflow-hidden opacity-0" accessibilityLabel={tabTitle(tab.panel)} />;
                }

                const path = pathFromFilePanel(tab.panel);
                const unsaved = path ? isPathDirty(path) : false;

                return (
                  <View class="relative h-7 flex-row items-center gap-1 px-2">
                    <If when={tab.panel === SETTINGS_PANEL}>
                      <Text class="text-[13px] font-medium text-foreground">Settings</Text>
                    </If>
                    <If when={path}>
                      <Text
                        style={{ numberOfLines: 1 }}
                        class={`max-w-44 text-[13px] font-medium ${unsaved ? "text-warn" : tab.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      >
                        {tabTitle(tab.panel)}
                      </Text>
                    </If>
                    <If when={tab.closable && (pointer || tab.active) && path}>
                      <Button
                        onPress={() => area.closePanel(tab.panel)}
                        accessibilityLabel={`Close ${tabTitle(tab.panel)}`}
                        class="size-5 items-center justify-center rounded-md active:opacity-70"
                      >
                        <IconClose />
                      </Button>
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
                if (panel.id === "tree") return <TreeDockPanel />;
                if (panel.id === "agents") return <AgentsDockPanel />;
                if (panel.id === "runtime") return <RuntimeDockPanel />;
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
