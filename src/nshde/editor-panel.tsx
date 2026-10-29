import { keymap, Text, View } from "nsh";
import { Button, Editor, type EditorRef } from "nsh/base";
import {
  dirty,
  editorMountKey,
  editorValue,
  languageForPath,
  loadingFile,
  saveFile,
  selectedPath,
} from "./store";

export function EditorPanelView() {
  let editor: EditorRef | undefined;

  keymap.bind("mod+s", () => {
    const path = selectedPath();
    if (path && !path.endsWith(".wasm")) void saveFile();
    editor?.focus();
  });

  return (
    <View class="flex-1 bg-inset">
      <View class="h-9 flex-row items-center justify-between border-b border-border px-3">
        <Text class="flex-1 truncate font-mono text-xs text-muted-foreground">
          {selectedPath() ?? "No file selected"}
        </Text>
        <Button
          onPress={() => void saveFile()}
          disabled={!selectedPath() || selectedPath()!.endsWith(".wasm")}
          accessibilityLabel="Save file"
          class="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-40 bg-brand text-[#0c0c0e] hover:opacity-90 active:opacity-80"
        >
          <Text class="text-xs font-semibold text-[#0c0c0e]">Save</Text>
        </Button>
      </View>
      <View class="flex-1">
        <If when={loadingFile()} else={<EditorBody editorRef={(r) => (editor = r)} />}>
          <View class="flex-1 items-center justify-center">
            <Text class="text-xs text-muted-foreground">Loading file…</Text>
          </View>
        </If>
      </View>
    </View>
  );
}

function EditorBody(props: { editorRef: (ref: EditorRef) => void }) {
  return (
    <View class="flex-1 bg-card">
      {() => {
        void editorMountKey();
        const path = selectedPath();
        const readOnly = path?.endsWith(".wasm") ?? false;
        return (
          <Editor
            ref={props.editorRef}
            defaultValue={editorValue()}
            language={languageForPath(path)}
            lineNumbers
            softWrap={false}
            readOnly={readOnly}
            onChange={({ value }) => {
              editorValue.set(value);
              dirty.set(true);
            }}
            accessibilityLabel={path ?? "Editor"}
            class="flex-1 font-mono text-[13px]"
          />
        );
      }}
    </View>
  );
}
