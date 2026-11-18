import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEDIAPIPE_VERSION, MEDIAPIPE_WASM_PATH } from "./background-removal";

describe("background removal runtime", () => {
  it("points at the WASM folder copied for the installed @mediapipe/tasks-vision version", () => {
    const installed = JSON.parse(readFileSync("node_modules/@mediapipe/tasks-vision/package.json", "utf8")).version;
    const declared = JSON.parse(readFileSync("package.json", "utf8")).dependencies["@mediapipe/tasks-vision"];
    expect(MEDIAPIPE_VERSION).toBe(installed);
    expect(declared).toBe(installed);
    expect(MEDIAPIPE_WASM_PATH).toBe(`/vendor/mediapipe/${installed}`);
  });
});
