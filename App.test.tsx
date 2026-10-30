import { expect, open, test } from "nsh/test";

const network = {
  "GET http://127.0.0.1:43123/api/config": { body: { backend: "memory" } },
  "GET http://127.0.0.1:43123/api/storage?tree=1": { body: { backend: "memory", tree: [] } },
  "GET http://127.0.0.1:43123/api/storage?path=components%2Fwelcome.nsh.tsx": {
    body: { content: "export function Welcome() { return null }\n" },
  },
  "GET http://127.0.0.1:43123/api/agents": {
    body: {
      agents: [
        { id: "architect", name: "Architect", role: "Plans modules", accent: "" },
        { id: "implementer", name: "Implementer", role: "Writes modules", accent: "" },
        { id: "reviewer", name: "Reviewer", role: "Reviews modules", accent: "" },
      ],
    },
  },
};

test("shows the nshde shell", async () => {
  const app = await open("./App.tsx", { network });
  expect(app.texts().join(" ")).toMatch(/nshde/);
});

test("left and right docks match the gallery, and the runtime collapses to the tab rail", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800, platform: "web", network });
  const text = () => app.texts().join("\n");
  expect(text()).toMatch(/Object tree/);
  expect(text()).toMatch(/Agents/);
  expect(text()).toMatch(/How can I help/);
  expect(app.shows("Hide Runtime")).toBe(true);
  expect(text()).toMatch(/RUNTIME/);

  await app.press("Hide Runtime");
  expect(app.shows("Expand runtime preview")).toBe(true);
  expect(text()).not.toMatch(/RUNTIME/);
  expect(text()).toMatch(/Runtime/);

  await app.press("Expand runtime preview");
  expect(text()).toMatch(/RUNTIME/);
  expect(app.shows("Expand runtime preview")).toBe(false);

  await app.press("Hide Object tree");
  expect(app.shows("Object tree")).toBe(false);
  await app.press("Toggle object tree");
  expect(app.shows("Object tree")).toBe(true);
});
