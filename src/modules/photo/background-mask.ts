/**
 * Logika murni untuk mengubah confidence mask segmentasi menjadi alpha channel.
 * Dipisah dari kode browser (MediaPipe/canvas) agar bisa diuji di Node.
 */

/** Ambang lembut: di bawah `low` transparan penuh, di atas `high` solid penuh, di antaranya gradasi halus. */
export const DEFAULT_ALPHA_LOW = 0.3;
export const DEFAULT_ALPHA_HIGH = 0.7;
/** Lubang transparan di dalam badan (mis. motif baju terbaca sebagai latar) yang lebih kecil dari ini ditutup. */
export const DEFAULT_MAX_HOLE_RATIO = 0.005;

function smoothstep(low: number, high: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/**
 * Mengubah confidence "background" (0..1 per piksel) menjadi alpha 0..255 untuk orang di foto.
 * Lubang latar kecil yang tidak menyentuh tepi foto dianggap bagian badan dan diisi.
 */
export function personAlphaFromBackground(
  background: Float32Array,
  width: number,
  height: number,
  options?: { low?: number; high?: number; maxHoleRatio?: number },
) {
  const total = width * height;
  if (background.length !== total) throw new Error("MASK_SIZE_MISMATCH");
  const low = options?.low ?? DEFAULT_ALPHA_LOW;
  const high = options?.high ?? DEFAULT_ALPHA_HIGH;
  const maxHole = Math.floor(total * (options?.maxHoleRatio ?? DEFAULT_MAX_HOLE_RATIO));
  const alpha = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i += 1) alpha[i] = Math.round(smoothstep(low, high, 1 - background[i]) * 255);
  if (maxHole > 0) fillSmallHoles(alpha, width, height, maxHole);
  return alpha;
}

/** Flood fill 4-arah atas piksel transparan (alpha < 128); region tertutup yang kecil dijadikan solid. */
function fillSmallHoles(alpha: Uint8ClampedArray, width: number, height: number, maxHole: number) {
  const visited = new Uint8Array(alpha.length);
  const stack: number[] = [];
  const region: number[] = [];
  for (let start = 0; start < alpha.length; start += 1) {
    if (visited[start] || alpha[start] >= 128) continue;
    visited[start] = 1;
    stack.push(start);
    region.length = 0;
    let touchesEdge = false;
    while (stack.length) {
      const index = stack.pop()!;
      region.push(index);
      const x = index % width;
      const y = (index - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      const visit = (next: number) => {
        if (visited[next] || alpha[next] >= 128) return;
        visited[next] = 1;
        stack.push(next);
      };
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }
    if (!touchesEdge && region.length <= maxHole) for (const index of region) alpha[index] = 255;
  }
}

export type CutoutAssessment = { ok: true; coverage: number } | { ok: false; coverage: number; reason: "NO_PERSON" | "NO_BACKGROUND" };

/** Menilai hasil potongan: terlalu sedikit = orang tidak terdeteksi, hampir penuh = latar tidak terpisah. */
export function assessCutout(alpha: Uint8ClampedArray): CutoutAssessment {
  let solid = 0;
  for (let i = 0; i < alpha.length; i += 1) if (alpha[i] >= 128) solid += 1;
  const coverage = alpha.length ? solid / alpha.length : 0;
  if (coverage < 0.05) return { ok: false, coverage, reason: "NO_PERSON" };
  if (coverage > 0.97) return { ok: false, coverage, reason: "NO_BACKGROUND" };
  return { ok: true, coverage };
}
