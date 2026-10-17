import { errorResponse, getQlooConfig, jsonResponse, publicConfig } from "@/lib/qloo";

export async function GET() {
  try { return jsonResponse(publicConfig(await getQlooConfig())); }
  catch (error) { return errorResponse(error); }
}
