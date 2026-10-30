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

test("agents sit on the left, the explorer on the right, and a collapsed pane leaves its rail", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800, platform: "web", network });
  const text = () => app.texts().join("\n");

  expect(text()).toMatch(/New agent/);
  expect(text()).toMatch(/How can I help/);
  expect(text()).toMatch(/Sessions/);
  expect(text()).toMatch(/Explorer/);
  expect(text()).toMatch(/No components yet/);
  expect(app.shows("Agents")).toBe(true);
  expect(app.shows("Expand runtime")).toBe(false);

  await app.press("Toggle runtime");
  expect(app.shows("Expand runtime")).toBe(true);
  expect(text()).toMatch(/Runtime/);
  expect(text()).toMatch(/How can I help/);

  await app.press("Expand runtime");
  expect(app.shows("Expand runtime")).toBe(false);

  await app.press("Toggle agents");
  expect(text()).not.toMatch(/How can I help/);
  expect(app.shows("Agents")).toBe(true);
  expect(text()).toMatch(/No components yet/);

  await app.press("Agents");
  expect(text()).toMatch(/How can I help/);

  await app.press("Toggle explorer");
  expect(text()).not.toMatch(/No components yet/);
  expect(app.shows("Explorer")).toBe(true);

  await app.press("Explorer");
  expect(text()).toMatch(/No components yet/);

  await app.press("New agent");
  expect(text()).toMatch(/New agent/);
});
