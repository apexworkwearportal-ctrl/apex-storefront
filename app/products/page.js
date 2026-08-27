"use client";

import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronRight, Loader2, ShoppingBag, Sparkles, ChevronDown, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Category descriptions, related chips, and FAQs are fetched dynamically from the Firebase database document fields.

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortBy, setSortBy] = useState("priority");
  const [expandedFaqIdx, setExpandedFaqIdx] = useState(null);

  // Pagination & Sidebar states
  const [currentPage, setCurrentPage] = useState(1);
  const [allExpanded, setAllExpanded] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Reset active page on filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedProduct, searchQuery, sortBy]);

  // Sync states if URL search params change (supports Back/Forward browser keys)
  useEffect(() => {
    if (loading || products.length === 0) return;
    
    const catParam = searchParams.get("category") || "all";
    const prodParam = searchParams.get("product") || null;
    
    setSelectedCategory(catParam);
    
    if (prodParam) {
      const matchedProd = products.find(p => p.id === prodParam);
      if (matchedProd) {
        setSelectedProduct(matchedProd);
      } else {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [searchParams, products, loading]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const catSnap = await getDocs(query(collection(db, "categories"), orderBy("displayOrder", "asc")));
        const catList = [];
        catSnap.forEach(doc => {
          catList.push({ id: doc.id, ...doc.data() });
        });
        setCategories(catList);

        const prodSnap = await getDocs(collection(db, "products"));
        const prodList = [];
        prodSnap.forEach(doc => {
          const data = doc.data();
          if (data.isVisible) {
            prodList.push({ id: doc.id, ...data });
          }
        });
        setProducts(prodList);

        // Initial setup from current URL parameters
        const catParam = searchParams.get("category") || "all";
        const prodParam = searchParams.get("product") || null;
        setSelectedCategory(catParam);
        if (prodParam) {
          const matchedProd = prodList.find(p => p.id === prodParam);
          if (matchedProd) {
            setSelectedProduct(matchedProd);
          }
        }
      } catch (e) {
        console.error("Error loading storefront catalog:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Update browser URL query params dynamically when selection states change
  useEffect(() => {
    if (loading) return;
    
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }
    if (selectedProduct) {
      params.set("product", selectedProduct.id);
    }
    
    const queryStr = params.toString();
    const newUrl = window.location.pathname + (queryStr ? "?" + queryStr : "");
    const currentUrl = window.location.pathname + window.location.search;
    
    if (currentUrl !== newUrl) {
      window.history.pushState({ path: newUrl }, "", newUrl);
    }
  }, [selectedCategory, selectedProduct, loading]);

  // Get category hierarchy depth level
  const getCategoryLevel = (cat) => {
    if (!cat.parentId) return 1;
    const parent = categories.find(c => c.id === cat.parentId);
    if (!parent) return 2;
    if (!parent.parentId) return 2;
    return 3;
  };

  // Get all descendant category IDs recursively (supporting up to 3 levels)
  const getDescendantCategoryIds = (catId) => {
    const ids = [catId];
    
    // Level 2 children (subcategories or leaf categories depending on depth)
    const level2 = categories.filter(c => c.parentId === catId);
    level2.forEach(l2 => {
      ids.push(l2.id);
      
      // Level 3 children (leaf categories)
      const level3 = categories.filter(c => c.parentId === l2.id);
      level3.forEach(l3 => {
        ids.push(l3.id);
      });
    });
    
    return ids;
  };

  // Filter products client-side
  const filteredProducts = products.filter(p => {
    // 1. Specific product is selected
    if (selectedProduct) {
      return p.id === selectedProduct.id;
    }

    // 2. Category Filter
    let catMatch = true;
    if (selectedCategory !== "all") {
      const targetCategoryIds = getDescendantCategoryIds(selectedCategory);

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

    // 3. Search Query Filter
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
      const priceA = parseFloat(a.pricing?.startingPriceOverride || a.pricing?.startingPrice || 19.99);
      const priceB = parseFloat(b.pricing?.startingPriceOverride || b.pricing?.startingPrice || 19.99);
      return priceA - priceB;
    }
    if (sortBy === "price-desc") {
      const priceA = parseFloat(a.pricing?.startingPriceOverride || a.pricing?.startingPrice || 19.99);
      const priceB = parseFloat(b.pricing?.startingPriceOverride || b.pricing?.startingPrice || 19.99);
      return priceB - priceA;
    }
    return 0;
  });

  // Compute Active Category Nodes for Breadcrumbs (supporting Parents, Subs, and Leaf Nodes)
  let activeParent = null;
  let activeChild = null;
  let activeLeaf = null;
  let activeProduct = null;

  if (selectedProduct) {
    activeProduct = selectedProduct;
    const prodCat = categories.find(c => c.id === selectedProduct.categoryId || c.name.toLowerCase() === (selectedProduct.categoryOverride || "").toLowerCase());
    if (prodCat) {
      const level = getCategoryLevel(prodCat);
      if (level === 3) {
        activeLeaf = prodCat;
        activeChild = categories.find(c => c.id === prodCat.parentId);
        if (activeChild) {
          activeParent = categories.find(c => c.id === activeChild.parentId);
        }
      } else if (level === 2) {
        activeChild = prodCat;
        activeParent = categories.find(c => c.id === prodCat.parentId);
      } else {
        activeParent = prodCat;
      }
    }
  } else if (selectedCategory !== "all") {
    const catObj = categories.find(c => c.id === selectedCategory);
    if (catObj) {
      const level = getCategoryLevel(catObj);
      if (level === 3) {
        activeLeaf = catObj;
        activeChild = categories.find(c => c.id === catObj.parentId);
        if (activeChild) {
          activeParent = categories.find(c => c.id === activeChild.parentId);
        }
      } else if (level === 2) {
        activeChild = catObj;
        activeParent = categories.find(c => c.id === catObj.parentId);
      } else {
        activeParent = catObj;
      }
    }
  }

  // Determine dynamic Header title and intros
  let pageTitle = "GTA Commercial Print Catalog";
  let pageIntro = "Browse the full Apex Workwear catalogue: configure your size, material, and quantity, see wholesale pricing instantly, and order online. Most products ship with no minimum order.";

  if (selectedProduct) {
    pageTitle = selectedProduct.name || selectedProduct.sinalite?.name;
    pageIntro = selectedProduct.description || "Configure option weights, turnarounds, and coating options for custom prints.";
  } else if (activeLeaf) {
    pageTitle = activeLeaf.name;
    pageIntro = activeLeaf.description || "";
  } else if (activeChild) {
    pageTitle = activeChild.name;
    pageIntro = activeChild.description || "";
  } else if (activeParent) {
    pageTitle = activeParent.name;
    pageIntro = activeParent.description || "";
  }

  // Sidebar navigation expansion checking
  const isParentExpanded = (parentId) => {
    if (categorySearch) return true; // expand all matching nodes during search
    if (allExpanded) return true;
    if (selectedCategory === "all") return false;
    if (selectedCategory === parentId) return true;
    const descendants = getDescendantCategoryIds(parentId);
    return descendants.includes(selectedCategory);
  };

  // Sidebar Level 2 expansion checking
  const isSubExpanded = (subId) => {
    if (categorySearch) return true; // expand all matching nodes during search
    if (allExpanded) return true;
    if (selectedCategory === "all") return false;
    if (selectedCategory === subId) return true;
    const descendants = getDescendantCategoryIds(subId);
    return descendants.includes(selectedCategory);
  };

  // Find related categories list (fetched dynamically from database values)
  const relatedList = activeLeaf?.related || activeChild?.related || activeParent?.related || [];

  // Find FAQs list (fetched dynamically from database values)
  const faqList = activeLeaf?.faqs || activeChild?.faqs || activeParent?.faqs || [];

  // Get descendant category IDs and count total products under any node recursively
  const getProductCountForCategory = (catId) => {
    const descendants = getDescendantCategoryIds(catId);
    return products.filter(p => {
      const pCatId = (p.categoryId || "").toLowerCase().trim();
      const pCatOverride = (p.categoryOverride || "").toLowerCase().trim();
      const pSinaCat = (p.sinalite?.category || "").toLowerCase().trim();

      return descendants.some(descId => {
        const descObj = categories.find(c => c.id === descId);
        const descName = (descObj?.name || "").toLowerCase().trim();
        return pCatId === descId.toLowerCase() || 
               pCatOverride === descId.toLowerCase() ||
               pCatOverride === descName ||
               pSinaCat === descName ||
               pSinaCat === descId.toLowerCase();
      });
    }).length;
  };

  // Category search filters
  const shouldShowParent = (parent) => {
    if (!categorySearch) return true;
    if (parent.name.toLowerCase().includes(categorySearch.toLowerCase())) return true;
    const subs = categories.filter(c => c.parentId === parent.id);
    return subs.some(sub => {
      if (sub.name.toLowerCase().includes(categorySearch.toLowerCase())) return true;
      const leafs = categories.filter(c => c.parentId === sub.id);
      return leafs.some(leaf => leaf.name.toLowerCase().includes(categorySearch.toLowerCase()));
    });
  };

  const shouldShowSub = (sub) => {
    if (!categorySearch) return true;
    if (sub.name.toLowerCase().includes(categorySearch.toLowerCase())) return true;
    const leafs = categories.filter(c => c.parentId === sub.id);
    return leafs.some(leaf => leaf.name.toLowerCase().includes(categorySearch.toLowerCase()));
  };

  const shouldShowLeaf = (leaf) => {
    if (!categorySearch) return true;
    return leaf.name.toLowerCase().includes(categorySearch.toLowerCase());
  };

  // Pagination computed variables
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / 12);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * 12, currentPage * 12);

  const getPaginationRange = () => {
    const delta = 1; // Show current and +-1 page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  // Background image for hero banner (either category image from Firebase or a premium abstract overlay)
  const activeCatObj = activeLeaf || activeChild || activeParent;
  const bgImage = activeCatObj?.heroImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "hsl(var(--background-hsl))" }}>
      <Header />

      {/* Breadcrumb Strip */}
      <div style={{
        backgroundColor: "hsl(var(--secondary-hsl) / 0.15)",
        borderBottom: "1px solid hsl(var(--border-hsl))",
        padding: "0.75rem 2rem"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "hsl(var(--muted-hsl))",
          fontWeight: 600
        }}>
          <Link href="/" style={{ color: "hsl(var(--muted-hsl))", textDecoration: "none" }}>Home</Link>
          <ChevronRight size={12} />
          <button onClick={() => { setSelectedCategory("all"); setSelectedProduct(null); }} style={{ background: "none", border: "none", color: "hsl(var(--muted-hsl))", fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Print Products
          </button>
          {activeParent && (
            <>
              <ChevronRight size={12} />
              <button onClick={() => { setSelectedCategory(activeParent.id); setSelectedProduct(null); }} style={{ background: "none", border: "none", color: "hsl(var(--muted-hsl))", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                {activeParent.name}
              </button>
            </>
          )}
          {activeChild && (
            <>
              <ChevronRight size={12} />
              <button onClick={() => { setSelectedCategory(activeChild.id); setSelectedProduct(null); }} style={{ background: "none", border: "none", color: "hsl(var(--muted-hsl))", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                {activeChild.name}
              </button>
            </>
          )}
          {activeLeaf && (
            <>
              <ChevronRight size={12} />
              <button onClick={() => { setSelectedCategory(activeLeaf.id); setSelectedProduct(null); }} style={{ background: "none", border: "none", color: "hsl(var(--muted-hsl))", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                {activeLeaf.name}
              </button>
            </>
          )}
          {activeProduct && (
            <>
              <ChevronRight size={12} />
              <span style={{ color: "hsl(var(--foreground-hsl))" }}>{activeProduct.name || activeProduct.sinalite?.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Hero Header Banner with custom category image overlay fallback */}
      <section style={{
        padding: "5rem 2rem",
        color: "white",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
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
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", marginBottom: "0.75rem", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.85)", maxWidth: "680px", margin: "0 auto", lineHeight: "1.6" }}>
            {pageIntro}
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
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2.5rem" }} className="catalog-grid">
            
            {/* Left Column: Categories Sidebar */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", color: "hsl(var(--primary-hsl))" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><SlidersHorizontal size={16} /> Categories</span>
                  <button 
                    onClick={() => setAllExpanded(!allExpanded)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "hsl(var(--accent-hsl))",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    {allExpanded ? "Collapse All" : "Expand All"}
                  </button>
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {/* Category Search Input */}
                  <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                    <input
                      className="input"
                      placeholder="Filter categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      style={{ paddingLeft: "2rem", paddingRight: "0.75rem", fontSize: "0.8rem", height: "34px" }}
                    />
                    <Search size={14} style={{
                      position: "absolute",
                      left: "0.7rem", top: "50%",
                      transform: "translateY(-50%)",
                      color: "hsl(var(--foreground-hsl) / 0.4)"
                    }} />
                  </div>

                  {/* All Products button */}
                  {(!categorySearch || "all products".includes(categorySearch.toLowerCase())) && (
                    <button
                      onClick={() => { setSelectedCategory("all"); setSelectedProduct(null); }}
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
                        fontWeight: selectedCategory === "all" && !selectedProduct ? 800 : 600,
                        backgroundColor: selectedCategory === "all" && !selectedProduct ? "hsl(var(--accent-hsl) / 0.08)" : "transparent",
                        color: selectedCategory === "all" && !selectedProduct ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl) / 0.8)",
                        textAlign: "left",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}>
                        All Products
                        <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", marginLeft: "0.3rem", fontWeight: 550 }}>
                          ({products.length})
                        </span>
                      </span>
                      <ChevronRight size={14} style={{ opacity: selectedCategory === "all" && !selectedProduct ? 1 : 0.3 }} />
                    </button>
                  )}

                  {/* 3-Level Parent Category list tree */}
                  {categories.filter(c => !c.parentId).filter(shouldShowParent).map(parentCat => {
                    const subs = categories.filter(c => c.parentId === parentCat.id).filter(shouldShowSub);
                    const parentExpanded = isParentExpanded(parentCat.id);
                    const isParentSelected = selectedCategory === parentCat.id;

                    return (
                      <div key={parentCat.id} style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.25rem" }}>
                        <button
                          onClick={() => { setSelectedCategory(parentCat.id); setSelectedProduct(null); }}
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
                            fontWeight: isParentSelected ? 800 : 600,
                            backgroundColor: isParentSelected ? "hsl(var(--accent-hsl) / 0.08)" : "transparent",
                            color: isParentSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--primary-hsl))",
                            textAlign: "left",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                            {parentCat.name}
                            <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", marginLeft: "0.3rem", fontWeight: 600 }}>
                              ({getProductCountForCategory(parentCat.id)})
                            </span>
                          </span>
                          <span style={{ fontSize: "10px", color: "hsl(var(--muted-hsl))" }}>{parentExpanded ? "▾" : "▸"}</span>
                        </button>

                        {/* Level 2 Subcategories */}
                        {parentExpanded && subs.length > 0 && (
                          <div style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem", borderLeft: "1px solid hsl(var(--border-hsl))", marginLeft: "0.5rem" }}>
                            {subs.map(subCat => {
                              const leafs = categories.filter(c => c.parentId === subCat.id).filter(shouldShowLeaf);
                              const subExpanded = isSubExpanded(subCat.id);
                              const isSubSelected = selectedCategory === subCat.id;

                              return (
                                <div key={subCat.id} style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                  <button
                                    onClick={() => { setSelectedCategory(subCat.id); setSelectedProduct(null); }}
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
                                      fontWeight: isSubSelected ? 800 : 500,
                                      backgroundColor: isSubSelected ? "hsl(var(--accent-hsl) / 0.06)" : "transparent",
                                      color: isSubSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl) / 0.8)",
                                      textAlign: "left",
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <span style={{ display: "flex", alignItems: "center" }}>
                                      {subCat.name}
                                      <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", marginLeft: "0.3rem", fontWeight: 550 }}>
                                        ({getProductCountForCategory(subCat.id)})
                                      </span>
                                    </span>
                                    <span style={{ fontSize: "8px", color: "hsl(var(--muted-hsl))" }}>{subExpanded ? "▾" : "▸"}</span>
                                  </button>

                                  {/* Level 3 Leaf Categories (Product Types) */}
                                  {subExpanded && leafs.length > 0 && (
                                    <div style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem", borderLeft: "1px dotted hsl(var(--border-hsl))", marginLeft: "0.4rem" }}>
                                      {leafs.map(leafCat => {
                                        const isLeafSelected = selectedCategory === leafCat.id;
                                        return (
                                          <button
                                            key={leafCat.id}
                                            onClick={() => { setSelectedCategory(leafCat.id); setSelectedProduct(null); }}
                                            className="category-btn"
                                            style={{
                                              width: "100%",
                                              padding: "0.35rem 0.6rem",
                                              border: "none",
                                              borderRadius: "var(--radius-sm)",
                                              cursor: "pointer",
                                              fontSize: "0.75rem",
                                              fontWeight: isLeafSelected ? 800 : 500,
                                              backgroundColor: isLeafSelected ? "hsl(var(--accent-hsl) / 0.08)" : "transparent",
                                              color: isLeafSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
                                              textAlign: "left",
                                              transition: "all 0.2s ease"
                                            }}
                                          >
                                            <span style={{ display: "flex", alignItems: "center" }}>
                                              {leafCat.name}
                                              <span style={{ fontSize: "0.65rem", color: "hsl(var(--muted-hsl))", marginLeft: "0.3rem", fontWeight: 500 }}>
                                                ({getProductCountForCategory(leafCat.id)})
                                              </span>
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
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
                {/* Search input */}
                <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
                  <input
                    className="input"
                    placeholder="Search print products..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedProduct(null); }}
                    style={{ paddingLeft: "2.25rem", paddingRight: "1rem" }}
                  />
                  <Search size={16} style={{
                    position: "absolute",
                    left: "0.85rem", top: "50%",
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

              {/* Category Intro Block */}
              <div style={{
                border: "1px solid hsl(var(--border-hsl))",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "hsl(var(--secondary-hsl) / 0.2)",
                padding: "1.5rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem"
              }}>
                <p style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "hsl(var(--foreground-hsl) / 0.85)", margin: 0 }}>
                  {pageIntro}
                </p>
              </div>

              {/* Products Display Grid */}
              <AnimatePresence mode="wait">
                {paginatedProducts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="card" 
                    style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))", border: "1px solid hsl(var(--border-hsl))" }}
                  >
                    <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5, display: "inline-block" }} />
                    <p>No products matched "{searchQuery}." Try a broader term, or browse categories in the sidebar.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                        gap: "2rem"
                      }}
                    >
                      {paginatedProducts.map(product => {
                        const image = product.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop";
                        const startingPrice = parseFloat(product.pricing?.startingPriceOverride || product.pricing?.startingPrice || 0);
                        const displayPrice = startingPrice > 0 ? startingPrice : 19.99;

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
                              ) : (
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
                              )}
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
                                    <p style={{ fontWeight: 850, fontSize: "1.05rem", color: "hsl(var(--accent-hsl))" }}>
                                      ${displayPrice.toFixed(2)} CAD
                                    </p>
                                  </div>
                                  <Link href={`/products/${product.id}`} className="btn btn-primary" style={{
                                    fontSize: "0.75rem",
                                    padding: "0.45rem 0.95rem",
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
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "1.5rem"
                      }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="related-chip"
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: currentPage === 1 ? "hsl(var(--secondary-hsl) / 0.1)" : "white",
                            border: "1px solid hsl(var(--border-hsl))",
                            color: currentPage === 1 ? "hsl(var(--muted-hsl))" : "hsl(var(--foreground-hsl))",
                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                            borderRadius: "20px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            transition: "all 0.2s ease"
                          }}
                        >
                          Prev
                        </button>
                        {getPaginationRange().map((page, index) => {
                          if (page === "...") {
                            return (
                              <span key={`dots-${index}`} style={{ margin: "0 0.25rem", color: "hsl(var(--muted-hsl))", fontWeight: 700 }}>
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              style={{
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: currentPage === page ? "hsl(var(--accent-hsl))" : "white",
                                border: "1px solid hsl(var(--border-hsl))",
                                color: currentPage === page ? "white" : "hsl(var(--foreground-hsl))",
                                cursor: "pointer",
                                borderRadius: "50%",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                transition: "all 0.2s ease"
                              }}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="related-chip"
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: currentPage === totalPages ? "hsl(var(--secondary-hsl) / 0.1)" : "white",
                            border: "1px solid hsl(var(--border-hsl))",
                            color: currentPage === totalPages ? "hsl(var(--muted-hsl))" : "hsl(var(--foreground-hsl))",
                            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                            borderRadius: "20px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            transition: "all 0.2s ease"
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Related Categories Cross-Links (Level 3 subcategory active context) */}
              {relatedList.length > 0 && (
                <div style={{
                  border: "1px solid hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.5rem 1.75rem",
                  marginTop: "1.5rem"
                }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-hsl))", marginBottom: "1rem" }}>
                    Complete Your Outdoor Signage / Marketing Set
                  </h4>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {relatedList.map(name => {
                      const cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            if (cat) {
                              setSelectedCategory(cat.id);
                              setSelectedProduct(null);
                            }
                          }}
                          className="related-chip"
                          style={{
                            border: "1px solid hsl(var(--border-hsl))",
                            padding: "0.5rem 1rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            borderRadius: "20px",
                            backgroundColor: "white",
                            color: "hsl(var(--foreground-hsl) / 0.85)",
                            cursor: "pointer",
                            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Collapsible FAQ Panel */}
              {faqList.length > 0 && (
                <div style={{
                  border: "1px solid hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.75rem 2rem",
                  marginTop: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem"
                }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--primary-hsl))", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem" }}>
                    Frequently Asked Questions
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {faqList.map((faq, idx) => {
                      const isExpanded = expandedFaqIdx === idx;
                      return (
                        <div key={idx} style={{
                          borderBottom: idx !== faqList.length - 1 ? "1px solid hsl(var(--border-hsl) / 0.5)" : "none",
                          paddingBottom: "0.75rem"
                        }}>
                          <button
                            onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                            style={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "none",
                              border: "none",
                              padding: "0.5rem 0",
                              cursor: "pointer",
                              textAlign: "left"
                            }}
                          >
                            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground-hsl))" }}>{faq.q}</span>
                            {isExpanded ? <Minus size={16} style={{ color: "hsl(var(--accent-hsl))" }} /> : <Plus size={16} style={{ color: "hsl(var(--muted-hsl))" }} />}
                          </button>
                          {isExpanded && (
                            <p style={{
                              fontSize: "0.85rem",
                              color: "hsl(var(--muted-hsl))",
                              lineHeight: "1.5",
                              marginTop: "0.25rem",
                              paddingLeft: "0.25rem"
                            }}>
                              {faq.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
        .related-chip:hover {
          border-color: hsl(var(--accent-hsl)) !important;
          color: hsl(var(--accent-hsl)) !important;
          background-color: hsl(var(--accent-hsl) / 0.04) !important;
          transform: translateY(-1px);
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
