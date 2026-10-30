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

test("opens an explorer file as a closable editor tab", async () => {
  const app = await open("./App.tsx", {
    width: 1280,
    height: 800,
    platform: "web",
    network: {
      ...network,
      "GET http://127.0.0.1:43123/api/storage?tree=1": {
        body: {
          backend: "memory",
          tree: [
            {
              path: "components",
              name: "components",
              kind: "directory",
              children: [
                { path: "components/welcome.nsh.tsx", name: "welcome.nsh.tsx", kind: "file" },
                { path: "components/todo.nsh.tsx", name: "todo.nsh.tsx", kind: "file" },
              ],
            },
          ],
        },
      },
      "GET http://127.0.0.1:43123/api/storage?path=components%2Ftodo.nsh.tsx": {
        body: { content: "export function Todo() { return null }\n" },
      },
    },
  });
  await app.press("todo.nsh.tsx");
  const text = app.texts().join("\n");
  expect(text).toMatch(/components\/todo\.nsh\.tsx/);
  expect(app.shows("Close todo.nsh.tsx")).toBe(true);
  expect(app.shows("Save file")).toBe(true);
});

test("the editor keeps what you type", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800, platform: "web", network });
  await app.type("components/welcome.nsh.tsx", "stay");
  expect(app.texts().join("\n")).toMatch(/stay/);
});

test("the agent role menu updates the selected role", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800, platform: "web", network });
  expect(app.texts().join(" ")).toMatch(/Implementer/);
  await app.press("Agent role");
  await app.press("Architect");
  expect(app.texts().join(" ")).toMatch(/Architect/);
  expect(app.texts().join(" ")).not.toMatch(/Implementer/);
});
