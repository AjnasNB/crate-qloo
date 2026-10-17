import { errorResponse, getQlooConfig, getQlooEvidence, jsonResponse, readRequestJson } from "@/lib/qloo";

export async function POST(request: Request) {
  try { return jsonResponse(await getQlooEvidence(await readRequestJson(request), await getQlooConfig())); }
  catch (error) { return errorResponse(error); }
}
