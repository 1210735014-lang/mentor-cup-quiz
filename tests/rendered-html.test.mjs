import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://mentor-cup.example/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Mentor competition quiz home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>第十届曼托杯隆胸咨询与测量大赛题库<\/title>/);
  assert.match(html, /219/);
  assert.match(html, /选择题型/);
  assert.doesNotMatch(html, /选择专题/);
  assert.doesNotMatch(html, /2(?:<!-- -->)?个术式专题/);
  assert.match(html, /mentor-logo\.png/);
  assert.match(html, /MIT 开源 · 下载网站源码/);
  assert.match(html, /mentor-cup-quiz-source\.zip/);
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^\"]+\/og\.png"/);
  assert.doesNotMatch(html, /codex-preview|loading skeleton|react-loading-skeleton/i);
});

test("includes the complete four-type question bank and brand assets", async () => {
  const source = await readFile(new URL("../app/questions.ts", import.meta.url), "utf8");
  const count = (pattern) => [...source.matchAll(pattern)].length;
  assert.equal(count(/"id": "q\d+"/g), 219);
  assert.equal(count(/"type": "判断题"/g), 37);
  assert.equal(count(/"type": "单选题"/g), 119);
  assert.equal(count(/"type": "多选题"/g), 19);
  assert.equal(count(/"type": "填空题"/g), 44);
  assert.match(source, /"question": "双平面技术的优点不包括？（）"[\s\S]*?"假体异位率较低"/);
  assert.doesNotMatch(source, /假体异味率较低/);
  await access(new URL("../public/mentor-logo.png", import.meta.url));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/mentor-cup-quiz-source.zip", import.meta.url));
});
