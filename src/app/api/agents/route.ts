import { NextRequest, NextResponse } from "next/server";
import { AGENTS, generateModuleFromPrompt, type AgentId } from "@/lib/agents";
import { getStorageProviderReady } from "@/lib/storage/registry";

export async function GET() {
  return NextResponse.json({ agents: AGENTS });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    prompt?: string;
    agentId?: AgentId;
    save?: boolean;
  };

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const agentId = body.agentId ?? "implementer";
  const { path, source, reply } = generateModuleFromPrompt(body.prompt, agentId);

  if (body.save !== false) {
    await (await getStorageProviderReady()).write(path, source);
  }

  const messages = [
    {
      id: crypto.randomUUID(),
      agentId,
      role: "assistant" as const,
      content: reply,
      timestamp: new Date().toISOString(),
    },
  ];

  return NextResponse.json({
    messages,
    generatedPath: path,
    source,
  });
}
