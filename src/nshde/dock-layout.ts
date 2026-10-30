import type { DockAreaLayout } from "nsh/base";

export const FILE_PREFIX = "file:";
export const SETTINGS_PANEL = "settings";

const DOCK_TITLES: Record<string, string> = {
  tree: "Object tree",
  runtime: "Runtime",
  agents: "Agents",
  [SETTINGS_PANEL]: "Settings",
};

/** Collapsed rail width (NSH `DockArea` enforces at least 100pt on dock edges). */
export const DOCK_RAIL_SIZE = 100;

/** Sizes at or below this show icon-only rail content, not the full panel. */
export const DOCK_COLLAPSED_THRESHOLD = DOCK_RAIL_SIZE + 8;

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

export function initialIdeLayout(welcomePath: string): DockAreaLayout {
  return {
    center: { type: "tabs", panels: [filePanelId(welcomePath)], activeIndex: 0 },
    left: { layout: { type: "tabs", panels: ["tree"] }, size: 220, open: true },
    right: { layout: { type: "tabs", panels: ["agents"] }, size: 300, open: true },
    bottom: { layout: { type: "tabs", panels: ["runtime"] }, size: 200, open: true },
  };
}

type TabGroup = Extract<DockAreaLayout["center"], { type: "tabs" }>;

const DOCK_DEFAULT_SIZE: Record<string, number> = { left: 220, right: 300, bottom: 200 };
const expandedDockSizes: Record<string, number> = { ...DOCK_DEFAULT_SIZE };

export function toggleDockCollapsed(
  layout: DockAreaLayout,
  placement: "left" | "right" | "bottom",
  collapsed: boolean,
): DockAreaLayout {
  const region = layout[placement];
  if (!region) return layout;
  const current = region.size ?? DOCK_DEFAULT_SIZE[placement];
  if (!collapsed && current > DOCK_COLLAPSED_THRESHOLD) {
    expandedDockSizes[placement] = current;
  }
  const size = collapsed ? DOCK_RAIL_SIZE : expandedDockSizes[placement] ?? DOCK_DEFAULT_SIZE[placement];
  return {
    ...layout,
    [placement]: { ...region, open: true, size },
  };
}

export function isDockCollapsed(layout: DockAreaLayout | undefined, placement: "left" | "right" | "bottom"): boolean {
  const region = layout?.[placement];
  if (!region || region.open === false) return true;
  return (region.size ?? 0) <= DOCK_COLLAPSED_THRESHOLD;
}

/** Keep programmatic collapse and resize-handle snaps aligned with NSH minimum dock size. */
export function normalizeDockLayout(layout: DockAreaLayout): DockAreaLayout {
  let next = layout;
  for (const placement of ["left", "right", "bottom"] as const) {
    const region = next[placement];
    if (!region || region.open === false) continue;
    const size = region.size ?? DOCK_DEFAULT_SIZE[placement];
    if (size <= DOCK_COLLAPSED_THRESHOLD) {
      next = {
        ...next,
        [placement]: { ...region, open: true, size: DOCK_RAIL_SIZE },
      };
    }
  }
  return next;
}

function centerEditorTabs(center: DockAreaLayout["center"]): TabGroup | null {
  if (center.type === "tabs") return center;
  if (center.type === "split" && center.axis === "vertical") {
    const first = center.children[0];
    if (first?.type === "tabs") return first;
  }
  return null;
}

export function collectCenterPanelIds(layout: DockAreaLayout | undefined): string[] {
  if (!layout?.center) return [];
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

export function addCenterTab(layout: DockAreaLayout, panelId: string): DockAreaLayout {
  const center = layout.center;
  if (center.type === "tabs") {
    const panels = center.panels.includes(panelId) ? center.panels : [...center.panels, panelId];
    const activeIndex = panels.indexOf(panelId);
    return { ...layout, center: { ...center, panels, activeIndex } };
  }
  if (center.type === "split" && center.axis === "vertical") {
    const editorGroup = center.children[0];
    if (editorGroup.type !== "tabs") return layout;
    const panels = editorGroup.panels.includes(panelId) ? editorGroup.panels : [...editorGroup.panels, panelId];
    const activeIndex = panels.indexOf(panelId);
    const nextEditor: TabGroup = { ...editorGroup, panels, activeIndex };
    return {
      ...layout,
      center: { ...center, children: [nextEditor, center.children[1]] as typeof center.children },
    };
  }
  return layout;
}

export function addFileTab(layout: DockAreaLayout, path: string): DockAreaLayout {
  return addCenterTab(layout, filePanelId(path));
}

export function openSettingsTab(layout: DockAreaLayout): DockAreaLayout {
  return addCenterTab(layout, SETTINGS_PANEL);
}

export function panelClosable(id: string): boolean {
  return id === SETTINGS_PANEL || id === "runtime" || pathFromFilePanel(id) !== null;
}

export function defaultDockPanels(welcomePath: string): { id: string; closable: boolean }[] {
  return [
    { id: "tree", closable: false },
    { id: "runtime", closable: true },
    { id: "agents", closable: false },
    { id: filePanelId(welcomePath), closable: true },
  ];
}

export function activeFilePath(layout: DockAreaLayout | undefined): string | null {
  if (!layout?.center) return null;
  const group = centerEditorTabs(layout.center);
  if (!group) return null;
  const panel = group.panels[group.activeIndex ?? 0];
  return pathFromFilePanel(panel ?? "");
}
