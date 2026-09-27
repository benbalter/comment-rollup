import { setFailed } from "@actions/core";
import { run } from "./main.js";

try {
  await run();
} catch (error) {
  setFailed(error instanceof Error ? error.message : String(error));
}
