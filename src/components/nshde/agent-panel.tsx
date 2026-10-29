"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AgentDefinition, AgentMessage, AgentId } from "@/lib/agents";

interface AgentPanelProps {
  onModuleGenerated: (path: string, source: string) => void;
}

export function AgentPanel({ onModuleGenerated }: AgentPanelProps) {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId>("implementer");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { agents: AgentDefinition[] }) => setAgents(d.agents));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      agentId: activeAgent,
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setPrompt("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg.content, agentId: activeAgent }),
      });
      const data = (await res.json()) as {
        messages: AgentMessage[];
        generatedPath?: string;
        source?: string;
      };
      setMessages((m) => [...m, ...data.messages]);
      if (data.generatedPath && data.source) {
        onModuleGenerated(data.generatedPath, data.source);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Bot className="h-3.5 w-3.5" />
          Agents
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveAgent(a.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                activeAgent === a.id
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
              )}
            >
              <span className={a.accent}>{a.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-zinc-600">
          {agents.find((a) => a.id === activeAgent)?.role}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-600">
            Example: &quot;Build a todo list module&quot; or &quot;Create a metrics chart&quot;
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-4 bg-sky-950/50 text-sky-100"
                : "mr-2 bg-zinc-900 text-zinc-300",
            )}
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
              {msg.role === "user" ? "You" : msg.agentId}
            </div>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating NSH component…
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-zinc-800 p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe the module to develop…"
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Develop module
        </button>
      </form>
    </div>
  );
}
