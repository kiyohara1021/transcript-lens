import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// The Worker bundle imports `cloudflare:workers`, which only the workerd runtime provides.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { shortCircuit: true, url: "data:text/javascript,export const tracing = undefined;" };
    }
    return nextResolve(specifier, context);
  },
});

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Transcript Lens/);
  assert.match(html, /Stop re-listening/);
  assert.match(html, /Review the disagreement/);
  assert.match(html, /Your review map/);
  assert.match(html, /whisper\.json/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});
