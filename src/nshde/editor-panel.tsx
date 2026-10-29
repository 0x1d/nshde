import { Button, Editor, type EditorRef } from "nsh/base";
import { keymap } from "nsh";
import { Text, View } from "nsh";

interface EditorPanelProps {
  path: string | null;
  value: string;
  loading: boolean;
  mountKey: number;
  language: "typescript" | "json" | "plaintext";
  onChange: (value: string) => void;
  onSave: () => void;
}

export function EditorPanel({ path, value, loading, mountKey, language, onChange, onSave }: EditorPanelProps) {
  let editor: EditorRef | undefined;
  const readOnly = path?.endsWith(".wasm") ?? false;

  keymap.bind("mod+s", () => {
    if (!readOnly && path) onSave();
    editor?.focus();
  });

  return (
    <View class="flex-1 bg-inset">
      <View class="h-9 flex-row items-center justify-between border-b border-border px-3">
        <Text style={{ numberOfLines: 1 }} class="flex-1 font-mono text-xs text-muted-foreground">
          {path ?? "No file selected"}
        </Text>
        <Button
          onPress={onSave}
          disabled={!path || readOnly}
          accessibilityLabel="Save file"
          class="rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-40 bg-brand text-[#0c0c0e] hover:opacity-90 active:opacity-80"
        >
          <Text class="text-xs font-semibold text-[#0c0c0e]">Save</Text>
        </Button>
      </View>
      <View class="flex-1">
        <If
          when={loading}
          else={
            <EditorBody
              mountKey={mountKey}
              path={path}
              value={value}
              language={language}
              readOnly={readOnly}
              onChange={onChange}
              editorRef={(r) => (editor = r)}
            />
          }
        >
          <View class="flex-1 items-center justify-center">
            <Text class="text-xs text-muted-foreground">Loading file…</Text>
          </View>
        </If>
      </View>
    </View>
  );
}

function EditorBody(props: {
  mountKey: number;
  path: string | null;
  value: string;
  language: "typescript" | "json" | "plaintext";
  readOnly: boolean;
  onChange: (value: string) => void;
  editorRef: (ref: EditorRef) => void;
}) {
  return (
    <View class="flex-1 bg-card">
      {() => {
        void props.mountKey;
        return (
          <Editor
            ref={props.editorRef}
            defaultValue={props.value}
            language={props.language}
            lineNumbers
            softWrap={false}
            readOnly={props.readOnly}
            onChange={({ value }) => props.onChange(value)}
            accessibilityLabel={props.path ?? "Editor"}
            class="flex-1 font-mono text-[13px]"
          />
        );
      }}
    </View>
  );
}
