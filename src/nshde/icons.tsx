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

/** Wireframe box — object tree tab */
export function IconObjectTree() {
  return <View class="size-3.5 rounded-[2px] border border-foreground" />;
}

export function IconAgents() {
  return (
    <View class="size-3.5 items-center justify-center">
      <Text class="text-[10px] font-semibold text-foreground">A</Text>
    </View>
  );
}

export function IconRuntime() {
  return <View class="size-3 rounded-[2px] border border-dashed border-muted-foreground" />;
}

export function IconCollapse() {
  return <Text class="text-xs font-medium text-muted-foreground">›</Text>;
}

export function IconExpand() {
  return <Text class="text-xs font-medium text-muted-foreground">‹</Text>;
}

export function IconSettings() {
  return (
    <View class="size-3.5 items-center justify-center">
      <Text class="text-[11px] text-muted-foreground">⚙</Text>
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
        class={props.class ?? "size-8 items-center justify-center rounded-md hover:bg-hover active:opacity-70"}
      >
        {props.children}
      </Button>
    </View>
  );
}
