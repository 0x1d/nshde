import type { DockAreaLayout } from "nsh/base";

export const FILE_PREFIX = "file:";

const DOCK_TITLES: Record<string, string> = {
  tree: "Object tree",
  runtime: "Runtime",
  agents: "Agents",
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

export function collectFilePanelIds(layout: DockAreaLayout): string[] {
  const ids = new Set<string>();
  const walk = (node: DockAreaLayout["center"] | TabGroup) => {
    if (node.type === "tabs") {
      for (const id of node.panels) {
        if (pathFromFilePanel(id)) ids.add(id);
      }
      return;
    }
    if (node.type === "split") {
      for (const child of node.children) walk(child as DockAreaLayout["center"]);
    }
  };
  walk(layout.center);
  for (const side of [layout.left, layout.right, layout.bottom, layout.top]) {
    if (side?.layout.type === "tabs") {
      for (const id of side.layout.panels) {
        if (pathFromFilePanel(id)) ids.add(id);
      }
    } else if (side?.layout.type === "split") {
      walk(side.layout as SplitNode);
    }
  }
  return [...ids];
}

export function addFileTab(layout: DockAreaLayout, path: string): DockAreaLayout {
  const id = filePanelId(path);
  const center = layout.center;
  if (center.type !== "split" || center.axis !== "vertical") return layout;
  const editorGroup = center.children[0];
  if (editorGroup.type !== "tabs") return layout;
  const panels = editorGroup.panels.includes(id) ? editorGroup.panels : [...editorGroup.panels, id];
  const activeIndex = panels.indexOf(id);
  const nextEditor: TabGroup = { ...editorGroup, panels, activeIndex };
  return {
    ...layout,
    center: { ...center, children: [nextEditor, center.children[1]] as SplitNode["children"] },
  };
}

export function panelRegistry(layout: DockAreaLayout): { id: string; closable: boolean }[] {
  const fileIds = collectFilePanelIds(layout);
  return [
    { id: "tree", closable: false },
    { id: "runtime", closable: true },
    { id: "agents", closable: false },
    ...fileIds.map((id) => ({ id, closable: true })),
  ];
}

export function activeFilePath(layout: DockAreaLayout): string | null {
  const walk = (node: DockAreaLayout["center"]): string | null => {
    if (node.type === "tabs") {
      const active = node.panels[node.activeIndex ?? 0];
      return pathFromFilePanel(active ?? "");
    }
    if (node.type === "split") {
      for (const child of node.children) {
        const p = walk(child as DockAreaLayout["center"]);
        if (p) return p;
      }
    }
    return null;
  };
  return walk(layout.center);
}
