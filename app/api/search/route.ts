import { errorResponse, getQlooConfig, jsonResponse, readRequestJson, searchQloo } from "@/lib/qloo";

export async function POST(request: Request) {
  try { return jsonResponse(await searchQloo(await readRequestJson(request), await getQlooConfig())); }
  catch (error) { return errorResponse(error); }
}
