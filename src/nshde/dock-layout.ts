import { signal } from "nsh";
import type { DockAreaLayout } from "nsh/base";

export const FILE_PREFIX = "file:";
export const SETTINGS_PANEL = "settings";

const DOCK_TITLES: Record<string, string> = {
  tree: "Object tree",
  runtime: "Runtime",
  agents: "Agents",
  [SETTINGS_PANEL]: "Settings",
};

/** Icon-only rail width (matches `size-7` controls). */
export const DOCK_ICON_RAIL = 28;

/** Drag-resize below this snaps to icon rail for that dock only. */
export const DOCK_COLLAPSE_SNAP = 140;

type DockPlacement = "left" | "right" | "bottom";

const defaultCollapsed: Record<DockPlacement, boolean> = { left: false, right: false, bottom: false };

/** Which docks are in icon-rail mode (independent per side). */
export const dockRailsCollapsed = signal<Record<DockPlacement, boolean>>({ ...defaultCollapsed });

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
  placement: DockPlacement,
  collapsed: boolean,
): DockAreaLayout {
  const region = layout[placement];
  if (!region) return layout;

  const current = region.size ?? DOCK_DEFAULT_SIZE[placement];
  if (!collapsed && current > DOCK_COLLAPSE_SNAP) {
    expandedDockSizes[placement] = current;
  }

  dockRailsCollapsed.set({ ...dockRailsCollapsed(), [placement]: collapsed });

  if (placement === "left" || placement === "right") {
    if (collapsed) {
      if (current > DOCK_COLLAPSE_SNAP) expandedDockSizes[placement] = current;
      return { ...layout, [placement]: { ...region, open: false } };
    }
    return {
      ...layout,
      [placement]: {
        ...region,
        open: true,
        size: expandedDockSizes[placement] ?? DOCK_DEFAULT_SIZE[placement],
      },
    };
  }

  const size = collapsed ? DOCK_ICON_RAIL : expandedDockSizes[placement] ?? DOCK_DEFAULT_SIZE[placement];
  return {
    ...layout,
    [placement]: { ...region, open: true, size },
  };
}

export function isDockCollapsed(_layout: DockAreaLayout | undefined, placement: DockPlacement): boolean {
  const region = _layout?.[placement];
  if (region?.open === false) return true;
  return dockRailsCollapsed()[placement];
}

/** Snap resize-handle drags per dock; never collapse a side unless that side's size warrants it. */
export function normalizeDockLayout(layout: DockAreaLayout): DockAreaLayout {
  let next = layout;
  const flags = { ...dockRailsCollapsed() };

  for (const placement of ["left", "right"] as const) {
    const region = next[placement];
    if (!region) continue;

    const size = region.size ?? DOCK_DEFAULT_SIZE[placement];

    if (size > DOCK_COLLAPSE_SNAP) {
      flags[placement] = false;
    } else if (size <= DOCK_COLLAPSE_SNAP) {
      flags[placement] = true;
      if (size > DOCK_ICON_RAIL) expandedDockSizes[placement] = size;
    }

    if (flags[placement]) {
      next = { ...next, [placement]: { ...region, open: false } };
    } else {
      next = { ...next, [placement]: { ...region, open: true } };
    }
  }

  const bottom = next.bottom;
  if (bottom && bottom.open !== false) {
    const size = bottom.size ?? DOCK_DEFAULT_SIZE.bottom;
    if (size > DOCK_COLLAPSE_SNAP) {
      flags.bottom = false;
    } else if (size <= DOCK_COLLAPSE_SNAP) {
      flags.bottom = true;
    }
    if (flags.bottom) {
      next = { ...next, bottom: { ...bottom, open: true, size: DOCK_ICON_RAIL } };
    }
  }

  dockRailsCollapsed.set(flags);
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
