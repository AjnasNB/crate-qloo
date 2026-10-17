import { handleMcpRequest } from "@/lib/mcp";

/** Canonical endpoint used by the private App/plugin provisioned by Sites. */
export async function POST(request: Request) { return handleMcpRequest(request); }
export async function GET(request: Request) { return handleMcpRequest(request); }
export async function DELETE(request: Request) { return handleMcpRequest(request); }
