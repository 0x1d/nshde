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
      <Text class="text-[10px] leading-none" style={{ color: props.tint ?? "var(--foreground)" }}>
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

/** Isometric wireframe box for object-tree rail / tab. */
export function IconObjectTree3D() {
  return (
    <View class="size-4 items-center justify-center">
      <View class="size-3 flex-row items-end">
        <View class="mb-0.5 size-2 border border-muted-foreground" />
        <View class="-ml-1 size-2.5 border border-foreground" />
      </View>
    </View>
  );
}

/** Collapsed right-side panel rail. */
export function IconSidePanelRight() {
  return (
    <View class="h-4 w-3 flex-row">
      <View class="flex-1 rounded-l-sm border border-r-0 border-foreground" />
      <View class="w-px bg-foreground" />
    </View>
  );
}

export function IconCollapseHorizontal(props: { expand?: boolean; side: "left" | "right" }) {
  const ch = props.expand
    ? props.side === "left"
      ? "›"
      : "‹"
    : props.side === "left"
      ? "‹"
      : "›";
  return <Text class="text-xs font-medium text-muted-foreground">{ch}</Text>;
}

export function IconCollapseVertical(props: { expand?: boolean }) {
  return <Text class="text-xs font-medium text-muted-foreground">{props.expand ? "⌃" : "⌄"}</Text>;
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

export function TipIconButton(props: {
  label: string;
  onPress?: () => void;
  children: JSX.Element;
}) {
  return (
    <View tooltip={<Tip label={props.label} />}>
      <Button
        onPress={props.onPress}
        accessibilityLabel={props.label}
        class="size-6 items-center justify-center rounded-md hover:bg-hover active:opacity-70"
      >
        {props.children}
      </Button>
    </View>
  );
}
