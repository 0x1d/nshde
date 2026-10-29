import type { DockAreaLayout } from "nsh/base";

export const FILE_PREFIX = "file:";
export const SETTINGS_PANEL = "settings";

const DOCK_TITLES: Record<string, string> = {
  tree: "Object tree",
  runtime: "Runtime",
  agents: "Agents",
  [SETTINGS_PANEL]: "Settings",
};

export function filePanelId(path: string): string {
  return `${FILE_PREFIX}${path}`;
}

export function pathFromFilePanel(id: string): string | null {
  return id.startsWith(FILE_PREFIX) ? id.slice(FILE_PREFIX.length) : null;
}

export function tabTitle(panelId: string): string {
  const path = pathFromFilePanel(panelId);
  if (path) return path.split("/").pop() ?? path;
  return DOCK_TITLES[panelId] ?? panelId;
}

export function dockRegionTitle(placement: string): string {
  if (placement === "left") return "Object tree";
  if (placement === "right") return "Agents";
  if (placement === "bottom") return "Runtime";
  return placement;
}

export function initialIdeLayout(welcomePath: string): DockAreaLayout {
  return {
    center: {
      type: "split",
      axis: "vertical",
      children: [
        { type: "tabs", panels: [filePanelId(welcomePath)], activeIndex: 0 },
        { type: "tabs", panels: ["runtime"], activeIndex: 0 },
      ],
      sizes: [null, 220],
    },
    left: { layout: { type: "tabs", panels: ["tree"] }, size: 220, open: true },
    right: { layout: { type: "tabs", panels: ["agents"] }, size: 300, open: true },
  };
}

type TabGroup = Extract<DockAreaLayout["center"], { type: "tabs" }>;
type SplitNode = Extract<DockAreaLayout["center"], { type: "split" }>;

const DOCK_DEFAULT_SIZE: Record<string, number> = { left: 220, right: 300, bottom: 220 };
const DOCK_COLLAPSED_SIZE = 44;

export function toggleDockCollapsed(
  layout: DockAreaLayout,
  placement: "left" | "right" | "bottom",
  collapsed: boolean,
): DockAreaLayout {
  const region = layout[placement];
  if (!region) return layout;
  return {
    ...layout,
    [placement]: {
      ...region,
      open: true,
      size: collapsed ? DOCK_COLLAPSED_SIZE : (region.size ?? DOCK_DEFAULT_SIZE[placement]),
    },
  };
}

export function isDockCollapsed(layout: DockAreaLayout, placement: "left" | "right" | "bottom"): boolean {
  const region = layout[placement];
  if (!region || region.open === false) return true;
  return (region.size ?? 0) <= DOCK_COLLAPSED_SIZE + 8;
}

function editorTabGroup(center: DockAreaLayout["center"]): TabGroup | null {
  if (center.type === "split" && center.axis === "vertical") {
    const first = center.children[0];
    if (first?.type === "tabs") return first;
  }
  if (center.type === "split") {
    for (const child of center.children) {
      const found = editorTabGroup(child as DockAreaLayout["center"]);
      if (found) return found;
    }
  }
  return null;
}

export function collectCenterPanelIds(layout: DockAreaLayout): string[] {
  const ids = new Set<string>();
  const walk = (node: DockAreaLayout["center"]) => {
    if (node.type === "tabs") {
      for (const id of node.panels) ids.add(id);
      return;
    }
    if (node.type === "split") {
      for (const child of node.children) walk(child as DockAreaLayout["center"]);
    }
  };
  walk(layout.center);
  return [...ids];
}

export function collectFilePanelIds(layout: DockAreaLayout): string[] {
  return collectCenterPanelIds(layout).filter((id) => pathFromFilePanel(id));
}

export function addCenterTab(layout: DockAreaLayout, panelId: string): DockAreaLayout {
  const center = layout.center;
  if (center.type !== "split" || center.axis !== "vertical") return layout;
  const editorGroup = center.children[0];
  if (editorGroup.type !== "tabs") return layout;
  const panels = editorGroup.panels.includes(panelId) ? editorGroup.panels : [...editorGroup.panels, panelId];
  const activeIndex = panels.indexOf(panelId);
  const nextEditor: TabGroup = { ...editorGroup, panels, activeIndex };
  return {
    ...layout,
    center: { ...center, children: [nextEditor, center.children[1]] as SplitNode["children"] },
  };
}

export function addFileTab(layout: DockAreaLayout, path: string): DockAreaLayout {
  return addCenterTab(layout, filePanelId(path));
}

export function openSettingsTab(layout: DockAreaLayout): DockAreaLayout {
  return addCenterTab(layout, SETTINGS_PANEL);
}

export function panelRegistry(layout: DockAreaLayout): { id: string; closable: boolean }[] {
  const ids = new Set<string>(["tree", "runtime", "agents"]);
  for (const id of collectCenterPanelIds(layout)) ids.add(id);
  return [...ids].map((id) => ({
    id,
    closable:
      id === SETTINGS_PANEL ||
      id === "runtime" ||
      pathFromFilePanel(id) !== null,
  }));
}

export function activeCenterPanel(layout: DockAreaLayout): string | null {
  const group = editorTabGroup(layout.center);
  if (!group) return null;
  return group.panels[group.activeIndex ?? 0] ?? null;
}

export function activeFilePath(layout: DockAreaLayout): string | null {
  const panel = activeCenterPanel(layout);
  if (!panel) return null;
  return pathFromFilePanel(panel);
}
