import type { JSX } from "nsh";
import { Text, View } from "nsh";
import { Button, Tooltip } from "nsh/base";

const iconBtn =
  "size-6 items-center justify-center rounded-md hover:bg-foreground/10 active:opacity-70 disabled:opacity-40";

function Tip(props: { label: string }) {
  return (
    <Tooltip delay={400}>
      <View class="rounded-md border border-border bg-popover px-2 py-1 shadow-sm">
        <Text class="text-[11px] text-popover-foreground">{props.label}</Text>
      </View>
    </Tooltip>
  );
}

export function IconButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <View tooltip={<Tip label={props.label} />}>
      <Button
        onPress={props.onPress}
        disabled={props.disabled}
        selected={props.selected}
        accessibilityLabel={props.label}
        class={`${iconBtn} ${props.selected ? "bg-foreground/15" : ""} ${props.class ?? ""}`}
      >
        {props.children}
      </Button>
    </View>
  );
}

export function IconPlay(props: { tint?: string }) {
  return (
    <View class="size-3 items-center justify-center">
      <Text
        class="text-[10px] leading-none text-muted-foreground"
        style={props.tint ? { color: props.tint } : undefined}
      >
        ▶
      </Text>
    </View>
  );
}

export function IconLive(props: { active?: boolean }) {
  return (
    <View class={`size-2 rounded-full ${props.active ? "bg-up" : "border border-muted-foreground"}`} />
  );
}

export function IconSave() {
  return (
    <View class="size-3 gap-[1px]">
      <View class="h-1.5 rounded-[1px] border border-foreground" />
      <View class="h-[2px] rounded-sm bg-foreground" />
    </View>
  );
}

export function IconClose() {
  return <Text class="text-[14px] leading-none text-muted-foreground">×</Text>;
}

export function IconChevron(props: { open?: boolean }) {
  return <Text class="w-3 text-center text-[10px] text-faint">{props.open ? "▾" : "▸"}</Text>;
}

/** Side panel glyph for dock hide (gallery-style line icon). */
export function IconSidePanel(props: { edge: "left" | "right" | "bottom" }) {
  if (props.edge === "bottom") {
    return (
      <View class="h-3 w-4 flex-col justify-end">
        <View class="min-h-[6px] flex-1 rounded-t-sm border border-b-0 border-muted-foreground" />
        <View class="h-px bg-foreground" />
      </View>
    );
  }
  if (props.edge === "left") {
    return (
      <View class="h-4 w-3 flex-row">
        <View class="w-px bg-foreground" />
        <View class="flex-1 rounded-r-sm border border-l-0 border-muted-foreground" />
      </View>
    );
  }
  return (
    <View class="h-4 w-3 flex-row">
      <View class="flex-1 rounded-l-sm border border-r-0 border-muted-foreground" />
      <View class="w-px bg-foreground" />
    </View>
  );
}

export function TipIconButton(props: {
  label: string;
  onPress?: () => void;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <View tooltip={<Tip label={props.label} />}>
      <Button
        onPress={props.onPress}
        accessibilityLabel={props.label}
        class={props.class ?? "size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70"}
      >
        {props.children}
      </Button>
    </View>
  );
}

export function TipTextButton(props: {
  label: string;
  onPress?: () => void;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <View tooltip={<Tip label={props.label} />}>
      <Button
        onPress={props.onPress}
        accessibilityLabel={props.label}
        class={props.class ?? "size-7 items-center justify-center rounded-md hover:bg-hover active:opacity-70"}
      >
        {props.children}
      </Button>
    </View>
  );
}
