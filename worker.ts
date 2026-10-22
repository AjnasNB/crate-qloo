import handler from "vinext/server/fetch-handler";
import { serveDemoMedia } from "./lib/media";
const MCP_DISCOVERY_METHODS = new Set(["server/discover", "tools/list", "ping"]);

function unavailable(status: 429 | 503) {
  const limited = status === 429;
  const code = limited ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE";
  const message = limited
    ? "Too many live Qloo requests. Please retry in 60 seconds."
    : "Live request protection is unavailable. Please retry later.";
  return Response.json({ error: { code, message } }, {
    status,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const media = await serveDemoMedia(request, env.ASSETS, ctx);
    if (media) return media;
    if (request.method === "POST") {
      let pathname = new URL(request.url).pathname;
      try { pathname = decodeURIComponent(pathname); } catch { /* The router owns malformed paths. */ }
      pathname = pathname.replace(/\/+$/, "").toLowerCase();
      let consumesCredential = pathname === "/api/search" || pathname === "/api/evidence";
      if (pathname === "/mcp" || pathname === "/api/mcp") {
        // The native MCP validator checks this protocol/method mirror before any tool call.
        // Legacy POSTs (including handshakes) count because their method is only in the body.
        const nativeDiscovery = request.headers.get("MCP-Protocol-Version") === "2026-07-28"
          && MCP_DISCOVERY_METHODS.has(request.headers.get("Mcp-Method") ?? "");
        consumesCredential = !nativeDiscovery;
      }

      if (consumesCredential) {
        try {
          // Cloudflare supplies this header. Native clients without it share one bounded bucket.
          const client = request.headers.get("CF-Connecting-IP")?.trim().slice(0, 64) || "unknown-client";
          if (!env.QLOO_RATE_LIMITER) return unavailable(503);
          const { success } = await env.QLOO_RATE_LIMITER.limit({ key: `crate:qloo:${client}` });
          if (!success) return unavailable(429);
        } catch {
          return unavailable(503);
        }
      }
    }

    // Vinext owns App Router rendering and route handlers, including /mcp.
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
