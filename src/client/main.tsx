import { createRoot } from "react-dom/client";
import { IdeShell } from "@/components/nshde/ide-shell";
import "./globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <main className="h-[100dvh] overflow-hidden">
    <IdeShell />
  </main>,
);
