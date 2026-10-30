import { batch, effect, platform, Scroll, signal, Text, token, View } from "nsh";
import { Button, Input, TextView } from "nsh/base";
import type { AgentDefinition, AgentId, AgentMessage } from "../lib/agents";
import { generateModule, listAgents } from "./api";
import { Segmented } from "./segmented";
import { handleModuleGenerated } from "./store";

const PROMPTS = [
  { label: "Todo list", text: "Build a todo list module" },
  { label: "Metrics chart", text: "Create a metrics chart" },
  { label: "Status card", text: "Create a status card with a title and a metric" },
] as const;

function readInput(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const next = (value as { value?: unknown }).value;
    return typeof next === "string" ? next : "";
  }
  return "";
}

function Spinner() {
  return (
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: token("border"),
        borderTopColor: token("brand"),
        animationName: "spin",
        animationDuration: 800,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
      }}
    />
  );
}

function Avatar() {
  return (
    <View class="size-[26px] items-center justify-center rounded-lg border border-border bg-raised">
      <Text class="text-[13px] text-brand">✦</Text>
    </View>
  );
}

export function AgentPanelView() {
  const agents = signal<AgentDefinition[]>([]);
  const activeAgent = signal<AgentId>("implementer");
  const prompt = signal("");
  const inputHeight = signal(20);
  const messages = signal<AgentMessage[]>([]);
  const loading = signal(false);

  effect(() => {
    void listAgents()
      .then((list) => agents.set(list))
      .catch(() => agents.set([]));
  });

  const activeMeta = () => agents().find((agent) => agent.id === activeAgent());
  const canSend = () => !!(prompt() ?? "").trim() && !loading();

  async function submit(raw?: string) {
    const text = (raw ?? prompt() ?? "").trim();
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
      inputHeight.set(20);
    });

    try {
      const data = await generateModule(text, activeAgent());
      messages.set([...messages(), ...data.messages]);
      if (data.generatedPath && data.source) {
        handleModuleGenerated(data.generatedPath, data.source);
      }
    } catch (error) {
      const fail: AgentMessage = {
        id: crypto.randomUUID(),
        agentId: activeAgent(),
        role: "assistant",
        content: error instanceof Error ? error.message : "Something went wrong.",
        timestamp: new Date().toISOString(),
      };
      messages.set([...messages(), fail]);
    } finally {
      loading.set(false);
    }
  }

  return (
    <View class="flex-1 bg-background">
      <View class="min-h-0 flex-1">
        <If
          when={messages().length === 0}
          else={
            <Scroll class="flex-1" contentClass="pb-2">
              <Each of={messages()}>
                {(msg) => (
                  <MessageRow
                    msg={msg()}
                    agentName={agents().find((agent) => agent.id === msg().agentId)?.name ?? msg().agentId}
                  />
                )}
              </Each>
              <If when={loading()}>
                <View class="gap-3 px-4 pb-1 pt-2">
                  <View class="h-[26px] flex-row items-center gap-2">
                    <Avatar />
                    <Text class="flex-1 text-[13px] font-semibold text-muted-foreground">
                      {activeMeta()?.name ?? "Agent"}
                    </Text>
                  </View>
                  <View class="h-[22px] flex-row items-center gap-2">
                    <Spinner />
                    <Text class="text-[13px] text-muted-foreground">Generating…</Text>
                  </View>
                </View>
              </If>
            </Scroll>
          }
        >
          <View class="flex-1 items-center justify-center gap-3 px-4 py-6">
            <View class="size-14 items-center justify-center rounded-2xl border border-border bg-raised">
              <Text class="text-2xl text-brand">✦</Text>
            </View>
            <Text class="text-[22px] font-semibold text-foreground">How can I help?</Text>
            <Text class="text-center text-[15px] leading-[21px] text-muted-foreground">
              Describe a module. The agent writes it and opens it in the editor.
            </Text>
          </View>
        </If>
      </View>

      <If when={messages().length === 0}>
        <View class="flex-row flex-wrap gap-2 px-3 py-2">
          <Each of={PROMPTS}>
            {(chip) => (
              <Button
                onPress={() => void submit(chip().text)}
                disabled={loading()}
                accessibilityLabel={chip().label}
                class="h-9 justify-center rounded-full border border-border bg-card px-3.5 active:opacity-80 disabled:opacity-40"
              >
                <Text class="text-[13px] font-medium text-foreground">{chip().label}</Text>
              </Button>
            )}
          </Each>
        </View>
      </If>

      <View class="gap-2 px-3 pb-3 pt-1">
        <View class="gap-1.5 rounded-3xl border border-border bg-card p-1.5">
          <Input
            value={prompt()}
            onChange={(value) => prompt.set(readInput(value))}
            multiline
            submitBehavior={platform.desktop ? "submit" : "newline"}
            onSubmit={() => {
              if (!loading()) void submit();
            }}
            placeholder={`Message ${activeMeta()?.name ?? "the agent"}`}
            accessibilityLabel="Agent prompt"
            onContentSizeChange={(size) => {
              const height = size && typeof size === "object" && "height" in size ? size.height : 20;
              inputHeight.set(Math.min(100, Math.max(20, height)));
            }}
            class="px-2.5 py-2.5 text-[15px] leading-5 text-foreground placeholder:text-muted-foreground"
            style={{ height: inputHeight() + 20 }}
          />
          <If when={agents().length > 0}>
            <Segmented
              options={agents().map((agent) => ({ value: agent.id, label: agent.name }))}
              value={activeAgent()}
              onChange={(id) => activeAgent.set(id)}
            />
          </If>
          <View class="flex-row items-center justify-end">
            <Button
              onPress={() => void submit()}
              disabled={!canSend()}
              accessibilityLabel="Send"
              class="size-11 items-center justify-center rounded-full bg-brand disabled:opacity-35 active:opacity-90"
            >
              <Text class="text-base font-semibold text-background">↑</Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

function MessageRow(props: { msg: AgentMessage; agentName?: string }) {
  if (props.msg.role === "user") {
    return (
      <View class="items-end px-4 py-2">
        <View class="max-w-[82%] rounded-[20px] rounded-br-md border border-border bg-raised px-3.5 py-2.5">
          <Text class="text-[15px] leading-[21px] text-foreground">{props.msg.content}</Text>
        </View>
      </View>
    );
  }

  const name = props.agentName ?? props.msg.agentId;
  return (
    <View class="gap-3 px-4 pb-1 pt-2">
      <View class="h-[26px] flex-row items-center gap-2">
        <Avatar />
        <Text class="flex-1 text-[13px] font-semibold text-muted-foreground">{name}</Text>
      </View>
      <TextView
        markdown={props.msg.content}
        selectable
        styles={{
          root: { gap: 12, fontSize: 15, lineHeight: 22, color: token("foreground") },
          heading1: { fontSize: 20, lineHeight: 26 },
          heading2: { fontSize: 17, lineHeight: 22 },
          heading3: { fontSize: 15, lineHeight: 22 },
          code: { color: token("code") },
          codeBlockCode: { color: token("code") },
          link: { color: token("brand") },
        }}
      />
    </View>
  );
}
