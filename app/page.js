import HomeClient from "@/components/HomeClient";
import { adminDb } from "@/lib/firebase-admin";

export const revalidate = 3600; // Revalidate static homepage cache hourly

async function getCategories() {
  const fallbackCategories = [
    { id: "business-cards", name: "Business Cards", description: "Standard, premium, and silk cardstocks with custom coating overlays.", heroImage: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop" },
    { id: "gloss-flyers", name: "Gloss Flyers", description: "Vibrant full-color promotional flyers on lightweight gloss paper.", heroImage: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?q=80&w=600&auto=format&fit=crop" },
    { id: "premium-brochures", name: "Premium Brochures", description: "Bi-fold, tri-fold, and custom folding layouts for marketing campaigns.", heroImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop" },
    { id: "ncr-forms", name: "NCR Forms", description: "Carbonless invoice and receipt receipt books for business operations.", heroImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop" },
    { id: "coroplast-yard-signs", name: "Coroplast Yard Signs", description: "Weatherproof fluted plastic signs for real estate and local advertisements.", heroImage: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop" }
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

  return <HomeClient categories={homeCategories} />;
}
