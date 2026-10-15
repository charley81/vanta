import { handleBagRequest } from "@/src/bag/contract.server";

export async function POST(request: Request): Promise<Response> {
  return handleBagRequest(request, "add");
}
