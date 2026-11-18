import { describe, expect, it } from "vitest";
import { buildCopySuggestions, COPY_FIELDS, COPY_PRESETS_DEFAULTS, normalizeCopyPresets, type CopyContext } from "@/modules/content/copy-presets";
import { assertNoForbiddenKeys } from "@/modules/privacy/public-projection";

const babysitter: CopyContext = { categoryCode: "BABYSITTER", categoryName: "Babysitter", experienceName: "Pengalaman", skillNames: ["Rawat Bayi", "Masak"], firstName: "Siti" };

describe("buildCopySuggestions", () => {
  it("puts category-specific suggestions first and fills tokens", () => {
    const suggestions = buildCopySuggestions(COPY_PRESETS_DEFAULTS, "publicTitle", babysitter);
    expect(suggestions[0]).toBe("Babysitter penyayang, anak aman & ceria");
    expect(suggestions).toContain("Babysitter (Pengalaman), siap kerja & interview");
    expect(suggestions).toContain("Kenalan dengan Siti, Babysitter siap kerja");
  });

  it("drops suggestions whose tokens are empty", () => {
    const suggestions = buildCopySuggestions(COPY_PRESETS_DEFAULTS, "specialty", { ...babysitter, skillNames: [] });
    expect(suggestions.every((text) => !text.includes("•"))).toBe(true);
    expect(suggestions).toContain("Babysitter Bayi & Balita");
  });

  it("never exceeds the field's character limit and has no duplicates", () => {
    const longContext = { ...babysitter, categoryName: "Kategori Dengan Nama Yang Sangat Panjang Sekali", skillNames: ["Keahlian Panjang Sekali", "Keahlian Kedua Panjang"] };
    for (const field of COPY_FIELDS) {
      const suggestions = buildCopySuggestions(COPY_PRESETS_DEFAULTS, field.key, longContext);
      expect(suggestions.every((text) => text.length <= field.maxLength)).toBe(true);
      expect(new Set(suggestions.map((text) => text.toLowerCase())).size).toBe(suggestions.length);
    }
  });

  it("default suggestions all fit their field when tokens are short", () => {
    const shortContext = { categoryCode: "ART", categoryName: "ART", experienceName: "Pemula", skillNames: ["Masak", "Setrika"], firstName: "Ani" };
    for (const field of COPY_FIELDS) {
      expect(buildCopySuggestions(COPY_PRESETS_DEFAULTS, field.key, shortContext, 20).length).toBeGreaterThan(0);
    }
  });
});

describe("normalizeCopyPresets", () => {
  it("falls back to defaults for missing or invalid fields", () => {
    const normalized = normalizeCopyPresets({ liveInStatus: { default: ["Siap menginap"], byCategory: {} }, workerQuote: "not-an-object" });
    expect(normalized.liveInStatus.default).toEqual(["Siap menginap"]);
    expect(normalized.workerQuote).toEqual(COPY_PRESETS_DEFAULTS.workerQuote);
    expect(normalized.publicTitle).toEqual(COPY_PRESETS_DEFAULTS.publicTitle);
  });

  it("defaults contain no sensitive field names", () => {
    expect(() => assertNoForbiddenKeys(COPY_PRESETS_DEFAULTS)).not.toThrow();
  });
});
