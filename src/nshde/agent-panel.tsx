import { batch, computed, effect, Scroll, signal, Text, View } from "nsh";
import { Button, Input, Menu, MenuItem, TextView } from "nsh/base";
import type { AgentDefinition, AgentId, AgentMessage } from "../lib/agents";
import { generateModule, listAgents } from "./api";
import { handleModuleGenerated } from "./store";

export function AgentPanelView() {
  const agents = signal<AgentDefinition[]>([]);
  const activeAgent = signal<AgentId>("implementer");
  const menuOpen = signal(false);
  const prompt = signal("");
  const messages = signal<AgentMessage[]>([]);
  const loading = signal(false);

  effect(() => {
    void listAgents()
      .then((list) => agents.set(list))
      .catch(() => agents.set([]));
  });

  const activeMeta = computed(() => agents().find((a) => a.id === activeAgent()));

  async function submit() {
    const text = (prompt() ?? "").trim();
    if (!text || loading()) return;
    loading.set(true);
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      agentId: activeAgent(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    batch(() => {
      messages.set([...messages(), userMsg]);
      prompt.set("");
    });

    try {
      const data = await generateModule(text, activeAgent());
      messages.set([...messages(), ...data.messages]);
      if (data.generatedPath && data.source) {
        handleModuleGenerated(data.generatedPath, data.source);
      }
    } finally {
      loading.set(false);
    }
  }

  return (
    <View class="flex-1 bg-inset">
      <Scroll class="flex-1 p-3" contentClass="gap-2">
        <If when={messages().length === 0}>
          <Text class="text-xs text-muted-foreground">
            Example: &quot;Build a todo list module&quot; or &quot;Create a metrics chart&quot;
          </Text>
        </If>
        <Each of={messages()}>
          {(msg) => (
            <View
              class={`rounded-lg px-3 py-2 ${msg().role === "user" ? "ml-4 bg-brand-tint" : "mr-2 bg-card"}`}
            >
              <Text class="mb-1 text-[10px] uppercase tracking-wide text-faint">
                {msg().role === "user" ? "You" : msg().agentId}
              </Text>
              <If
                when={msg().role === "assistant"}
                else={<Text class="text-sm text-foreground">{msg().content}</Text>}
              >
                <TextView markdown={msg().content} class="text-sm text-foreground" />
              </If>
            </View>
          )}
        </Each>
      </Scroll>

      <If when={loading()}>
        <View class="px-3 pb-1">
          <Text class="text-xs text-muted-foreground">Generating NSH component…</Text>
        </View>
      </If>

      <View class="gap-2 border-t border-line p-3">
        <If when={activeMeta()}>
          {(meta) => <Text class="text-[11px] leading-snug text-muted-foreground">{meta().role}</Text>}
        </If>
        <Menu
          offset={4}
          margin={8}
          align="start"
          popupClass="min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-lg"
          backdropClass="bg-black/40"
          onOpenChange={({ open }) => menuOpen.set(open)}
          trigger={
            <View
              accessibilityLabel="Agent role"
              class={`h-8 flex-row items-center justify-between rounded-md border border-border bg-field px-2.5 ${menuOpen() ? "border-brand" : ""}`}
            >
              <Text class="text-xs font-medium text-foreground">{activeMeta()?.name ?? "Agent"}</Text>
              <Text class="text-[10px] text-muted-foreground">{menuOpen() ? "▴" : "▾"}</Text>
            </View>
          }
        >
          <Each of={agents()}>
            {(agent) => (
              <MenuItem
                onPress={() => activeAgent.set(agent().id)}
                class="rounded-md px-2 py-1.5 hover:bg-hover active:bg-accent"
              >
                <Text
                  class={`text-sm ${activeAgent() === agent().id ? "font-semibold text-foreground" : "text-foreground"}`}
                >
                  {agent().name}
                </Text>
              </MenuItem>
            )}
          </Each>
        </Menu>
        <Input
          value={prompt()}
          onChange={(value) => prompt.set(typeof value === "string" ? value : "")}
          multiline
          submitBehavior="submit"
          onSubmit={() => void submit()}
          placeholder="Describe the module to develop…"
          accessibilityLabel="Agent prompt"
          class="min-h-[64px] rounded-lg border border-border bg-field px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button
          onPress={() => void submit()}
          disabled={loading() || !(prompt() ?? "").trim()}
          class="h-8 items-center justify-center rounded-md bg-primary px-3 disabled:opacity-50 active:opacity-90"
        >
          <Text class="text-xs font-medium text-primary-foreground">Develop module</Text>
        </Button>
      </View>
    </View>
  );
}
