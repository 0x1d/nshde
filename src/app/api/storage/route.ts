import { NextRequest, NextResponse } from "next/server";
import {
  getStorageProvider,
  getStorageProviderReady,
  setStorageBackend,
  getStorageBackend,
} from "@/lib/storage/registry";
import type { StorageBackend } from "@/lib/storage/types";
import { FsStorage } from "@/lib/storage/fs-storage";

export async function GET(req: NextRequest) {
  const provider = await getStorageProviderReady();
  const path = req.nextUrl.searchParams.get("path");
  const tree = req.nextUrl.searchParams.get("tree");

  if (tree === "1") {
    const p = provider as FsStorage;
    const data =
      "tree" in p && typeof p.tree === "function"
        ? await p.tree("components")
        : await provider.list("components");
    return NextResponse.json({
      backend: getStorageBackend(),
      tree: data,
    });
  }

  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  try {
    const content = await provider.read(path);
    if (content instanceof Uint8Array) {
      return new NextResponse(Buffer.from(content), {
        headers: {
          "Content-Type": "application/wasm",
          "X-Nshde-Path": path,
        },
      });
    }
    return NextResponse.json({ path, content, backend: getStorageBackend() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read failed" },
      { status: 404 },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    path?: string;
    content?: string;
    backend?: StorageBackend;
  };

  if (body.backend) {
    await setStorageBackend(body.backend);
    return NextResponse.json({ ok: true, backend: body.backend });
  }

  if (!body.path || body.content === undefined) {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }

  const provider = await getStorageProviderReady();
  await provider.write(body.path, body.content);
  return NextResponse.json({ ok: true, path: body.path });
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }
  await getStorageProvider().delete(path);
  return NextResponse.json({ ok: true });
}
