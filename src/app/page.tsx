import { IdeShell } from "@/components/nshde/ide-shell";
import { getStorageTree } from "@/lib/storage/registry";
import type { TreeNode } from "@/components/nshde/object-tree";

export default async function Home() {
  const tree = (await getStorageTree()) as TreeNode[];
  return (
    <main className="h-[100dvh] overflow-hidden">
      <IdeShell initialTree={tree} />
    </main>
  );
}
