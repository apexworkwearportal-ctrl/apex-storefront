"use client";

import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ChevronRight, 
  Loader2, 
  ShoppingBag, 
  Sparkles, 
  ChevronDown, 
  Plus, 
  Minus, 
  X, 
  Filter,
  Shirt,
  Layers,
  Palette,
  CheckCircle2,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatCategoryName(name) {
  if (!name) return "";
  let cleaned = name.replace(/[-_\s]+$/g, "").trim();
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return cleaned;
}

function ApparelCatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("priority");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lock body scroll when mobile category filter modal is open
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFilterOpen]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  // Fetch apparel products from Firestore
  useEffect(() => {
    async function fetchApparel() {
      try {
        setLoading(true);
        const colRef = collection(db, "apparel_products");
        let snap;
        try {
          const q = query(colRef, orderBy("createdAt", "desc"));
          snap = await getDocs(q);
        } catch {
          snap = await getDocs(colRef);
        }

        const items = [];
        const catMap = new Map();

        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.isVisible === false) return;

          const item = {
            id: d.id,
            ...data,
          };
          items.push(item);

          const cat = data.category || "General Apparel";
          catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });

        setProducts(items);

        const cats = Array.from(catMap.entries()).map(([name, count]) => ({
          name,
          count,
        })).sort((a, b) => b.count - a.count);

        setCategories(cats);
      } catch (err) {
        console.error("Error fetching apparel products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApparel();
  }, []);

  // Filter products based on search and category
  const filteredProducts = products.filter((item) => {
    // Category match
    if (selectedCategory !== "all") {
      const itemCat = (item.category || "").toLowerCase();
      if (itemCat !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchCat = (item.category || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchSku = (item.sku || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc && !matchSku) return false;
    }

    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") {
      const pA = parseFloat(a.basePrice || a.price || 0);
      const pB = parseFloat(b.basePrice || b.price || 0);
      return pA - pB;
    }
    if (sortBy === "price-high") {
      const pA = parseFloat(a.basePrice || a.price || 0);
      const pB = parseFloat(b.basePrice || b.price || 0);
      return pB - pA;
    }
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    // Default: priority / newest
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  // Paginated slice
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F8FAFC" }}>
      <Header />

      {/* Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        color: "#FFFFFF",
        padding: "3.5rem 1.5rem 3rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow effects */}
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-40%",
          left: "5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(147,51,234,0.15) 0%, rgba(147,51,234,0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ maxWidth: "1300px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#94A3B8", marginBottom: "1.25rem" }}>
            <Link href="/" style={{ color: "#94A3B8", textDecoration: "none" }}>Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: "#38BDF8", fontWeight: 600 }}>Custom Apparel & Embroidery</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.85rem", borderRadius: "100px", background: "rgba(37,99,235,0.2)", border: "1px solid rgba(56,189,248,0.3)", color: "#38BDF8", fontSize: "0.8rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "0.04em" }}>
                <Shirt size={14} />
                PREMIUM EMBROIDERY & SCREEN PRINTING
              </div>
              <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "0.75rem" }}>
                Custom Branded Apparel
              </h1>
              <p style={{ color: "#CBD5E1", fontSize: "1.05rem", maxWidth: "620px", lineHeight: 1.6 }}>
                High-performance tees, hoodies, outerwear, polos, and workwear uniforms. Customize with professional high-density embroidery or vibrant screen printing.
              </p>
            </div>

            {/* Quick stats badges */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ padding: "1rem 1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", minWidth: "120px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#38BDF8" }}>{products.length}</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", textTransform: "uppercase", fontWeight: 600 }}>Garment Styles</div>
              </div>
              <div style={{ padding: "1rem 1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", minWidth: "120px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10B981" }}>100%</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", textTransform: "uppercase", fontWeight: 600 }}>Quality Guarantee</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "2.5rem 1.5rem 5rem", width: "100%", flex: 1 }}>
        {/* Top Filter Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "2rem",
          padding: "1rem 1.25rem",
          borderRadius: "14px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          {/* Search */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 300px" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search apparel by name, material, SKU..."
              style={{
                width: "100%",
                padding: "0.65rem 1rem 0.65rem 2.65rem",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                fontSize: "0.9rem",
                outline: "none",
                color: "#0F172A"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Action buttons (Mobile filter button & Sort) */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Mobile Category Filter Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="btn btn-secondary md:hidden"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                fontSize: "0.85rem",
                borderRadius: "10px",
                fontWeight: 600
              }}
            >
              <Filter size={16} />
              Categories {selectedCategory !== "all" && `(${formatCategoryName(selectedCategory)})`}
            </button>

            {/* Sort selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ArrowUpDown size={16} style={{ color: "#64748B" }} />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="priority">Featured & Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Product Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Layout (Sidebar + Product Grid) */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Desktop Categories Sidebar */}
          <aside className="hidden md:block" style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #F1F5F9" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={16} style={{ color: "#2563EB" }} />
                Apparel Categories
              </h3>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => handleCategoryChange("all")}
                  style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#2563EB", fontWeight: 600, cursor: "pointer" }}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <button
                onClick={() => handleCategoryChange("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: selectedCategory === "all" ? 700 : 500,
                  color: selectedCategory === "all" ? "#2563EB" : "#475569",
                  background: selectedCategory === "all" ? "#EFF6FF" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s"
                }}
              >
                <span>All Apparel Styles</span>
                <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "100px", background: selectedCategory === "all" ? "#DBEAFE" : "#F1F5F9", color: selectedCategory === "all" ? "#1E40AF" : "#64748B", fontWeight: 600 }}>
                  {products.length}
                </span>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryChange(cat.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#2563EB" : "#475569",
                      background: isSelected ? "#EFF6FF" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s"
                    }}
                  >
                    <span>{formatCategoryName(cat.name)}</span>
                    <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "100px", background: isSelected ? "#DBEAFE" : "#F1F5F9", color: isSelected ? "#1E40AF" : "#64748B", fontWeight: 600 }}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Decoration card */}
            <div style={{ marginTop: "1.75rem", padding: "1rem", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0F172A", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                <Sparkles size={15} style={{ color: "#F59E0B" }} />
                Custom Decoration
              </div>
              <p style={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.5, margin: 0 }}>
                Every garment is custom decorated with your logos, text, or artwork. Visual mockups available instantly on each product.
              </p>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", gap: "1rem" }}>
                <Loader2 size={36} className="animate-spin" style={{ color: "#2563EB" }} />
                <span style={{ fontSize: "0.95rem", color: "#64748B", fontWeight: 600 }}>Loading apparel catalog...</span>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div style={{
                background: "#FFFFFF",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                padding: "4rem 2rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem"
              }}>
                <Shirt size={48} style={{ color: "#94A3B8" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>No apparel products found</h3>
                <p style={{ color: "#64748B", fontSize: "0.9rem", maxWidth: "420px", margin: 0 }}>
                  {searchQuery ? `No results matching "${searchQuery}". Try adjusting your filters.` : "There are currently no active products in this category."}
                </p>
                {selectedCategory !== "all" && (
                  <button
                    onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                    className="btn btn-primary"
                    style={{ marginTop: "0.5rem", padding: "0.65rem 1.25rem", fontSize: "0.85rem" }}
                  >
                    View All Apparel
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Result count & active filters */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", fontSize: "0.85rem", color: "#64748B" }}>
                  <span>Showing <strong>{sortedProducts.length}</strong> apparel styles</span>
                  {selectedCategory !== "all" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.65rem", borderRadius: "100px", background: "#EFF6FF", color: "#2563EB", fontWeight: 600 }}>
                      Category: {formatCategoryName(selectedCategory)}
                      <button onClick={() => setSelectedCategory("all")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", padding: 0 }}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>

                {/* Product Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1.5rem"
                }}>
                  {paginatedProducts.map((product) => {
                    const views = product.garmentViews || product.apparelViews || {};
                    const frontImg = views.front?.image || product.thumbnail || product.imageUrl || "/images/apparel-placeholder.png";
                    const viewCount = Object.keys(views).length;
                    const displayPrice = parseFloat(product.basePrice || product.price || 0);

                    return (
                      <Link
                        key={product.id}
                        href={`/apparel/${product.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            background: "#FFFFFF",
                            borderRadius: "14px",
                            border: "1px solid #E2E8F0",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            transition: "all 0.2s ease-in-out",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 12px 24px -10px rgba(0,0,0,0.12)";
                            e.currentTarget.style.borderColor = "#CBD5E1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                            e.currentTarget.style.borderColor = "#E2E8F0";
                          }}
                        >
                          {/* Image Container */}
                          <div style={{
                            position: "relative",
                            width: "100%",
                            paddingTop: "100%",
                            backgroundColor: "#F8FAFC",
                            overflow: "hidden",
                            borderBottom: "1px solid #F1F5F9"
                          }}>
                            {frontImg ? (
                              <img
                                src={frontImg}
                                alt={product.name}
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  padding: "1rem",
                                  transition: "transform 0.3s ease"
                                }}
                              />
                            ) : (
                              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1" }}>
                                <Shirt size={56} />
                              </div>
                            )}

                            {/* View angles badge */}
                            {viewCount > 1 && (
                              <span style={{
                                position: "absolute",
                                bottom: "0.75rem",
                                left: "0.75rem",
                                background: "rgba(15,23,42,0.75)",
                                backdropFilter: "blur(4px)",
                                color: "#FFFFFF",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.5rem",
                                borderRadius: "6px"
                              }}>
                                {viewCount} Angles
                              </span>
                            )}

                            {/* Category Tag */}
                            {product.category && (
                              <span style={{
                                position: "absolute",
                                top: "0.75rem",
                                left: "0.75rem",
                                background: "rgba(255,255,255,0.9)",
                                backdropFilter: "blur(4px)",
                                color: "#475569",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px",
                                border: "1px solid rgba(226,232,240,0.8)"
                              }}>
                                {formatCategoryName(product.category)}
                              </span>
                            )}
                          </div>

                          {/* Info Body */}
                          <div style={{ padding: "1.15rem", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                            <div>
                              <h3 style={{
                                fontSize: "0.98rem",
                                fontWeight: 800,
                                color: "#0F172A",
                                marginBottom: "0.35rem",
                                lineHeight: 1.35,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}>
                                {product.name}
                              </h3>

                              {product.sku && (
                                <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "0.5rem" }}>
                                  SKU: {product.sku}
                                </div>
                              )}

                              {product.description && (
                                <p style={{
                                  fontSize: "0.8rem",
                                  color: "#64748B",
                                  lineHeight: 1.45,
                                  marginBottom: "0.75rem",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden"
                                }}>
                                  {product.description}
                                </p>
                              )}
                            </div>

                            {/* Footer info (MOQ & Price) */}
                            <div style={{
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "space-between",
                              paddingTop: "0.75rem",
                              borderTop: "1px solid #F1F5F9",
                              marginTop: "0.5rem"
                            }}>
                              <div>
                                <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block", textTransform: "uppercase", fontWeight: 600 }}>
                                  Starting at
                                </span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: "#2563EB" }}>
                                  ${displayPrice.toFixed(2)}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#94A3B8", marginLeft: "0.2rem" }}>
                                  /ea
                                </span>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <span style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: "#475569",
                                  background: "#F1F5F9",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "6px"
                                }}>
                                  Min: {product.minimumOrderQuantity || product.moq || 12} pcs
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "3rem" }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                      Previous
                    </button>

                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            border: num === currentPage ? "1px solid #2563EB" : "1px solid #E2E8F0",
                            background: num === currentPage ? "#2563EB" : "#FFFFFF",
                            color: num === currentPage ? "#FFFFFF" : "#475569",
                            cursor: "pointer"
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Categories Modal / Bottom Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
            />

            {/* Modal Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{
                position: "relative",
                width: "100%",
                maxHeight: "80vh",
                background: "#FFFFFF",
                borderTopLeftRadius: "20px",
                borderTopRightRadius: "20px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: 101,
                boxShadow: "0 -10px 25px rgba(0,0,0,0.15)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #E2E8F0" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers size={18} style={{ color: "#2563EB" }} />
                  Filter by Category
                </h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "1rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  onClick={() => { setSelectedCategory("all"); setMobileFilterOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    fontSize: "0.95rem",
                    fontWeight: selectedCategory === "all" ? 700 : 500,
                    color: selectedCategory === "all" ? "#2563EB" : "#0F172A",
                    background: selectedCategory === "all" ? "#EFF6FF" : "#F8FAFC",
                    border: selectedCategory === "all" ? "1px solid #BFDBFE" : "1px solid #E2E8F0",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span>All Apparel Styles</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedCategory === "all" ? "#2563EB" : "#64748B" }}>
                    {products.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setSelectedCategory(cat.name); setMobileFilterOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        fontSize: "0.95rem",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#2563EB" : "#0F172A",
                        background: isSelected ? "#EFF6FF" : "#F8FAFC",
                        border: isSelected ? "1px solid #BFDBFE" : "1px solid #E2E8F0",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <span>{formatCategoryName(cat.name)}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isSelected ? "#2563EB" : "#64748B" }}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700, borderRadius: "10px" }}
                >
                  Apply Filters ({filteredProducts.length} Items)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default function ApparelCatalogPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#2563EB" }} />
      </div>
    }>
      <ApparelCatalogContent />
    </Suspense>
  );
}
