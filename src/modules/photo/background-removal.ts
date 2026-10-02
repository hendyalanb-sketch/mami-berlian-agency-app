/**
 * Penghapus latar foto di browser (MediaPipe Image Segmenter, Apache-2.0).
 * Foto diproses di perangkat user dan tidak dikirim ke layanan pihak ketiga.
 * Hanya file runtime WASM (self-hosted di /vendor) dan model (CDN Google) yang diunduh, sekali lalu di-cache browser.
 */
import type { ImageSegmenter } from "@mediapipe/tasks-vision";
import { assessCutout, personAlphaFromBackground, type CutoutAssessment } from "./background-mask";
import { canvasToBlob, renderToCanvas } from "./client-image";

/** Harus sama dengan versi @mediapipe/tasks-vision di package.json (dicek oleh test). */
export const MEDIAPIPE_VERSION = "1.0.1";
export const MEDIAPIPE_WASM_PATH = `/vendor/mediapipe/${MEDIAPIPE_VERSION}`;
/** Model multiclass (latar, rambut, kulit, baju, …): tepi telinga & rambut jauh lebih rapi dibanding model selfie biasa. */
export const SEGMENTER_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite";
/** Sisi terpanjang hasil PNG transparan; cukup tajam untuk Canva, tetap di bawah batas upload 5 MB. */
export const CUTOUT_MAX_DIMENSION = 1400;

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/** Memuat segmenter sekali per tab; gagal muat (mis. offline) boleh dicoba ulang. */
export function loadSegmenter() {
  segmenterPromise ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  })().catch((error: unknown) => {
    segmenterPromise = null;
    throw error;
  });
  return segmenterPromise;
}

export type CutoutResult = { blob: Blob; width: number; height: number; assessment: CutoutAssessment };

/** Menghasilkan PNG transparan berisi orang di foto. Rotasi diterapkan lebih dulu agar hasil sama dengan pratinjau. */
export async function removeBackground(file: Blob, options?: { rotation?: number }): Promise<CutoutResult> {
  const [segmenter, canvas] = await Promise.all([loadSegmenter(), renderToCanvas(file, { maxDimension: CUTOUT_MAX_DIMENSION, rotation: options?.rotation })]);
  let background: Float32Array | null = null;
  let maskWidth = 0;
  let maskHeight = 0;
  segmenter.segment(canvas, (result) => {
    // Mask hanya valid di dalam callback; salin sebelum dilepas. Index 0 = kelas "background".
    const mask = result.confidenceMasks?.[0];
    if (!mask) return;
    background = new Float32Array(mask.getAsFloat32Array());
    maskWidth = mask.width;
    maskHeight = mask.height;
  });
  if (!background || maskWidth !== canvas.width || maskHeight !== canvas.height) throw new Error("SEGMENTATION_FAILED");

  const alpha = personAlphaFromBackground(background, canvas.width, canvas.height);
  const assessment = assessCutout(alpha);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < alpha.length; i += 1) pixels.data[i * 4 + 3] = alpha[i];
  context.putImageData(pixels, 0, 0);
  const blob = await canvasToBlob(canvas, "image/png");
  return { blob, width: canvas.width, height: canvas.height, assessment };
}
