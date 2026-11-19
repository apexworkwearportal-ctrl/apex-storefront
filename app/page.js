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
  // 1. Check if admin configured custom homepage featured products
  if (adminDb) {
    try {
      const featDoc = await adminDb.collection("settings").doc("homepageFeatured").get();
      if (featDoc.exists && Array.isArray(featDoc.data()?.items) && featDoc.data().items.length > 0) {
        return featDoc.data().items;
      }
    } catch (e) {
      console.warn("Could not load homepageFeatured settings:", e);
    }
  }

  let allProducts = [];
  let globalSaleDiscount = null;
  if (adminDb) {
    try {
      const [prodSnap, apparelSnap, pricingSnap] = await Promise.all([
        adminDb.collection("products").get(),
        adminDb.collection("apparel_products").get().catch(() => ({ forEach: () => {} })),
        adminDb.collection("settings").doc("pricing").get().catch(() => null)
      ]);

      if (pricingSnap && pricingSnap.exists) {
        const gDiscount = parseFloat(pricingSnap.data()?.saleDiscountPercent);
        if (!isNaN(gDiscount) && gDiscount > 0 && gDiscount < 100) {
          globalSaleDiscount = gDiscount;
        }
      }
      
      prodSnap.forEach(doc => {
        const data = doc.data();
        if (data.isVisible !== false) {
          allProducts.push({ id: doc.id, isApparel: false, ...data });
        }
      });

      apparelSnap.forEach(doc => {
        const data = doc.data();
        if (data.isVisible !== false) {
          allProducts.push({ 
            id: doc.id, 
            isApparel: true, 
            ...data,
            image: (data.images && data.images[0]) || data.garmentViews?.front?.image || data.imageUrl
          });
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
  const addedProductIds = new Set();

  targetCategories.forEach((cat, index) => {
    const catIdStr = String(cat.id || "").toLowerCase();
    const catNameStr = String(cat.name || "").toLowerCase();

    // Find products matching this category
    const matchingProducts = allProducts.filter(p => {
      if (addedProductIds.has(p.id)) return false;
      const pCatId = String(p.categoryId || p.category || "").toLowerCase();
      const pCatName = String(p.categoryName || "").toLowerCase();
      return pCatId === catIdStr || 
             pCatName === catNameStr || 
             (pCatId && catIdStr && (pCatId.includes(catIdStr) || catIdStr.includes(pCatId))) ||
             (catNameStr && (pCatId.includes(catNameStr) || (p.category && String(p.category).toLowerCase().includes(catNameStr))));
    });

    if (matchingProducts.length > 0) {
      const selected = matchingProducts.find(p => p.badge || p.isFeatured || p.isBestSeller) || matchingProducts[0];
      addedProductIds.add(selected.id);
      
      const rawPrice = parseFloat(selected.pricing?.startingPriceOverride || selected.pricing?.startingPrice || selected.basePrice || selected.price || 0);
      const prodDiscount = parseFloat(selected.saleDiscountPercent ?? selected.pricing?.saleDiscountPercent);
      const effectiveDiscount = (!isNaN(prodDiscount) && prodDiscount > 0 && prodDiscount < 100) ? prodDiscount : globalSaleDiscount;
      const hasSale = !isNaN(effectiveDiscount) && effectiveDiscount > 0 && effectiveDiscount < 100;
      const salePrice = (rawPrice > 0 && selected.pricing?.salePrice !== undefined && selected.pricing?.salePrice !== null && parseFloat(selected.pricing.salePrice) < rawPrice)
        ? parseFloat(selected.pricing.salePrice)
        : (rawPrice > 0 && hasSale)
          ? Math.round(rawPrice * (1 - effectiveDiscount / 100) * 100) / 100
          : null;

      const priceDisplay = rawPrice > 0 ? `$${rawPrice.toFixed(2)}` : "";

      featured.push({
        id: selected.id,
        name: selected.name || selected.title || cat.name,
        category: cat.name,
        categoryId: cat.id,
        price: priceDisplay,
        salePrice: salePrice !== null ? `$${salePrice.toFixed(2)}` : null,
        saleDiscountPercent: hasSale ? effectiveDiscount : null,
        image: selected.image || (selected.images && selected.images[0]) || selected.heroImage || cat.heroImage || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
        badge: selected.badge || badgesList[index % badgesList.length],
        href: selected.isApparel ? `/apparel/${selected.id}` : `/products/${selected.id}`
      });
    }
  });

  // If fewer than 6, fill with top available products
  if (featured.length < 6) {
    for (const p of allProducts) {
      if (featured.length >= 8) break;
      if (!addedProductIds.has(p.id)) {
        addedProductIds.add(p.id);
        const rawPrice = parseFloat(p.pricing?.startingPriceOverride || p.pricing?.startingPrice || p.basePrice || p.price || 0);
        const prodDiscount = parseFloat(p.saleDiscountPercent ?? p.pricing?.saleDiscountPercent);
        const effectiveDiscount = (!isNaN(prodDiscount) && prodDiscount > 0 && prodDiscount < 100) ? prodDiscount : globalSaleDiscount;
        const hasSale = !isNaN(effectiveDiscount) && effectiveDiscount > 0 && effectiveDiscount < 100;
        const salePrice = (rawPrice > 0 && p.pricing?.salePrice !== undefined && p.pricing?.salePrice !== null && parseFloat(p.pricing.salePrice) < rawPrice)
          ? parseFloat(p.pricing.salePrice)
          : (rawPrice > 0 && hasSale)
            ? Math.round(rawPrice * (1 - effectiveDiscount / 100) * 100) / 100
            : null;

        featured.push({
          id: p.id,
          name: p.name || p.title || "Custom Product",
          category: p.categoryName || p.category || "Commercial Print",
          categoryId: p.categoryId || "",
          price: rawPrice > 0 ? `$${rawPrice.toFixed(2)}` : "",
          salePrice: salePrice !== null ? `$${salePrice.toFixed(2)}` : null,
          saleDiscountPercent: hasSale ? effectiveDiscount : null,
          image: p.image || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
          badge: badgesList[featured.length % badgesList.length],
          href: p.isApparel ? `/apparel/${p.id}` : `/products/${p.id}`
        });
      }
    }
  }

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
