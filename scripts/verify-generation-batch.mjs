import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

function browser(...args) {
  const output = execFileSync("npx", ["--yes", "agent-browser", ...args], { encoding: "utf8", timeout: 90000 });
  return output.trim();
}
function evaluate(expression) {
  const output = JSON.parse(browser("--json", "eval", expression));
  if (!output.success) throw new Error(JSON.stringify(output));
  return output.data?.result ?? output.data;
}
async function until(test) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (test()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Browser condition did not complete");
}
for (let attempt = 0; attempt < 60; attempt++) {
  try { if ((await fetch("http://localhost:3000/api/health")).status < 600) break; } catch {}
  if (attempt === 59) { console.error(readFileSync("/tmp/mba-next-dev.log", "utf8")); throw new Error("Dev server did not start"); }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
mkdirSync("artifacts", { recursive: true });
try {
  for (const width of [360, 390, 412]) {
    browser("set", "viewport", String(width), "840");
    browser("open", "http://localhost:3000/dev/ui/batch");
    browser("snapshot", "-i");
    await until(() => evaluate('document.querySelectorAll("input[type=checkbox]").length === 5'));
    assert.equal(evaluate('Array.from(document.querySelectorAll("input[type=checkbox]")).every((item) => item.checked)'), true);
    assert.equal(evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `Overflow at ${width}`);
    evaluate(`(() => {
      window.batchCalls = []; window.batchRetry = false;
      const codes = ["MB-01A", "MB-01B", "MB-02A", "MB-02B", "MB-NEW"];
      window.fetch = async (url, init = {}) => {
        const body = init.body ? JSON.parse(init.body) : {};
        window.batchCalls.push({ url: String(url), body });
        if (String(url).endsWith("/generate")) {
          const index = codes.indexOf(body.templateCode) + 1;
          if (body.templateCode === "MB-01B" && !window.batchRetry) return new Response(JSON.stringify({ error: "CANVA_AUTOFILL_FAILED" }), { status: 422 });
          const jobId = "10000000-0000-4000-8000-00000000000" + index;
          return new Response(JSON.stringify({ jobId, templateCode: body.templateCode, status: body.templateCode === "MB-02A" ? "GENERATING" : "DONE", designUrl: "https://www.canva.com/design/DA" + index + "/edit" }), { status: body.templateCode === "MB-02A" ? 202 : 200 });
        }
        if (String(url).includes("/api/generation/")) return new Response(JSON.stringify({ status: "DONE", designUrl: "https://www.canva.com/design/DA3/edit" }));
        if (String(url).endsWith("/export")) return new Response(JSON.stringify({ export: { webViewLink: "https://drive.google.com/file/d/EXPORTED" } }));
        if (String(url).endsWith("/publish")) return new Response(JSON.stringify({ channel: "INSTAGRAM" }));
        throw new Error("Unexpected request: " + url);
      };
      return true;
    })()`);
    browser("find", "role", "button", "click", "--name", "Buat Semua (5)");
    await until(() => evaluate('document.body.innerText.includes("4 selesai") && document.body.innerText.includes("1 gagal")'));
    const calls = evaluate('window.batchCalls');
    assert.deepEqual(calls.filter((call) => call.url.endsWith("/generate")).map((call) => call.body.templateCode), ["MB-01A", "MB-01B", "MB-02A", "MB-02B", "MB-NEW"]);
    assert.equal(evaluate('document.querySelectorAll("article[aria-label^=Hasil]").length'), 5);
    evaluate('window.batchRetry = true');
    browser("find", "role", "button", "click", "--name", "Coba Lagi yang Gagal (1)");
    await until(() => evaluate('document.body.innerText.includes("5 selesai") && document.body.innerText.includes("0 gagal")'));
    const submitted = evaluate('window.batchCalls.filter((call) => call.url.endsWith("/generate")).map((call) => call.body.templateCode)');
    assert.deepEqual(submitted, ["MB-01A", "MB-01B", "MB-02A", "MB-02B", "MB-NEW", "MB-01B"]);
    browser("find", "role", "button", "click", "--name", "Export PNG MB-NEW");
    await until(() => evaluate('document.body.innerText.includes("Buka PNG MB-NEW di Drive")'));
    assert.equal(evaluate('window.batchCalls.find((call) => call.url.endsWith("/export")).body.jobId'), "10000000-0000-4000-8000-000000000005");
    browser("screenshot", `artifacts/batch-${width}.png`, "--full");
    browser("open", "http://localhost:3000/dev/ui/batch?restored=1");
    await until(() => evaluate('document.querySelector("a[href=\"https://drive.google.com/file/d/RESTORED\"]") !== null'));
    browser("open", "http://localhost:3000/dev/ui/batch?incomplete=1");
    await until(() => evaluate('document.body.innerText.includes("Data pekerja belum lengkap")'));
    assert.equal(evaluate('Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Buat Semua")).disabled'), true);
    console.log(`BATCH_MOBILE_PASS width=${width}: all selected, new template, partial failure, retry only failed, correct export job, restored results, consent gate, no overflow`);
  }
  console.log("BATCH_SCREENSHOT_BASE64=" + readFileSync("artifacts/batch-390.png").toString("base64"));
} finally { browser("close"); }
