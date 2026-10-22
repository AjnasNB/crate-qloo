import { handleMcpRequest } from "@/lib/mcp";

/** Canonical Streamable HTTP endpoint for external MCP clients. */
export async function POST(request: Request) { return handleMcpRequest(request); }
export async function GET(request: Request) { return handleMcpRequest(request); }
export async function DELETE(request: Request) { return handleMcpRequest(request); }
