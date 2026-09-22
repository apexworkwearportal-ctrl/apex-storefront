import { getProductDetails } from "@/lib/sinalite";

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Missing product ID" }, { status: 400 });
  }

  try {
    const details = await getProductDetails(id);
    const options = details[0] || [];

    // Filter out hidden options and group by group name
    const groupedOptions = {};
    for (const opt of options) {
      if (opt.hidden === 0) {
        const groupName = opt.group || "Options";
        if (!groupedOptions[groupName]) {
          groupedOptions[groupName] = [];
        }
        groupedOptions[groupName].push({
          id: opt.id,
          name: opt.name,
        });
      }
    }

    return Response.json({ optionGroups: groupedOptions });
  } catch (error) {
    console.error(`Failed to load options for product ${id}:`, error.message);
    return Response.json({ error: "Failed to load product specifications. Please try again." }, { status: 500 });
  }
}
