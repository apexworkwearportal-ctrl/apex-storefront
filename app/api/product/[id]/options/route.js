import { getProductDetails } from "@/lib/sinalite";

/** Classify a group name into "quantity" | "turnaround" | "default" */
function classifyGroup(groupName) {
  const lower = groupName.toLowerCase();
  if (lower.includes("qty") || lower.includes("quantity") || lower.includes("copies") || lower.includes("pieces") || lower.includes("units")) {
    return "quantity";
  }
  if (lower.includes("turnaround") || lower.includes("delivery") || lower.includes("rush") || lower.includes("business day") || lower.includes("days")) {
    return "turnaround";
  }
  return "default";
}

/** Parse the leading number from an option name (handles commas like "1,000 copies"). Returns Infinity if none found. */
function parseQtyFromName(name) {
  if (!name) return Infinity;
  const cleaned = name.replace(/,/g, "");
  const match = cleaned.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Missing product ID" }, { status: 400 });
  }

  try {
    const details = await getProductDetails(id);
    const options = details[0] || [];

    // Filter out hidden options and group by group name
    const rawGroups = {};
    for (const opt of options) {
      if (opt.hidden === 0) {
        const groupName = opt.group || "Options";
        if (!rawGroups[groupName]) rawGroups[groupName] = [];
        rawGroups[groupName].push({ id: opt.id, name: opt.name });
      }
    }

    // Build enriched grouped options with sorting and default selection hints
    const groupedOptions = {};
    const defaultSelections = {}; // { [groupName]: optionId } — the "starting from" pre-selection

    for (const [groupName, opts] of Object.entries(rawGroups)) {
      const type = classifyGroup(groupName);
      let sorted = opts;

      if (type === "quantity") {
        // Sort ascending so lowest quantity appears first (cheapest entry point)
        sorted = [...opts].sort((a, b) => parseQtyFromName(a.name) - parseQtyFromName(b.name));
        defaultSelections[groupName] = sorted[0]?.id?.toString();
      } else if (type === "turnaround") {
        // Keep original API order — last item is slowest (cheapest)
        defaultSelections[groupName] = sorted[sorted.length - 1]?.id?.toString();
      } else {
        // Default: first option
        defaultSelections[groupName] = sorted[0]?.id?.toString();
      }

      groupedOptions[groupName] = sorted;
    }

    return Response.json({ optionGroups: groupedOptions, defaultSelections });
  } catch (error) {
    console.error(`Failed to load options for product ${id}:`, error.message);
    return Response.json({ error: "Failed to load product specifications. Please try again." }, { status: 500 });
  }
}
