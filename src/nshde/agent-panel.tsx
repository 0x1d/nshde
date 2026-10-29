import { batch, computed, effect, platform, Scroll, signal, Text, View } from "nsh";
import { Button, Input, Tab, Tabs, TextView } from "nsh/base";
import type { AgentDefinition, AgentId, AgentMessage } from "../lib/agents";
import { generateModule, listAgents } from "./api";

interface AgentPanelProps {
  onModuleGenerated: (path: string, source: string) => void;
}

export function AgentPanel({ onModuleGenerated }: AgentPanelProps) {
  const agents = signal<AgentDefinition[]>([]);
  const activeAgent = signal<AgentId>("implementer");
  const prompt = signal("");
  const messages = signal<AgentMessage[]>([]);
  const loading = signal(false);

  effect(() => {
    void listAgents().then((list) => agents.set(list));
  });

  const activeMeta = computed(() => agents().find((a) => a.id === activeAgent()));

  async function submit() {
    if (!prompt().trim() || loading()) return;
    loading.set(true);
    const text = prompt().trim();
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
        onModuleGenerated(data.generatedPath, data.source);
      }
    } finally {
      loading.set(false);
    }
  }

  return (
    <View class="flex-1 bg-card">
      <View class="border-b border-border px-3 py-2">
        <Text class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agents</Text>
        <View class="mt-2 flex-row flex-wrap gap-1">
          <Tabs class="flex-row flex-wrap gap-1">
            <Each of={agents()}>
              {(agent) => (
                <Tab
                  selected={activeAgent() === agent().id}
                  onPress={() => activeAgent.set(agent().id)}
                  class="rounded-full px-2.5 py-1 text-xs font-medium selected:bg-accent selected:text-foreground text-muted-foreground hover:bg-accent/60"
                >
                  <Text class="text-xs font-medium">{agent().name}</Text>
                </Tab>
              )}
            </Each>
          </Tabs>
        </View>
        <If when={activeMeta()}>
          {(meta) => (
            <Text class="mt-2 text-[11px] leading-snug text-muted-foreground">{meta().role}</Text>
          )}
        </If>
      </View>

      <Scroll class="flex-1 p-3" contentClass="gap-2">
        <If when={messages().length === 0}>
          <Text class="text-xs text-muted-foreground">
            Example: &quot;Build a todo list module&quot; or &quot;Create a metrics chart&quot;
          </Text>
        </If>
        <Each of={messages()}>
          {(msg) => (
            <View class={`rounded-lg px-3 py-2 ${msg().role === "user" ? "ml-4 bg-brand/10" : "mr-2 bg-muted"}`}>
              <Text class="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {msg().role === "user" ? "You" : msg().agentId}
              </Text>
              <If when={msg().role === "assistant"} else={<Text class="text-sm text-foreground">{msg().content}</Text>}>
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

      <View class="gap-2 border-t border-border p-3">
        <Input
          value={prompt()}
          onChange={({ value }) => prompt.set(value)}
          multiline
          submitBehavior={platform.desktop ? "submit" : "newline"}
          onSubmit={() => void submit()}
          placeholder="Describe the module to develop…"
          accessibilityLabel="Agent prompt"
          class="min-h-[72px] rounded-lg border border-border bg-field px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button
          onPress={() => void submit()}
          disabled={loading() || !prompt().trim()}
          class="h-10 items-center justify-center rounded-lg bg-primary disabled:opacity-50 active:opacity-90"
        >
          <Text class="text-sm font-medium text-primary-foreground">Develop module</Text>
        </Button>
      </View>
    </View>
  );
}
