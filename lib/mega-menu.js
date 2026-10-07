import {
  Shirt,
  CreditCard,
  FileText,
  Flag,
  Box,
  Layers,
  Gift,
  Sparkles,
  Tag,
  Package,
  Shield,
  ShoppingBag,
  Printer,
  Sliders,
  Folder
} from "lucide-react";

export const ICON_MAP = {
  Shirt,
  CreditCard,
  FileText,
  Flag,
  Box,
  Layers,
  Gift,
  Sparkles,
  Tag,
  Package,
  Shield,
  ShoppingBag,
  Printer,
  Sliders,
  Folder
};

export const AVAILABLE_ICONS = [
  { id: "Shirt", label: "Shirt / Apparel", icon: Shirt },
  { id: "CreditCard", label: "Card / Business Cards", icon: CreditCard },
  { id: "FileText", label: "Document / Marketing", icon: FileText },
  { id: "Flag", label: "Flag / Signs & Banners", icon: Flag },
  { id: "Layers", label: "Layers / Decals & Graphics", icon: Layers },
  { id: "Box", label: "Box / Packaging", icon: Box },
  { id: "Gift", label: "Gift / Invitations & Promos", icon: Gift },
  { id: "Sparkles", label: "Sparkles / Quick Turnaround", icon: Sparkles },
  { id: "Tag", label: "Tag / Deals", icon: Tag },
  { id: "Package", label: "Package", icon: Package },
  { id: "Printer", label: "Printer", icon: Printer },
  { id: "Folder", label: "Folder", icon: Folder }
];

export function getMegaMenuIcon(iconName) {
  if (!iconName) return Folder;
  if (typeof iconName !== "string") return iconName;
  return ICON_MAP[iconName] || Folder;
}

// Built-in default Mega Menu aligned with real Firestore categories
export const DEFAULT_MEGA_MENU = [
  {
    id: "apparel-promotional-wear",
    name: "Custom Apparel",
    badge: "HOT",
    iconName: "Shirt",
    href: "/products?category=apparel-promotional-wear",
    enabled: true,
    subcategories: [
      { name: "T-Shirts (DTG & Screen Print)", href: "/products?category=sub-t-shirts", desc: "Short sleeve, long sleeve, performance tees" },
      { name: "Hoodies & Sweatshirts", href: "/products?category=sub-hoodies-sweatshirts", desc: "Fleece pullover & zip-up hoodies" },
      { name: "Hats & Headwear", href: "/products?category=sub-headwear", desc: "Snapbacks, beanies, embroidered caps" },
      { name: "Embroidered Workwear", href: "/products?category=sub-embroidered-apparel", desc: "Corporate polos, outerwear & uniforms" }
    ],
    spotlight: {
      title: "Apparel Designer & Mockup Builder",
      desc: "Upload your business logo and see real-time garment mockups with instant pricing.",
      cta: "Build Custom Apparel",
      href: "/products?category=apparel-promotional-wear",
      bgGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      accentColor: "#f97316"
    }
  },
  {
    id: "business-cards-stationery",
    name: "Business Cards",
    badge: "POPULAR",
    iconName: "CreditCard",
    href: "/products?category=business-cards-stationery",
    enabled: true,
    subcategories: [
      { name: "Standard Business Cards", href: "/products?category=sub-business-cards", desc: "14pt & 16pt matte, gloss & soft-touch cardstock" },
      { name: "Specialty Business Cards", href: "/products?category=specialty-business-cards", desc: "Foil, Spot UV gloss, painted edges & kraft" },
      { name: "Folded Business Cards", href: "/products?category=folded-business-cards", desc: "Mini brochures, loyalty cards & appointment cards" },
      { name: "Letterhead & Envelopes", href: "/products?category=sub-letterhead-envelopes", desc: "Matched corporate stationery sets" },
      { name: "NCR Forms & Notepads", href: "/products?category=sub-forms-notepads", desc: "Carbonless invoices, receipts & branded notepads" },
      { name: "Presentation Folders", href: "/products?category=sub-presentation-folders", desc: "Custom branded pocket presentation folders" }
    ],
    spotlight: {
      title: "Premium Soft-Touch Cards",
      desc: "Make an unforgettably tactile impression with 16pt velvet touch finish.",
      cta: "Explore Business Cards",
      href: "/products?category=sub-business-cards",
      bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      accentColor: "#38bdf8"
    }
  },
  {
    id: "marketing-direct-mail",
    name: "Marketing & Direct Mail",
    iconName: "FileText",
    href: "/products?category=marketing-direct-mail",
    enabled: true,
    subcategories: [
      { name: "Flyers & Leaflets", href: "/products?category=flyers", desc: "Full-colour marketing & sales distribution flyers" },
      { name: "Brochures & Catalogs", href: "/products?category=brochures", desc: "Tri-fold, z-fold & bi-fold marketing booklets" },
      { name: "Direct Mail Postcards", href: "/products?category=sub-postcards", desc: "4x6, 5x7 & 6x9 direct mail and promo cards" },
      { name: "Booklets & Multi-Page", href: "/products?category=booklets", desc: "Saddle-stitched corporate booklets & magazines" },
      { name: "Door Hangers & Tear Cards", href: "/products?category=sub-door-to-door-handouts", desc: "Local neighbourhood canvassing handouts" },
      { name: "Bookmarks", href: "/products?category=bookmarks", desc: "Custom printed heavy cardstock bookmarks" }
    ],
    spotlight: {
      title: "Same-Day Flyers & Brochures",
      desc: "High volume promotional prints delivered with crisp full-color offset quality.",
      cta: "View Marketing Prints",
      href: "/products?category=sub-flyers-brochures",
      bgGradient: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
      accentColor: "#818cf8"
    }
  },
  {
    id: "signs-banners",
    name: "Signs & Banners",
    iconName: "Flag",
    href: "/products?category=signs-banners",
    enabled: true,
    subcategories: [
      { name: "Vinyl Banners & Banner Stands", href: "/products?category=sub-banners-banner-stands", desc: "13oz outdoor heavy duty vinyl & pull-up banners" },
      { name: "Yard & Coroplast Signs", href: "/products?category=sub-yard-lawn-signs", desc: "Weatherproof lawn signs with wire H-stakes" },
      { name: "Sidewalk A-Frame Signs", href: "/products?category=sub-sidewalk-a-frame-signs", desc: "Sandwich board signage for storefronts & sidewalks" },
      { name: "Rigid Aluminum & Board Signs", href: "/products?category=sub-rigid-permanent-signage", desc: "Aluminum, styrene, foam board & Sintra signs" },
      { name: "Large Format Posters", href: "/products?category=sub-posters-large-format-prints", desc: "High resolution event & retail posters" },
      { name: "POP Displays & Table Covers", href: "/products?category=sub-point-of-purchase-displays", desc: "Trade show display boards & branded table covers" }
    ],
    spotlight: {
      title: "Tradeshow Pull-Up Banners",
      desc: "Portable display banners ready to set up in under 30 seconds with carrying case.",
      cta: "Shop Banners & Signs",
      href: "/products?category=sub-banners-banner-stands",
      bgGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      accentColor: "#34d399"
    }
  },
  {
    id: "vinyl-decals-graphics",
    name: "Vinyl & Decals",
    iconName: "Layers",
    href: "/products?category=vinyl-decals-graphics",
    enabled: true,
    subcategories: [
      { name: "Wall & Window Graphics", href: "/products?category=sub-wall-window-graphics", desc: "Adhesive vinyl, wall murals & window decals" },
      { name: "Car & Vehicle Magnets", href: "/products?category=sub-vehicle-promotional-magnets", desc: "Heavy-duty magnetic signs for commercial vehicles" },
      { name: "Static Window Clings", href: "/products?category=sub-static-clings", desc: "Residue-free static and adhesive window clings" },
      { name: "Floor Graphics", href: "/products?category=sub-floor-graphics", desc: "Slip-resistant floor decals for wayfinding & retail" }
    ],
    spotlight: {
      title: "Storefront Window Graphics",
      desc: "Turn your retail windows and vehicles into high-impact marketing surfaces.",
      cta: "Explore Decals & Graphics",
      href: "/products?category=vinyl-decals-graphics",
      bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      accentColor: "#38bdf8"
    }
  },
  {
    id: "labels-packaging",
    name: "Labels & Packaging",
    iconName: "Box",
    href: "/products?category=labels-packaging",
    enabled: true,
    subcategories: [
      { name: "Roll Labels / Stickers", href: "/products?category=sub-labels-stickers", desc: "Custom roll labels for bottling, jars & packaging" },
      { name: "Custom Pouches & Boxes", href: "/products?category=sub-packaging", desc: "Branded shipping boxes & stand-up pouch packaging" }
    ],
    spotlight: {
      title: "Custom Roll Labels",
      desc: "Waterproof, oil-resistant product labels printed with vibrant die-cut shapes.",
      cta: "Explore Packaging",
      href: "/products?category=labels-packaging",
      bgGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
      accentColor: "#fbbf24"
    }
  },
  {
    id: "cards-invitations-calendars",
    name: "Cards & Calendars",
    iconName: "Gift",
    href: "/products?category=cards-invitations-calendars",
    enabled: true,
    subcategories: [
      { name: "Greeting Cards & Invitations", href: "/products?category=sub-greeting-cards-invitations", desc: "Corporate mailings, event invites & announcement cards" },
      { name: "Wall Calendars & Specialty", href: "/products?category=sub-calendars-specialty-prints", desc: "Custom wall calendars, canvas & digital sheets" },
      { name: "Tent Cards & Table Displays", href: "/products?category=sub-event-table-cards", desc: "Table tent cards for restaurants, events & counters" }
    ],
    spotlight: {
      title: "Custom Wall Calendars",
      desc: "Branded 12-month calendars keeping your business top of mind all year round.",
      cta: "Explore Cards & Calendars",
      href: "/products?category=cards-invitations-calendars",
      bgGradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
      accentColor: "#f472b6"
    }
  }
];

// Helper to auto-generate a fresh mega menu tree directly from raw Firestore categories
export function buildMegaMenuFromCategories(categories) {
  if (!categories || categories.length === 0) return DEFAULT_MEGA_MENU;

  const rootCategories = categories
    .filter(c => !c.parentId && c.isVisible !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return rootCategories.map((root) => {
    // Find Level 2 subcategories
    const subs = categories
      .filter(c => c.parentId === root.id && c.isVisible !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Choose default icon name
    let iconName = "Folder";
    const idLower = root.id.toLowerCase();
    if (idLower.includes("apparel") || idLower.includes("tshirt") || idLower.includes("hoodie")) iconName = "Shirt";
    else if (idLower.includes("card") || idLower.includes("stationery")) iconName = "CreditCard";
    else if (idLower.includes("marketing") || idLower.includes("flyer") || idLower.includes("mail")) iconName = "FileText";
    else if (idLower.includes("sign") || idLower.includes("banner")) iconName = "Flag";
    else if (idLower.includes("vinyl") || idLower.includes("decal")) iconName = "Layers";
    else if (idLower.includes("label") || idLower.includes("pack")) iconName = "Box";
    else if (idLower.includes("invit") || idLower.includes("calendar")) iconName = "Gift";

    const subcategoriesList = [];

    subs.forEach((sub) => {
      // Find Level 3 leaf items
      const leafs = categories
        .filter(c => c.parentId === sub.id && c.isVisible !== false)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      if (leafs.length > 0) {
        // Add level 2 container or top level 3 items
        subcategoriesList.push({
          name: sub.name,
          href: `/products?category=${sub.id}`,
          desc: sub.description || `Explore ${sub.name}`
        });
        leafs.slice(0, 3).forEach(leaf => {
          subcategoriesList.push({
            name: leaf.name,
            href: `/products?category=${leaf.id}`,
            desc: leaf.description || `${leaf.name} printing options`
          });
        });
      } else {
        subcategoriesList.push({
          name: sub.name,
          href: `/products?category=${sub.id}`,
          desc: sub.description || `Custom ${sub.name}`
        });
      }
    });

    return {
      id: root.id,
      name: root.name,
      badge: root.id === "apparel-promotional-wear" ? "HOT" : (root.id === "business-cards-stationery" ? "POPULAR" : ""),
      iconName,
      href: `/products?category=${root.id}`,
      enabled: true,
      subcategories: subcategoriesList.slice(0, 8),
      spotlight: {
        title: `Explore ${root.name}`,
        desc: root.description || "High-quality custom printing with wholesale GTA pricing.",
        cta: `Shop ${root.name.split(" ")[0]}`,
        href: `/products?category=${root.id}`,
        bgGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        accentColor: "#f97316"
      }
    };
  });
}
