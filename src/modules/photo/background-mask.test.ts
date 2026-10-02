import { describe, expect, it } from "vitest";
import { assessCutout, personAlphaFromBackground } from "./background-mask";

/** Grid kecil: "#" = orang (background 0), "." = latar (background 1). */
function grid(rows: string[]) {
  const width = rows[0].length;
  const values = new Float32Array(rows.length * width);
  rows.forEach((row, y) => [...row].forEach((cell, x) => { values[y * width + x] = cell === "#" ? 0 : 1; }));
  return { values, width, height: rows.length };
}

describe("personAlphaFromBackground", () => {
  it("maps confident person pixels to solid and background to transparent, with a soft middle", () => {
    const alpha = personAlphaFromBackground(new Float32Array([0, 1, 0.5, 0.4]), 4, 1, { maxHoleRatio: 0 });
    expect(alpha[0]).toBe(255);
    expect(alpha[1]).toBe(0);
    expect(alpha[2]).toBe(128);
    expect(alpha[3]).toBeGreaterThan(128);
  });

  it("fills small enclosed holes inside the body but keeps background touching the edge", () => {
    const { values, width, height } = grid([
      "..........",
      ".########.",
      ".##.#####.",
      ".########.",
      "..........",
    ]);
    const alpha = personAlphaFromBackground(values, width, height, { maxHoleRatio: 0.05 });
    expect(alpha[2 * width + 3]).toBe(255);
    expect(alpha[0]).toBe(0);
    expect(alpha[4 * width + 9]).toBe(0);
  });

  it("keeps large enclosed gaps (e.g. between arm and body) transparent", () => {
    const { values, width, height } = grid([
      "##########",
      "#........#",
      "#........#",
      "##########",
    ]);
    const alpha = personAlphaFromBackground(values, width, height, { maxHoleRatio: 0.05 });
    expect(alpha[1 * width + 4]).toBe(0);
  });

  it("rejects masks that do not match the image size", () => {
    expect(() => personAlphaFromBackground(new Float32Array(3), 2, 2)).toThrow("MASK_SIZE_MISMATCH");
  });
});

describe("assessCutout", () => {
  it("flags photos without a detected person or without separable background", () => {
    expect(assessCutout(new Uint8ClampedArray(100))).toMatchObject({ ok: false, reason: "NO_PERSON" });
    expect(assessCutout(new Uint8ClampedArray(100).fill(255))).toMatchObject({ ok: false, reason: "NO_BACKGROUND" });
    const half = new Uint8ClampedArray(100);
    half.fill(255, 0, 40);
    expect(assessCutout(half)).toEqual({ ok: true, coverage: 0.4 });
  });
});
