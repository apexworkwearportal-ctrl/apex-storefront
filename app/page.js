import HomeClient from "@/components/HomeClient";
import { adminDb } from "@/lib/firebase-admin";

export const revalidate = 3600; // Revalidate static homepage cache hourly

async function getCategories() {
  const fallbackCategories = [
    { id: "business-cards", name: "Business Cards", description: "Standard, premium, and silk cardstocks with custom coating overlays.", heroImage: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop" },
    { id: "gloss-flyers", name: "Gloss Flyers", description: "Vibrant full-color promotional flyers on lightweight gloss paper.", heroImage: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?q=80&w=600&auto=format&fit=crop" },
    { id: "premium-brochures", name: "Premium Brochures", description: "Bi-fold, tri-fold, and custom folding layouts for marketing campaigns.", heroImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop" },
    { id: "apparel", name: "Custom Apparel", description: "High quality corporate workwear, embroidered hoodies, and safety gear.", heroImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop" },
    { id: "ncr-forms", name: "NCR Forms", description: "Carbonless invoice and receipt books for business operations.", heroImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop" },
    { id: "coroplast-yard-signs", name: "Coroplast Yard Signs", description: "Weatherproof fluted plastic signs for real estate and local advertisements.", heroImage: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop" },
    { id: "vinyl-banners", name: "Vinyl Banners", description: "Heavy-duty outdoor banners with grommets for events and trade shows.", heroImage: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=600&auto=format&fit=crop" },
    { id: "labels-stickers", name: "Labels & Stickers", description: "Custom roll labels, product decals, and die-cut branding stickers.", heroImage: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop" }
  ];

  if (!adminDb) {
    return fallbackCategories;
  }

  try {
    const snap = await adminDb.collection("categories").orderBy("displayOrder", "asc").get();
    if (snap.empty) {
      return fallbackCategories;
    }
    const list = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  } catch (error) {
    console.warn("Firestore error fetching categories, serving fallback:", error);
    return fallbackCategories;
  }
}

async function getFeaturedProducts(homeCategories) {
  let allProducts = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection("products").get();
      snap.forEach(doc => {
        const data = doc.data();
        if (data.isVisible !== false) {
          allProducts.push({ id: doc.id, ...data });
        }
      });
    } catch (err) {
      console.warn("Firestore error fetching products for homepage:", err);
    }
  }

  const badgesList = ["Best Seller", "Trending", "Popular", "Top Rated", "Featured", "Hot Pick", "Commercial Choice", "Customer Favorite"];

  // Select up to 8 categories visible on home
  const targetCategories = (homeCategories || []).slice(0, 8);
  const featured = [];

  targetCategories.forEach((cat, index) => {
    const catIdStr = String(cat.id || "").toLowerCase();
    const catNameStr = String(cat.name || "").toLowerCase();

    // Find products matching this category
    const matchingProducts = allProducts.filter(p => {
      const pCatId = String(p.categoryId || p.category || "").toLowerCase();
      const pCatName = String(p.categoryName || "").toLowerCase();
      return pCatId === catIdStr || pCatName === catNameStr || (pCatId && catIdStr && (pCatId.includes(catIdStr) || catIdStr.includes(pCatId)));
    });

    if (matchingProducts.length > 0) {
      // Pick 1 product from this category (prefer one marked as best seller or with badge)
      const selected = matchingProducts.find(p => p.badge || p.isFeatured || p.isBestSeller) || matchingProducts[0];
      
      let priceDisplay = "$14.99";
      if (selected.startingPrice) {
        priceDisplay = `$${selected.startingPrice}`;
      } else if (selected.price) {
        priceDisplay = typeof selected.price === "number" ? `$${selected.price.toFixed(2)}` : String(selected.price);
      }

      featured.push({
        id: selected.id,
        name: selected.name || selected.title || `${cat.name} Spec Pack`,
        category: cat.name,
        categoryId: cat.id,
        price: priceDisplay,
        image: selected.image || (selected.images && selected.images[0]) || selected.heroImage || cat.heroImage || "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop",
        badge: selected.badge || badgesList[index % badgesList.length],
        href: `/products/${selected.id}`
      });
    } else {
      // Fallback 1 dynamic product per visible home category if no product document exists yet in Firestore
      featured.push({
        id: `featured-${cat.id}`,
        name: `16pt Premium ${cat.name}`,
        category: cat.name,
        categoryId: cat.id,
        price: "$19.99",
        image: cat.heroImage || "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop",
        badge: badgesList[index % badgesList.length],
        href: `/products?category=${cat.id}`
      });
    }
  });

  return featured;
}

export default async function Home() {
  const categories = await getCategories();
  
  // Filter categories to show on home and sort by home page display order
  const homeCategories = categories
    .filter(cat => cat.showOnHome !== false)
    .sort((a, b) => {
      const orderA = a.homeOrder !== undefined ? parseInt(a.homeOrder) : (a.displayOrder || 0);
      const orderB = b.homeOrder !== undefined ? parseInt(b.homeOrder) : (b.displayOrder || 0);
      return orderA - orderB;
    });

  const featuredProducts = await getFeaturedProducts(homeCategories);

  return <HomeClient categories={homeCategories} featuredProducts={featuredProducts} />;
}
