import { fileURLToPath } from "node:url";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");

// Run the installed Vite CLI in-process so signals retain the preview owner's PID.
// The Vite config selects Vinext and the Cloudflare runtime on every platform.
const cli = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command, ...args];
await import(cli.href);
