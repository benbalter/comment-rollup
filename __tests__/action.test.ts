import { expect, test } from "@jest/globals";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every input the code reads must be declared in action.yml, or the runner never passes it
const actionInputs = (() => {
  const yml = readFileSync("action.yml", "utf8");
  const inputsSection = yml.split(/^inputs:\n/m)[1].split(/^\S/m)[0];
  return [...inputsSection.matchAll(/^ {2}(\w+):/gm)].map((match) =>
    match[1].toLowerCase(),
  );
})();

const readInputs = readdirSync("src")
  .filter((file) => file.endsWith(".ts"))
  .flatMap((file) => {
    const source = readFileSync(join("src", file), "utf8");
    return [...source.matchAll(/getInput\(\s*"([^"]+)"/g)].map((match) =>
      match[1].toLowerCase(),
    );
  });

test("finds inputs in the source", () => {
  expect(readInputs.length).toBeGreaterThan(0);
});

for (const input of new Set(readInputs)) {
  test(`${input} is declared in action.yml`, () => {
    expect(actionInputs).toContain(input);
  });
}
