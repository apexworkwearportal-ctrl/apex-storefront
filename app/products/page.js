"use client";

import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronRight, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("priority"); // priority, name-asc, name-desc, price-asc, price-desc

  // Sync state if category param changes
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        // 1. Fetch categories
        const catSnap = await getDocs(query(collection(db, "categories"), orderBy("displayOrder", "asc")));
        const catList = [];
        catSnap.forEach(doc => {
          catList.push({ id: doc.id, ...doc.data() });
        });
        setCategories(catList);

        // 2. Fetch active products
        const prodSnap = await getDocs(collection(db, "products"));
        const prodList = [];
        prodSnap.forEach(doc => {
          const data = doc.data();
          if (data.isVisible) {
            prodList.push({ id: doc.id, ...data });
          }
        });
        setProducts(prodList);
      } catch (e) {
        console.error("Error loading storefront catalog:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Filter products client-side
  const filteredProducts = products.filter(p => {
    // 1. Category Filter
    let catMatch = true;
    if (selectedCategory !== "all") {
      const targetCategoryIds = [selectedCategory];
      // Include all children categories if the selected category is a parent
      categories.forEach(c => {
        if (c.parentId === selectedCategory) {
          targetCategoryIds.push(c.id);
        }
      });

      const pCatId = (p.categoryId || "").toLowerCase().trim();
      const pCatOverride = (p.categoryOverride || "").toLowerCase().trim();
      const pSinaCat = (p.sinalite?.category || "").toLowerCase().trim();

      catMatch = targetCategoryIds.some(catId => {
        const catObj = categories.find(c => c.id === catId);
        const catName = (catObj?.name || "").toLowerCase().trim();
        
        return pCatId === catId.toLowerCase() || 
               pCatOverride === catId.toLowerCase() ||
               pCatOverride === catName ||
               pSinaCat === catName ||
               pSinaCat === catId.toLowerCase();
      });
    }

    // 2. Search Query Filter
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = (p.name || p.sinalite?.name || "").toLowerCase().includes(searchLower) ||
                      (p.sku || p.sinalite?.sku || "").toLowerCase().includes(searchLower) ||
                      (p.description || "").toLowerCase().includes(searchLower);

    return catMatch && nameMatch;
  });

  // Sort products client-side
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "priority") {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    }
    if (sortBy === "name-asc") {
      const nameA = a.name || a.sinalite?.name || "";
      const nameB = b.name || b.sinalite?.name || "";
      return nameA.localeCompare(nameB);
    }
    if (sortBy === "name-desc") {
      const nameA = a.name || a.sinalite?.name || "";
      const nameB = b.name || b.sinalite?.name || "";
      return nameB.localeCompare(nameA);
    }
    if (sortBy === "price-asc") {
      const priceA = parseFloat(a.pricing?.startingPriceOverride || a.pricing?.startingPrice || 0);
      const priceB = parseFloat(b.pricing?.startingPriceOverride || b.pricing?.startingPrice || 0);
      return priceA - priceB;
    }
    if (sortBy === "price-desc") {
      const priceA = parseFloat(a.pricing?.startingPriceOverride || a.pricing?.startingPrice || 0);
      const priceB = parseFloat(b.pricing?.startingPriceOverride || b.pricing?.startingPrice || 0);
      return priceB - priceA;
    }
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      {/* Hero Header Banner */}
      <section style={{
        padding: "4rem 2rem",
        backgroundColor: "hsl(var(--primary-hsl))",
        color: "white",
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "5%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none"
        }} />
        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "hsl(var(--accent-hsl))",
            marginBottom: "0.5rem"
          }}>
            <Sparkles size={12} /> Instant Pricing Configurator
          </span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
            GTA Commercial Print Catalog
          </h1>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.8)", maxWidth: "600px", margin: "0 auto" }}>
            Select a custom configuration, upload your graphics files, and review shipping speeds instantly.
          </p>
        </div>
      </section>

      {/* Catalog Split Layout */}
      <div style={{ maxWidth: "1200px", margin: "3rem auto", padding: "0 1.5rem", width: "100%", flexGrow: 1 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "hsl(var(--muted-hsl))", fontWeight: 500 }}>
            <Loader2 className="animate-spin" style={{ animation: "spin 1.5s linear infinite", marginRight: "0.5rem" }} /> Loading catalog selections...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "2.5rem" }} className="catalog-grid">
            
            {/* Left Column: Categories Sidebar */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", color: "hsl(var(--primary-hsl))" }}>
                  <SlidersHorizontal size={16} /> Categories
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="category-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: selectedCategory === "all" ? 700 : 500,
                      backgroundColor: selectedCategory === "all" ? "hsl(var(--accent-hsl) / 0.08)" : "transparent",
                      color: selectedCategory === "all" ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl) / 0.8)",
                      textAlign: "left",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span style={{ fontWeight: selectedCategory === "all" ? 800 : 600 }}>All Catalog Items</span>
                    <ChevronRight size={14} style={{ opacity: selectedCategory === "all" ? 1 : 0.3 }} />
                  </button>

                  {categories.filter(c => !c.parentId).map(parentCat => {
                    const children = categories.filter(c => c.parentId === parentCat.id);
                    const isParentActive = selectedCategory === parentCat.id;

                    return (
                      <div key={parentCat.id} style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.25rem" }}>
                        <button
                          onClick={() => setSelectedCategory(parentCat.id)}
                          className="category-btn"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            padding: "0.6rem 0.85rem",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: isParentActive ? 800 : 600,
                            backgroundColor: isParentActive ? "hsl(var(--accent-hsl) / 0.08)" : "transparent",
                            color: isParentActive ? "hsl(var(--accent-hsl))" : "hsl(var(--primary-hsl))",
                            textAlign: "left",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <span style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>{parentCat.name}</span>
                          <ChevronRight size={14} style={{ opacity: isParentActive ? 1 : 0.3 }} />
                        </button>

                        {children.length > 0 && (
                          <div style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.15rem", borderLeft: "1px solid hsl(var(--border-hsl))", marginLeft: "0.5rem" }}>
                            {children.map(childCat => {
                              const isChildActive = selectedCategory === childCat.id;
                              return (
                                <button
                                  key={childCat.id}
                                  onClick={() => setSelectedCategory(childCat.id)}
                                  className="category-btn"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    width: "100%",
                                    padding: "0.45rem 0.75rem",
                                    border: "none",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: isChildActive ? 700 : 500,
                                    backgroundColor: isChildActive ? "hsl(var(--accent-hsl) / 0.06)" : "transparent",
                                    color: isChildActive ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl) / 0.7)",
                                    textAlign: "left",
                                    transition: "all 0.2s ease"
                                  }}
                                >
                                  <span>{childCat.name}</span>
                                  <ChevronRight size={12} style={{ opacity: isChildActive ? 1 : 0.3 }} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right Column: Toolbar and Products Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* Toolbar: Search and Sort */}
              <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between", border: "1px solid hsl(var(--border-hsl))" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
                  <input
                    className="input"
                    placeholder="Search print products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: "2.25rem", paddingRight: "1rem" }}
                  />
                  <Search size={16} style={{
                    position: "absolute",
                    left: "0.85rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "hsl(var(--foreground-hsl) / 0.4)"
                  }} />
                </div>

                {/* Sort selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ArrowUpDown size={16} style={{ color: "hsl(var(--muted-hsl))" }} />
                  <select
                    className="input"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: "200px", padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                  >
                    <option value="priority">Priority Order</option>
                    <option value="name-asc">Product Name (A-Z)</option>
                    <option value="name-desc">Product Name (Z-A)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Products Display Grid */}
              <AnimatePresence mode="wait">
                {sortedProducts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="card" 
                    style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))", border: "1px solid hsl(var(--border-hsl))" }}
                  >
                    <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5, display: "inline-block" }} />
                    <p>No products match your search or filter requirements.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.05 }
                      }
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: "2rem"
                    }}
                  >
                    {sortedProducts.map(product => {
                      const image = product.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop";
                      const startingPrice = parseFloat(product.pricing?.startingPriceOverride || product.pricing?.startingPrice || 0);

                      return (
                        <motion.div
                          key={product.id}
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
                          }}
                          style={{ height: "100%" }}
                        >
                          <div className="card card-hover" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", height: "100%", border: "1px solid hsl(var(--border-hsl))", position: "relative" }}>
                            {product.isCustom ? (
                              <span style={{
                                position: "absolute",
                                top: "0.75rem",
                                left: "0.75rem",
                                backgroundColor: "hsl(var(--primary-hsl) / 0.15)",
                                color: "hsl(var(--primary-hsl))",
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                zIndex: 2
                              }}>
                                Custom Apparel
                              </span>
                            ) : startingPrice > 0 ? (
                              <span style={{
                                position: "absolute",
                                top: "0.75rem",
                                left: "0.75rem",
                                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                                color: "hsl(var(--accent-hsl))",
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                zIndex: 2
                              }}>
                                Instant Pricing
                              </span>
                            ) : null}
                            <div style={{ width: "100%", height: "180px", overflow: "hidden", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                              <img
                                src={image}
                                alt={product.name || product.sinalite?.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  padding: "1rem",
                                  backgroundColor: "white",
                                  transition: "transform 0.4s ease"
                                }}
                                className="product-card-img"
                              />
                            </div>
                            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flexGrow: 1, gap: "0.4rem" }}>
                              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: "1.4" }}>{product.name || product.sinalite?.name}</h3>
                              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", minHeight: "36px", lineHeight: "1.4" }}>
                                {product.description || "Configure option weights, turnarounds, and coating options for custom prints."}
                              </p>
                              
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                                <div>
                                  <p style={{ fontSize: "0.6rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Starting at</p>
                                  <p style={{ fontWeight: 800, fontSize: "1rem", color: "hsl(var(--accent-hsl))" }}>
                                    {startingPrice > 0 ? `$${startingPrice.toFixed(2)} CAD` : "Quote Live"}
                                  </p>
                                </div>
                                <Link href={`/products/${product.id}`} className="btn btn-primary" style={{
                                  fontSize: "0.75rem",
                                  padding: "0.4rem 0.8rem",
                                  borderRadius: "var(--radius-sm)"
                                }}>
                                  Configure
                                </Link>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}
      </div>

      <Footer />

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .product-card-img:hover {
          transform: scale(1.04);
        }
        .category-btn:hover {
          background-color: hsl(var(--accent-hsl) / 0.04) !important;
          color: hsl(var(--accent-hsl)) !important;
          padding-left: 1.1rem !important;
        }
        @media (max-width: 768px) {
          .catalog-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "hsl(var(--muted-hsl))", fontWeight: 500 }}>
        <Loader2 className="animate-spin" style={{ animation: "spin 1.5s linear" }} /> Loading catalog page...
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
