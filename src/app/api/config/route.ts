import { NextResponse } from "next/server";
import { getStorageBackend } from "@/lib/storage/registry";

export async function GET() {
  return NextResponse.json({
    backend: getStorageBackend(),
    options: [
      { id: "fs", label: "Local filesystem", description: ".nshde-data on server" },
      { id: "memory", label: "In-memory", description: "Ephemeral, seeded demo files" },
      { id: "s3", label: "Amazon S3", description: "Uses AWS creds when configured" },
    ],
  });
}
