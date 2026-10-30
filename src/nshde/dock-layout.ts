import type { DockAreaLayout } from "nsh/base";

export const FILE_PREFIX = "file:";
export const SETTINGS_PANEL = "settings";
export const SESSIONS_PANEL = "sessions";
export const AGENT_PREFIX = "agent:";
export const DEFAULT_SESSION_ID = "main";

const DOCK_TITLES: Record<string, string> = {
  tree: "Explorer",
  runtime: "Runtime",
  [SESSIONS_PANEL]: "Sessions",
  [SETTINGS_PANEL]: "Settings",
};

/** Gallery dock tab height (`h-9`). An open DockArea dock cannot be shorter than 100 points. */
export const TAB_RAIL = 36;

type DockNode = DockAreaLayout["center"];
type DockPlacement = "left" | "right" | "bottom";

function walkPanels(node: DockNode, visit: (id: string) => void) {
  if (node.type === "tabs") {
    for (const id of node.panels) visit(id);
    return;
  }
  for (const child of node.children) walkPanels(child, visit);
}

/** Panels on the bottom edge of a layout node. A vertical split only counts its lowest visible child; a horizontal split counts every column. */
export function panelsAlongBottom(node: DockNode | undefined, hidden: ReadonlySet<string> = new Set()): string[] {
  if (!node) return [];
  if (node.type === "tabs") return node.panels.filter((id) => !hidden.has(id));
  if (node.axis === "vertical") {
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const ids = panelsAlongBottom(node.children[index], hidden);
      if (ids.length) return ids;
    }
    return [];
  }
  return node.children.flatMap((child) => panelsAlongBottom(child, hidden));
}

/** Whether a dock still holds `id` (a closed dock keeps its panels). */
export function dockHasPanel(layout: DockAreaLayout | undefined, placement: DockPlacement, id: string): boolean {
  const region = layout?.[placement];
  if (!region) return false;
  let found = false;
  walkPanels(region.layout, (panel) => {
    if (panel === id) found = true;
  });
  return found;
}

export function filePanelId(path: string): string {
  return `${FILE_PREFIX}${path}`;
}

export function pathFromFilePanel(id: string): string | null {
  return id.startsWith(FILE_PREFIX) ? id.slice(FILE_PREFIX.length) : null;
}

export function agentPanelId(sessionId: string): string {
  return `${AGENT_PREFIX}${sessionId}`;
}

export function sessionIdFromPanel(id: string): string | null {
  return id.startsWith(AGENT_PREFIX) ? id.slice(AGENT_PREFIX.length) : null;
}

export function tabTitle(panelId: string): string {
  const path = pathFromFilePanel(panelId);
  if (path) return path.split("/").pop() ?? path;
  return DOCK_TITLES[panelId] ?? panelId;
}

function sessionsGroup(): DockNode {
  return { type: "tabs", panels: [SESSIONS_PANEL], activeIndex: 0 };
}

function conversationGroup(panelId: string): DockNode {
  return { type: "tabs", panels: [panelId], activeIndex: 0 };
}

/** The panel shown in the agent conversation tabs, if that group is still in the left dock. */
export function activeAgentPanel(layout: DockAreaLayout | undefined): string | null {
  const node = layout?.left?.layout;
  if (!node) return null;
  let found: string | null = null;
  const walk = (current: DockNode) => {
    if (current.type === "tabs") {
      const panel = current.panels[current.activeIndex ?? 0];
      if (panel && sessionIdFromPanel(panel)) found = panel;
      return;
    }
    for (const child of current.children) walk(child);
  };
  walk(node);
  return found;
}

function isSessionsGroup(node: DockNode): boolean {
  return node.type === "tabs" && node.panels.includes(SESSIONS_PANEL) && !node.panels.some((id) => sessionIdFromPanel(id));
}

/** Puts `panelId` in the conversation tab group and shows it. Rebuilds the split if that group was closed away. */
export function openAgentTab(layout: DockAreaLayout, panelId: string): DockAreaLayout {
  const region = layout.left ?? { layout: sessionsGroup(), size: 520, open: true };
  const next = placeAgentPanel(region.layout, panelId);
  return {
    ...layout,
    left: { ...region, layout: next, open: true, size: region.size ?? 520 },
  };
}

function placeAgentPanel(node: DockNode, panelId: string): DockNode {
  if (node.type === "tabs") {
    if (isSessionsGroup(node)) {
      return {
        type: "split",
        axis: "horizontal",
        children: [node, conversationGroup(panelId)],
        sizes: [200, null],
      } as DockNode;
    }
    const panels = node.panels.includes(panelId) ? node.panels : [...node.panels, panelId];
    return { ...node, panels, activeIndex: panels.indexOf(panelId) };
  }

  let placed = false;
  const children = node.children.map((child) => {
    if (placed || isSessionsGroup(child)) return child;
    placed = true;
    return placeAgentPanel(child, panelId);
  });
  if (placed) return { ...node, children } as DockNode;
  return {
    ...node,
    children: [...node.children, conversationGroup(panelId)],
  } as DockNode;
}

export function initialIdeLayout(welcomePath: string): DockAreaLayout {
  return {
    // Explorer and Runtime each have a group beside them, so those tabs can
    // leave the way Sessions can. A group that is the only child of a dock cannot.
    center: {
      type: "split",
      axis: "horizontal",
      sizes: [800, 248],
      children: [
        {
          type: "split",
          axis: "vertical",
          sizes: [800, 220],
          children: [
            { type: "tabs", panels: [filePanelId(welcomePath)], activeIndex: 0 },
            { type: "tabs", panels: ["runtime"], activeIndex: 0 },
          ],
        },
        { type: "tabs", panels: ["tree"], activeIndex: 0 },
      ],
    },
    left: {
      layout: {
        type: "split",
        axis: "horizontal",
        children: [sessionsGroup(), conversationGroup(agentPanelId(DEFAULT_SESSION_ID))],
        sizes: [200, null],
      },
      size: 520,
      open: true,
    },
  };
}

type TabGroup = Extract<DockNode, { type: "tabs" }>;

function isToolGroup(node: TabGroup): boolean {
  return node.panels.length > 0 && node.panels.every((id) => id === "runtime" || id === "tree");
}

function centerEditorTabs(center: DockNode): TabGroup | null {
  if (center.type === "tabs") return isToolGroup(center) ? null : center;
  for (const child of center.children) {
    const found = centerEditorTabs(child);
    if (found) return found;
  }
  return null;
}

function updateEditorGroup(node: DockNode, update: (group: TabGroup) => TabGroup): DockNode {
  if (node.type === "tabs") return isToolGroup(node) ? node : update(node);
  let done = false;
  const children = node.children.map((child) => {
    if (done) return child;
    const next = updateEditorGroup(child, update);
    if (next !== child) done = true;
    return next;
  });
  return done ? ({ ...node, children } as DockNode) : node;
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
  const center = updateEditorGroup(layout.center, (group) => {
    const panels = group.panels.includes(panelId) ? group.panels : [...group.panels, panelId];
    return { ...group, panels, activeIndex: panels.indexOf(panelId) };
  });
  return { ...layout, center };
}

export function addFileTab(layout: DockAreaLayout, path: string): DockAreaLayout {
  return addCenterTab(layout, filePanelId(path));
}

export function openSettingsTab(layout: DockAreaLayout): DockAreaLayout {
  return addCenterTab(layout, SETTINGS_PANEL);
}

/** A close button. Tool panes stay open so they can still be dragged to another group. */
export function tabShowsClose(id: string): boolean {
  return id === SETTINGS_PANEL || sessionIdFromPanel(id) !== null || pathFromFilePanel(id) !== null;
}

/** Every pane can leave its group. DockArea only drags a panel whose options say it is closable. */
export function panelClosable(_id: string): boolean {
  return true;
}

export function defaultDockPanels(welcomePath: string): { id: string; closable: boolean; visible?: boolean }[] {
  return [
    { id: "tree", closable: true },
    { id: "runtime", closable: true },
    { id: SESSIONS_PANEL, closable: true },
    { id: agentPanelId(DEFAULT_SESSION_ID), closable: true },
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
