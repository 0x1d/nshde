import { batch, effect, signal } from "nsh";
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

export const tree = signal<TreeNode[]>([]);
export const selectedPath = signal<string | null>("components/welcome.nsh.tsx");
export const editorValue = signal("");
export const dirty = signal(false);
export const loadingFile = signal(false);
export const editorMountKey = signal(0);
export const runtimePath = signal<string | null>("components/welcome.nsh.tsx");
export const runtimeRevision = signal(0);
export const backend = signal<StorageBackend>("fs");
export const settingsOpen = signal(false);
export const previewSrc = signal("http://127.0.0.1:43123/preview/blank");
export const bootError = signal<string | null>(null);

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
  loadingFile.set(true);
  try {
    bootError.set(null);
    const content = await readFile(path);
    batch(() => {
      editorValue.set(content);
      selectedPath.set(path);
      dirty.set(false);
      editorMountKey.update((k) => k + 1);
    });
  } catch (e) {
    bootError.set(e instanceof Error ? e.message : `Failed to open ${path}`);
  } finally {
    loadingFile.set(false);
  }
}

export async function saveFile() {
  const path = selectedPath();
  if (!path || path.endsWith(".wasm")) return;
  await writeFile(path, editorValue());
  dirty.set(false);
  if (runtimePath() === path) {
    runtimeRevision.update((r) => r + 1);
  }
  await refreshTree();
}

export function handleModuleGenerated(path: string, source: string) {
  void refreshTree();
  batch(() => {
    selectedPath.set(path);
    editorValue.set(source);
    dirty.set(false);
    runtimePath.set(path);
    runtimeRevision.update((r) => r + 1);
    editorMountKey.update((k) => k + 1);
  });
}

export async function changeBackend(next: StorageBackend) {
  await setBackend(next);
  backend.set(next);
  settingsOpen.set(false);
  await refreshTree();
  const path = selectedPath();
  if (path) await loadFile(path);
}

export function mountRuntime(path: string) {
  runtimePath.set(path);
  runtimeRevision.update((r) => r + 1);
}

let booted = false;
export function bootIdeData() {
  if (booted) return;
  booted = true;
  effect(() => {
    void loadConfig().then((c) => backend.set(c.backend));
    void refreshTree().then(() => {
      const path = selectedPath();
      if (path) void loadFile(path);
    });
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
