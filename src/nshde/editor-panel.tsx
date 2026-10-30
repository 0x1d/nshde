import { Text, View } from "nsh";
import { Button, Editor, type EditorRef } from "nsh/base";
import { IconSave } from "./icons";
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
    <View class="flex-1 bg-background">
      <View accessibilityLabel="Editor" class="h-8 flex-row items-center gap-2 border-b border-line bg-inset px-3">
        <Text numberOfLines={1} class="min-w-0 flex-1 font-mono text-[12px] text-muted-foreground">
          {props.path}
        </Text>
        <Button
          onPress={() => void saveFile()}
          disabled={!isActive() || props.path.endsWith(".wasm") || !unsaved()}
          accessibilityLabel="Save file"
          class="size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70 disabled:opacity-40"
        >
          <IconSave />
        </Button>
      </View>
      <View class="flex-1 bg-background">
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
