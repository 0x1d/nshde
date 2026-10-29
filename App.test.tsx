import { expect, open, test } from "nsh/test";

test("shows the nshde shell", async () => {
  const app = await open("./App.tsx");
  expect(app.texts().join(" ")).toMatch(/nshde/);
});
