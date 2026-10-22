import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// The public release is immutable by convention; the pinned hash verifies its bytes.
const root = new URL("../", import.meta.url);
const media = JSON.parse(await readFile(new URL("film/release-media.json", root), "utf8"));
const maximum = 24 * 1024 * 1024;
if (!Number.isSafeInteger(media.bytes) || media.bytes < 1 || media.bytes > maximum || !/^[a-f0-9]{64}$/.test(media.sha256)) {
  throw new Error("Invalid film integrity record.");
}
const source = new URL(media.url);
if (source.protocol !== "https:" || source.hostname !== "github.com" || source.username || source.password || source.search || source.hash || !source.pathname.startsWith("/AjnasNB/crate-qloo/releases/download/")) {
  throw new Error("Expected the pinned public Crate release URL.");
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let bytes;
const local = new URL("film/renders/crate-live-demo.mp4", root);
try {
  const info = await stat(local);
  if (info.isFile() && info.size === media.bytes) {
    const candidate = await readFile(local);
    if (digest(candidate) === media.sha256) bytes = candidate;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!bytes) {
  const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.body) throw new Error(`Film download failed (${response.status}).`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > media.bytes || length > maximum) throw new Error("Film download exceeded its pinned size.");
    chunks.push(chunk);
  }
  bytes = Buffer.concat(chunks);
}
if (bytes.length !== media.bytes || digest(bytes) !== media.sha256) throw new Error("Film integrity check failed; no asset was written.");
const target = new URL("public/media/crate-live-demo.mp4", root);
await mkdir(new URL("public/media/", root), { recursive: true });
await writeFile(target, bytes);
console.log(JSON.stringify({ file: fileURLToPath(target), bytes: bytes.length, sha256: media.sha256 }));
