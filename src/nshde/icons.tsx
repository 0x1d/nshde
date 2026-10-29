import type { JSX } from "nsh";
import { Text, View } from "nsh";
import { Button } from "nsh/base";

const iconBtn =
  "size-7 items-center justify-center rounded-md hover:bg-foreground/10 active:opacity-70 disabled:opacity-40";

export function IconButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      selected={props.selected}
      accessibilityLabel={props.label}
      class={`${iconBtn} ${props.selected ? "bg-foreground/15" : ""} ${props.class ?? ""}`}
    >
      {props.children}
    </Button>
  );
}

export function IconPlay(props: { tint?: string }) {
  return (
    <View class="size-3.5 items-center justify-center">
      <Text class="text-[11px] leading-none" style={{ color: props.tint ?? "var(--foreground)" }}>
        ▶
      </Text>
    </View>
  );
}

export function IconLive(props: { active?: boolean }) {
  return (
    <View
      class={`size-2 rounded-full ${props.active ? "bg-up" : "border border-muted-foreground"}`}
      accessibilityLabel={props.active ? "Live" : "Not live"}
    />
  );
}

export function IconSave() {
  return (
    <View class="size-3.5 gap-[2px]">
      <View class="h-2 rounded-[2px] border border-foreground" />
      <View class="h-[3px] rounded-sm bg-foreground" />
    </View>
  );
}

export function IconClose() {
  return <Text class="text-[15px] leading-none text-muted-foreground">×</Text>;
}

export function IconChevron(props: { open?: boolean }) {
  return (
    <Text class="w-3 text-center text-[10px] text-faint">{props.open ? "▾" : "▸"}</Text>
  );
}

export function IconPanelHide() {
  return <Text class="text-xs font-medium text-muted-foreground">−</Text>;
}
