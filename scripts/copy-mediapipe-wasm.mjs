// Menyalin runtime WASM MediaPipe ke public/ agar penghapus latar foto tidak bergantung CDN pihak ketiga.
// Folder diberi versi paket supaya bisa di-cache permanen (immutable) oleh browser.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = join(root, "node_modules", "@mediapipe", "tasks-vision");
if (!existsSync(packageDir)) {
  console.warn("[mediapipe] @mediapipe/tasks-vision belum terpasang; lewati penyalinan WASM.");
  process.exit(0);
}
const { version } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const target = join(root, "public", "vendor", "mediapipe", version);
mkdirSync(target, { recursive: true });
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];
for (const file of files) copyFileSync(join(packageDir, "wasm", file), join(target, file));
console.log(`[mediapipe] WASM ${version} disalin ke public/vendor/mediapipe/${version}`);
