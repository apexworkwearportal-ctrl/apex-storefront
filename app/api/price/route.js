import { getPrice } from "@/lib/sinalite";

export async function POST(req) {
  try {
    const { productId, optionIds } = await req.json();

    if (!productId || !optionIds || !Array.isArray(optionIds)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const priceData = await getPrice(productId, optionIds);
    return Response.json(priceData);
  } catch (error) {
    console.error("Live price query failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
