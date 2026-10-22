export type DownloadFormat = "csv" | "json";

// Inventory is limited to 18 titles; keep inline downloads comfortably bounded.
export const MAX_DOWNLOAD_BYTES = 256 * 1024;

/** Encode downloadable text without browser Blob URLs or Node-only dependencies. */
export function downloadDataUrl(text: string | null, format: DownloadFormat): string | undefined {
  if (text === null || text.length > MAX_DOWNLOAD_BYTES) return undefined;
  const content = format === "csv" ? "\uFEFF" + text.replace(/^\uFEFF+/, "") : text;
  const bytes = new TextEncoder().encode(content);
  if (bytes.length > MAX_DOWNLOAD_BYTES) return undefined;
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  const type = format === "csv" ? "text/csv" : "application/json";
  return `data:${type};charset=utf-8;base64,${btoa(chunks.join(""))}`;
}
