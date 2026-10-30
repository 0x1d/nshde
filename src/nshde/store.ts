import { batch, effect, signal } from "nsh";
import type { DockAreaLayout } from "nsh/base";
import type { AgentMessage } from "../lib/agents";
import type { StorageBackend } from "../lib/storage/types";
import {
  loadConfig,
  loadTree,
  previewUrl,
  readFile,
  setBackend,
  writeFile,
  type TreeNode,
} from "./api";
import {
  activeFilePath,
  addFileTab,
  agentPanelId,
  defaultDockPanels,
  DEFAULT_SESSION_ID,
  filePanelId,
  initialIdeLayout,
  openAgentTab,
  openSettingsTab,
  panelClosable,
  pathFromFilePanel,
  SETTINGS_PANEL,
} from "./dock-layout";

const WELCOME = "components/welcome.nsh.tsx";

export interface AgentSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  loading: boolean;
}

function blankSession(id: string, title = "New agent"): AgentSession {
  return { id, title, messages: [], loading: false };
}

export const sessions = signal<AgentSession[]>([blankSession(DEFAULT_SESSION_ID)]);
export const tree = signal<TreeNode[]>([]);
export const dockLayout = signal<DockAreaLayout>(initialIdeLayout(WELCOME));
export const dockPanels = signal(defaultDockPanels(WELCOME));
export const selectedPath = signal<string | null>(WELCOME);
export const editorValue = signal("");
export const dirty = signal(false);
export const loadingFile = signal(false);
export const runtimePath = signal<string | null>(WELCOME);
export const runtimeRevision = signal(0);
export const backend = signal<StorageBackend>("fs");
export const previewSrc = signal("http://127.0.0.1:43123/preview/blank");
export const bootError = signal<string | null>(null);

const editorCache = signal<Record<string, { value: string; dirty: boolean; mountKey: number }>>({});
export { editorCache };

function ensureDockPanel(id: string) {
  const list = dockPanels();
  if (list.some((p) => p.id === id)) return;
  dockPanels.set([...list, { id, closable: panelClosable(id) }]);
}

export function patchSession(id: string, patch: Partial<AgentSession>) {
  sessions.set(sessions().map((session) => (session.id === id ? { ...session, ...patch } : session)));
}

export function createAgentSession() {
  const id = crypto.randomUUID();
  const panelId = agentPanelId(id);
  batch(() => {
    sessions.set([blankSession(id), ...sessions()]);
    ensureDockPanel(panelId);
    dockLayout.set(openAgentTab(dockLayout(), panelId));
  });
}

export function focusAgentSession(id: string) {
  ensureDockPanel(agentPanelId(id));
  dockLayout.set(openAgentTab(dockLayout(), agentPanelId(id)));
}

function stashCurrentEditor() {
  const path = selectedPath();
  if (!path) return;
  const prev = editorCache()[path];
  editorCache.set({
    ...editorCache(),
    [path]: { value: editorValue(), dirty: dirty(), mountKey: prev?.mountKey ?? 0 },
  });
}

export async function refreshTree() {
  try {
    bootError.set(null);
    const data = await loadTree();
    tree.set(data.tree ?? []);
    backend.set(data.backend);
  } catch (e) {
    bootError.set(e instanceof Error ? e.message : "Failed to load object tree");
  }
}

export async function loadFile(path: string) {
  const cached = editorCache()[path];
  if (cached && !cached.dirty) {
    batch(() => {
      selectedPath.set(path);
      editorValue.set(cached.value);
      dirty.set(false);
      loadingFile.set(false);
    });
    return;
  }
  try {
    bootError.set(null);
    const content = cached?.value ?? (await readFile(path));
    batch(() => {
      editorValue.set(content);
      selectedPath.set(path);
      dirty.set(cached?.dirty ?? false);
      const mountKey = (cached?.mountKey ?? 0) + 1;
      editorCache.set({
        ...editorCache(),
        [path]: { value: content, dirty: cached?.dirty ?? false, mountKey },
      });
    });
  } catch (e) {
    bootError.set(e instanceof Error ? e.message : `Failed to open ${path}`);
  } finally {
    loadingFile.set(false);
  }
}

export function openFileInEditor(path: string) {
  stashCurrentEditor();
  ensureDockPanel(filePanelId(path));
  dockLayout.set(addFileTab(dockLayout(), path));
  void loadFile(path);
}

export function openSettingsInEditor() {
  ensureDockPanel(SETTINGS_PANEL);
  dockLayout.set(openSettingsTab(dockLayout()));
}

export function isPathDirty(path: string): boolean {
  if (selectedPath() === path) return dirty();
  return editorCache()[path]?.dirty ?? false;
}

export function syncActiveEditorFromLayout(layout: DockAreaLayout | undefined) {
  if (!layout?.center) return;
  const path = activeFilePath(layout);
  if (!path || path === selectedPath()) return;
  stashCurrentEditor();
  void loadFile(path);
}

export async function saveFile() {
  const path = selectedPath();
  if (!path || path.endsWith(".wasm")) return;
  await writeFile(path, editorValue());
  batch(() => {
    dirty.set(false);
    editorCache.set({ ...editorCache(), [path]: { value: editorValue(), dirty: false, mountKey: editorCache()[path]?.mountKey ?? 0 } });
  });
  if (runtimePath() === path) {
    runtimeRevision.update((r) => r + 1);
  }
  await refreshTree();
}

export function handleModuleGenerated(path: string, source: string) {
  void refreshTree();
  ensureDockPanel(filePanelId(path));
  batch(() => {
    dockLayout.set(addFileTab(dockLayout(), path));
    selectedPath.set(path);
    editorValue.set(source);
    dirty.set(false);
    runtimePath.set(path);
    runtimeRevision.update((r) => r + 1);
    editorCache.set({
      ...editorCache(),
      [path]: { value: source, dirty: false, mountKey: (editorCache()[path]?.mountKey ?? 0) + 1 },
    });
  });
}

export async function changeBackend(next: StorageBackend) {
  await setBackend(next);
  backend.set(next);
  await refreshTree();
  const path = selectedPath();
  if (path) await loadFile(path);
}

export function mountRuntime(path: string) {
  runtimePath.set(path);
  runtimeRevision.update((r) => r + 1);
}

export function onEditorValueChange(path: string, value: string) {
  editorValue.set(value);
  dirty.set(true);
  const prev = editorCache()[path];
  editorCache.set({
    ...editorCache(),
    [path]: { value, dirty: true, mountKey: prev?.mountKey ?? 0 },
  });
}

let booted = false;
export function bootIdeData() {
  if (booted) return;
  booted = true;
  effect(() => {
    void loadConfig().then((c) => backend.set(c.backend));
    void refreshTree().then(() => void loadFile(WELCOME));
  });
  effect(() => {
    const path = runtimePath();
    const rev = runtimeRevision();
    void previewUrl(path, rev).then((url) => previewSrc.set(url));
  });
}

export function languageForPath(path: string | null): "typescript" | "json" | "plaintext" {
  if (!path) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".wasm")) return "plaintext";
  return "typescript";
}

export function isFilePanel(id: string): boolean {
  return pathFromFilePanel(id) !== null;
}

export { filePanelId, pathFromFilePanel };
