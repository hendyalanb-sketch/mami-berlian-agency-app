import { describe, expect, it } from "vitest";
import { contentHash } from "./content-hash";

describe("contentHash", () => {
  it("is stable regardless of object key order", () => {
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
  });
  it("changes when publication data changes", () => {
    expect(contentHash({ salary: "2.5" })).not.toBe(contentHash({ salary: "2.7" }));
  });
});
