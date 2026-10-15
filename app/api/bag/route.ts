import { handleBagRequest } from "@/src/bag/contract.server";

export async function GET(request: Request): Promise<Response> {
  return handleBagRequest(request, "read");
}
