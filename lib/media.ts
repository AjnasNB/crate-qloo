import release from "../film/release-media.json" with { type: "json" };

const DEMO_PATH = "/media/crate-live-demo.mp4";
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;
const OUTPUT_CHUNK_BYTES = 64 * 1024;
type ByteRange = { start: number; end: number };

// null means ignore an unsupported/invalid range; false means unsatisfiable.
export function parseMediaRange(header: string, size: number): ByteRange | false | null {
  if (header.length > 512) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const total = BigInt(size);
  if (!match[1]) {
    const suffix = BigInt(match[2]);
    if (suffix === BigInt(0) || size === 0) return false;
    return { start: Number(suffix >= total ? BigInt(0) : total - suffix), end: size - 1 };
  }
  const start = BigInt(match[1]);
  const end = match[2] ? BigInt(match[2]) : total - BigInt(1);
  if (match[2] && end < start) return null;
  if (start >= total) return false;
  return { start: Number(start), end: Number(end >= total ? total - BigInt(1) : end) };
}

function strongIfRangeMatches(value: string | null, etag: string | null): boolean {
  if (value === null) return true;
  // Weak tags and dates without proof of a strong Last-Modified validator
  // conservatively receive the full current representation.
  return /^"[\x21\x23-\x7e\x80-\xff]*"$/.test(value) && value === etag;
}

function sliceStream(body: ReadableStream<Uint8Array>, start: number, length: number) {
  const reader = body.getReader();
  let skipped = 0;
  let remaining = length;
  let pending: Uint8Array | undefined;
  let pendingOffset = 0;
  let cancellation: Promise<void> | undefined;
  const cancelSource = (reason?: unknown) => cancellation ??= reader.cancel(reason);

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!pending) {
          const { value, done } = await reader.read();
          if (done) throw new Error("Media stream ended before the requested range.");
          const skip = Math.min(value.byteLength, start - skipped);
          skipped += skip;
          if (skip === value.byteLength) continue;
          pending = value;
          pendingOffset = skip;
        }
        const count = Math.min(remaining, pending.byteLength - pendingOffset, OUTPUT_CHUNK_BYTES);
        controller.enqueue(pending.subarray(pendingOffset, pendingOffset + count));
        pendingOffset += count;
        remaining -= count;
        if (pendingOffset === pending.byteLength) pending = undefined;
        if (remaining === 0) {
          pending = undefined;
          controller.close();
          await cancelSource();
        }
      } catch (error) {
        controller.error(error);
        await cancelSource(error).catch(() => {});
      }
    },
    cancel(reason) {
      pending = undefined;
      return cancelSource(reason);
    },
  }, { highWaterMark: 0 });
}

export async function serveDemoMedia(
  request: Request,
  assets: Pick<Fetcher, "fetch">,
  ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== DEMO_PATH || !["GET", "HEAD"].includes(request.method)) return null;
  let assetRequest = request;
  if (request.method === "HEAD") {
    const headers = new Headers(request.headers);
    headers.delete("Range");
    headers.delete("If-Range");
    assetRequest = new Request(request.url, { method: "HEAD", headers });
  }
  // Current ASSETS returns a full stream. Preserve native partial/conditional
  // responses if the binding gains range support; never fetch or tee twice.
  const response = await assets.fetch(assetRequest);
  if (request.method === "HEAD" || response.status !== 200 || !response.body) return response;
  const header = request.headers.get("Range");
  if (!header || !strongIfRangeMatches(request.headers.get("If-Range"), response.headers.get("ETag"))) return response;
  if (response.headers.has("Content-Encoding") && response.headers.get("Content-Encoding") !== "identity") return response;
  // Binding streams may omit Content-Length before HTTP serialization. The
  // build verifies this exact asset's release size and SHA before publishing.
  const rawSize = response.headers.get("Content-Length");
  const size = rawSize === null ? release.bytes : /^\d+$/.test(rawSize) ? Number(rawSize) : NaN;
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_MEDIA_BYTES) return response;
  const range = parseMediaRange(header, size);
  if (range === null) return response;
  const headers = new Headers(response.headers);
  headers.set("Accept-Ranges", "bytes");
  if (range === false) {
    ctx.waitUntil(response.body.cancel().catch(() => {}));
    headers.set("Content-Range", `bytes */${size}`);
    headers.delete("Content-Length");
    return new Response(null, { status: 416, headers });
  }
  const length = range.end - range.start + 1;
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(length));
  // Workers derives Content-Length from this stream, ignoring a manual header
  // on an ordinary ReadableStream. pipeTo propagates client cancellation.
  const fixed = new FixedLengthStream(length);
  ctx.waitUntil(sliceStream(response.body, range.start, length).pipeTo(fixed.writable).catch(() => {}));
  return new Response(fixed.readable, { status: 206, headers });
}
