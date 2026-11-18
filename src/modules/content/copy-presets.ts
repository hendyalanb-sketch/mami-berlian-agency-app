import { z } from "zod";

/**
 * Rekomendasi teks untuk field "Profil publik & Canva".
 * Disimpan di app_settings (key `content.copy_presets`) agar Admin bisa mengubahnya di Master Data;
 * nilai di bawah hanya default/bootstrap, sama seperti DISPLAY_DEFAULTS.
 *
 * Penanda yang didukung: {kategori} {pengalaman} {keahlian1} {keahlian2} {nama}.
 * Rekomendasi yang penandanya kosong (mis. belum ada keahlian) otomatis tidak ditampilkan.
 */
export const COPY_PRESETS_SETTING_KEY = "content.copy_presets";

/**
 * maxLength = batas terkecil field ini di template Canva (CANVA_TEXT_LIMITS), agar teks yang diketik staf
 * tidak terpotong diam-diam saat Generate. Server tetap menerima nilai lama yang lebih panjang; render memotong per kata.
 */
export const COPY_FIELDS = [
  { key: "publicTitle", label: "Headline promosi", maxLength: 48, factual: false },
  { key: "workerQuote", label: "Kata-kata pekerja", maxLength: 72, factual: false },
  { key: "specialty", label: "Spesialisasi singkat", maxLength: 26, factual: false },
  { key: "liveInStatus", label: "Status menginap", maxLength: 26, factual: true },
  { key: "availability", label: "Ketersediaan mulai", maxLength: 32, factual: true },
  { key: "trainingStatus", label: "Status training", maxLength: 24, factual: true },
  { key: "documentStatus", label: "Status dokumen", maxLength: 24, factual: true },
] as const;

export type CopyFieldKey = (typeof COPY_FIELDS)[number]["key"];
export type CopyFieldPresets = { default: string[]; byCategory: Record<string, string[]> };
export type CopyPresets = Record<CopyFieldKey, CopyFieldPresets>;

export const COPY_PRESETS_DEFAULTS: CopyPresets = {
  publicTitle: {
    default: [
      "{kategori} ({pengalaman}), siap kerja & interview",
      "{kategori} jujur & rajin, siap interview",
      "{kategori} bisa {keahlian1} & {keahlian2}",
      "Kenalan dengan {nama}, {kategori} siap kerja",
    ],
    byCategory: {
      ART: ["ART rajin & cekatan, rumah rapi setiap hari"],
      ART_MOMONG: ["ART Momong sayang anak, rumah tetap rapi"],
      BABYSITTER: ["Babysitter penyayang, anak aman & ceria"],
      SUSTER_LANSIA: ["Suster lansia sabar & telaten, siap interview"],
      SUSTER_PASIEN: ["Suster pasien telaten, rawat di rumah"],
      INFAL: ["Infal siap bantu sementara, bisa mulai cepat"],
    },
  },
  workerQuote: {
    default: [
      "Saya jujur, rajin, dan siap bekerja sepenuh hati untuk keluarga.",
      "Saya mau belajar dan menyesuaikan dengan kebiasaan keluarga.",
    ],
    byCategory: {
      ART: [
        "Saya terbiasa bekerja rapi dan cekatan. Rumah bersih, keluarga nyaman.",
        "Saya senang memasak dan menjaga rumah tetap bersih setiap hari.",
      ],
      ART_MOMONG: ["Saya sayang anak dan terbiasa mengurus rumah sekaligus momong."],
      BABYSITTER: [
        "Saya sabar dan telaten. Anak Bapak/Ibu saya jaga seperti keluarga.",
        "Saya senang bermain dan mendampingi anak belajar setiap hari.",
      ],
      SUSTER_LANSIA: [
        "Saya sabar membantu lansia makan, mandi, dan minum obat tepat waktu.",
        "Merawat lansia bagi saya ibadah. Saya tulus dan telaten.",
      ],
      SUSTER_PASIEN: ["Saya terbiasa merawat pasien dengan sabar, bersih, dan teliti."],
      INFAL: ["Saya siap membantu sementara, bisa langsung kerja & cepat beradaptasi."],
    },
  },
  specialty: {
    default: ["{kategori} • {keahlian1}", "{kategori} {keahlian1} & {keahlian2}"],
    byCategory: {
      ART: ["ART Bersih Rumah & Masak"],
      ART_MOMONG: ["ART Momong Anak"],
      BABYSITTER: ["Babysitter Bayi & Balita"],
      SUSTER_LANSIA: ["Pendamping Lansia"],
      SUSTER_PASIEN: ["Perawat Pasien di Rumah"],
      INFAL: ["Infal / Pengganti"],
    },
  },
  liveInStatus: { default: ["Siap menginap", "Bisa pulang-pergi (PP)", "Menginap / PP, fleksibel"], byCategory: {} },
  availability: {
    default: ["Siap mulai minggu ini", "Siap interview & mulai segera", "Bisa langsung kerja", "Siap mulai bulan depan"],
    byCategory: {},
  },
  trainingStatus: {
    default: ["Lulusan LPK Mami Berlian", "Terlatih & bersertifikat", "Sudah ikut pelatihan"],
    byCategory: {},
  },
  documentStatus: {
    default: ["Dokumen terverifikasi", "KTP & KK lengkap", "Dokumen lengkap"],
    byCategory: {},
  },
};

const presetList = z.array(z.string().trim().min(1).max(160)).max(20);
const fieldPresetsSchema = z.object({ default: presetList, byCategory: z.record(z.string().min(1).max(60), presetList) });
export const copyPresetsSchema = z.object({
  publicTitle: fieldPresetsSchema,
  workerQuote: fieldPresetsSchema,
  specialty: fieldPresetsSchema,
  liveInStatus: fieldPresetsSchema,
  availability: fieldPresetsSchema,
  trainingStatus: fieldPresetsSchema,
  documentStatus: fieldPresetsSchema,
});

/** Gabungkan nilai tersimpan dengan default; field yang tidak valid memakai default. */
export function normalizeCopyPresets(stored: unknown): CopyPresets {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(
    COPY_FIELDS.map(({ key }) => {
      const parsed = fieldPresetsSchema.safeParse(source[key]);
      return [key, parsed.success ? parsed.data : COPY_PRESETS_DEFAULTS[key]];
    }),
  ) as CopyPresets;
}

export type CopyContext = {
  categoryCode: string;
  categoryName: string;
  experienceName: string;
  skillNames: string[];
  firstName: string;
};

function fill(template: string, tokens: Record<string, string>) {
  let unresolved = false;
  const text = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = tokens[name]?.trim() ?? "";
    if (!value) unresolved = true;
    return value;
  });
  return unresolved ? null : text.replace(/\s+/g, " ").trim();
}

/** Rekomendasi siap pakai untuk satu field: spesifik kategori dulu, lalu umum; tanpa duplikat dan muat batas karakter. */
export function buildCopySuggestions(presets: CopyPresets, field: CopyFieldKey, context: CopyContext, limit = 5) {
  const maxLength = COPY_FIELDS.find((item) => item.key === field)?.maxLength ?? 120;
  const tokens = {
    kategori: context.categoryName,
    pengalaman: context.experienceName,
    keahlian1: context.skillNames[0] ?? "",
    keahlian2: context.skillNames[1] ?? "",
    nama: context.firstName,
  };
  const templates = [...(presets[field].byCategory[context.categoryCode] ?? []), ...presets[field].default];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const template of templates) {
    const text = fill(template, tokens);
    if (!text || text.length > maxLength) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}
