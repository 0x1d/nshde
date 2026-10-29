import { Text, View } from "nsh";
import { Editor, type EditorRef } from "nsh/base";
import { IconButton, IconSave } from "./icons";
import {
  editorCache,
  editorValue,
  isPathDirty,
  languageForPath,
  loadingFile,
  onEditorValueChange,
  saveFile,
  selectedPath,
} from "./store";

export function EditorPanelView(props: { path: string }) {
  let editor: EditorRef | undefined;

  const isActive = () => selectedPath() === props.path;
  const showLoading = () => isActive() && loadingFile() && !editorCache()[props.path];
  const unsaved = () => isPathDirty(props.path);

  return (
    <View class="flex-1 bg-card">
      <View class="h-7 flex-row items-center justify-end gap-0.5 border-b border-line px-1.5">
        <IconButton
          label="Save file (⌘S)"
          disabled={!isActive() || props.path.endsWith(".wasm") || !unsaved()}
          onPress={() => void saveFile()}
        >
          <IconSave />
        </IconButton>
      </View>
      <View class="flex-1 bg-inset">
        <If when={showLoading()} else={<EditorBody path={props.path} editorRef={(r) => (editor = r)} />}>
          <View class="flex-1 items-center justify-center">
            <Text class="text-xs text-muted-foreground">Loading file…</Text>
          </View>
        </If>
      </View>
    </View>
  );
}

function EditorBody(props: { path: string; editorRef: (ref: EditorRef) => void }) {
  return (
    <View class="flex-1">
      {() => {
        const entry = editorCache()[props.path];
        void (entry?.mountKey ?? 0);
        const active = selectedPath() === props.path;
        const value = active ? editorValue() : (entry?.value ?? "");
        const readOnly = props.path.endsWith(".wasm");
        if (!entry && !active) {
          return (
            <View class="flex-1 items-center justify-center">
              <Text class="text-xs text-muted-foreground">Not loaded</Text>
            </View>
          );
        }
        return (
          <Editor
            ref={props.editorRef}
            defaultValue={value}
            language={languageForPath(props.path)}
            lineNumbers
            softWrap={false}
            readOnly={readOnly}
            onChange={({ value: next }) => {
              if (!active) selectedPath.set(props.path);
              onEditorValueChange(props.path, next);
            }}
            accessibilityLabel={props.path}
            class="flex-1 font-mono text-[13px]"
          />
        );
      }}
    </View>
  );
}
