"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  Shield, 
  Search, 
  Phone, 
  HelpCircle, 
  Sparkles, 
  Package, 
  Tag, 
  ArrowRight, 
  Percent, 
  Truck, 
  LogOut, 
  Layers, 
  Check,
  ChevronRight,
  Shirt,
  CreditCard,
  FileText,
  Flag,
  Gift,
  Box,
  BadgeCheck
} from "lucide-react";

// Announcement messages
const ANNOUNCEMENTS = [
  "🚚 FREE SHIPPING on Custom Apparel orders over $150 | Use code APEXFREE",
  "⚡ INSTANT LOGO PREVIEW: Upload your logo and build apparel live",
  "✨ BULK SAVINGS: Save up to 40% on high-volume print orders",
  "🛡️ 100% Quality Guarantee on all custom print & apparel products"
];

// Rich Mega-Menu Default Categories Structure
const MEGA_MENU_CATEGORIES = [
  {
    id: "apparel",
    name: "Custom Apparel",
    badge: "HOT",
    icon: Shirt,
    href: "/products?category=apparel",
    subcategories: [
      { name: "T-Shirts & Tees", href: "/products?category=apparel&type=t-shirts", desc: "Short sleeve, long sleeve, performance tees" },
      { name: "Hoodies & Sweatshirts", href: "/products?category=apparel&type=hoodies", desc: "Fleece, zip-ups, pullover hoodies" },
      { name: "Polo Shirts", href: "/products?category=apparel&type=polos", desc: "Corporate embroiderable polo shirts" },
      { name: "Work Jackets & Outerwear", href: "/products?category=apparel&type=jackets", desc: "Heavy duty softshell & winter workwear" },
      { name: "Safety Vests & High-Vis", href: "/products?category=apparel&type=safety", desc: "ANSI compliant safety gear & vests" },
      { name: "Hats & Caps", href: "/products?category=apparel&type=caps", desc: "Snapbacks, beanies, embroidered caps" }
    ],
    spotlight: {
      title: "Live Logo Apparel Builder",
      desc: "Upload your business logo and see real-time garment mockups with instant pricing.",
      cta: "Build Custom Apparel",
      href: "/products?category=apparel",
      bgGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      accentColor: "#f97316"
    }
  },
  {
    id: "business-cards",
    name: "Business Cards",
    badge: "POPULAR",
    icon: CreditCard,
    href: "/products?category=business-cards",
    subcategories: [
      { name: "Standard Business Cards", href: "/products?category=business-cards", desc: "14pt & 16pt premium cardstock" },
      { name: "Velvet Soft-Touch", href: "/products?category=business-cards", desc: "Luxurious matte suede finish" },
      { name: "Gold & Silver Foil", href: "/products?category=business-cards", desc: "Metallic foil stamped details" },
      { name: "Spot UV Gloss", href: "/products?category=business-cards", desc: "Raised glossy textured accent" },
      { name: "Triple-Layer Heavyweight", href: "/products?category=business-cards", desc: "Ultra-thick color core cards" },
      { name: "Plastic & Clear Cards", href: "/products?category=business-cards", desc: "Durable waterproof plastic" }
    ],
    spotlight: {
      title: "Premium Soft-Touch Cards",
      desc: "Make an unforgettably tactile impression with 16pt velvet touch finish.",
      cta: "Explore Business Cards",
      href: "/products?category=business-cards",
      bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      accentColor: "#38bdf8"
    }
  },
  {
    id: "postcards-flyers",
    name: "Postcards & Marketing",
    icon: FileText,
    href: "/products?category=postcards-flyers",
    subcategories: [
      { name: "Postcards", href: "/products?category=postcards-flyers", desc: "Direct mail & promotional mailers" },
      { name: "Flyers & Leaflets", href: "/products?category=postcards-flyers", desc: "Full-color sales distribution flyers" },
      { name: "Brochures & Catalogs", href: "/products?category=postcards-flyers", desc: "Tri-fold, z-fold & bi-fold booklets" },
      { name: "Door Hangers", href: "/products?category=postcards-flyers", desc: "Local neighborhood marketing" },
      { name: "Rack Cards", href: "/products?category=postcards-flyers", desc: "Tourism & counter display cards" },
      { name: "Presentation Folders", href: "/products?category=postcards-flyers", desc: "Custom branded pocket folders" }
    ],
    spotlight: {
      title: "Direct Mail Postcards",
      desc: "High volume promotional prints delivered with crisp full-color offset quality.",
      cta: "View Print Products",
      href: "/products?category=postcards-flyers",
      bgGradient: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
      accentColor: "#818cf8"
    }
  },
  {
    id: "signs-banners",
    name: "Signs & Banners",
    icon: Flag,
    href: "/products?category=signs-banners",
    subcategories: [
      { name: "Vinyl Banners", href: "/products?category=signs-banners", desc: "13oz outdoor heavy duty vinyl" },
      { name: "Retractable Banner Stands", href: "/products?category=signs-banners", desc: "Pull-up tradeshow roll banners" },
      { name: "Yard & Coroplast Signs", href: "/products?category=signs-banners", desc: "Lawn signs with H-stakes" },
      { name: "Foam Board Signs", href: "/products?category=signs-banners", desc: "Smooth indoor event posters" },
      { name: "Car Magnets", href: "/products?category=signs-banners", desc: "Vehicle door marketing magnets" },
      { name: "Window Decals & Clings", href: "/products?category=signs-banners", desc: "Storefront adhesive graphics" }
    ],
    spotlight: {
      title: "Tradeshow Pull-Up Banners",
      desc: "Portable display banners ready to set up in under 30 seconds with carrying case.",
      cta: "Shop Banners & Signs",
      href: "/products?category=signs-banners",
      bgGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      accentColor: "#34d399"
    }
  },
  {
    id: "labels-stickers",
    name: "Labels & Packaging",
    icon: Box,
    href: "/products?category=labels-stickers",
    subcategories: [
      { name: "Roll Labels", href: "/products?category=labels-stickers", desc: "Automatic application product labels" },
      { name: "Die-Cut Custom Stickers", href: "/products?category=labels-stickers", desc: "Individual vinyl logo stickers" },
      { name: "Product Packaging Boxes", href: "/products?category=labels-stickers", desc: "Custom printed folding cartons" },
      { name: "Poly Mailers & Envelopes", href: "/products?category=labels-stickers", desc: "Branded shipping mailers" }
    ],
    spotlight: {
      title: "Custom Roll Labels",
      desc: "Waterproof, oil-resistant product labels printed with vibrant die-cut shapes.",
      cta: "Explore Packaging",
      href: "/products?category=labels-stickers",
      bgGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
      accentColor: "#fbbf24"
    }
  },
  {
    id: "promotional",
    name: "Promotional Swag",
    icon: Gift,
    href: "/products?category=promotional",
    subcategories: [
      { name: "Mugs & Drinkware", href: "/products?category=promotional", desc: "Ceramic mugs, tumblers & bottles" },
      { name: "Branded Pens & Stationery", href: "/products?category=promotional", desc: "Engraved metal & gel pens" },
      { name: "Tote Bags & Backpacks", href: "/products?category=promotional", desc: "Canvas totes & drawstring bags" },
      { name: "Lanyards & Badges", href: "/products?category=promotional", desc: "Event passes & custom lanyards" }
    ],
    spotlight: {
      title: "Corporate Swag Packages",
      desc: "Build lasting customer loyalty with custom laser-engraved promotional goods.",
      cta: "View Promo Items",
      href: "/products?category=promotional",
      bgGradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
      accentColor: "#f472b6"
    }
  }
];

export default function Header() {
  const router = useRouter();
  const { user, userData, logout } = useAuth();
  const { cart, cartCount } = useCart();
  
  // State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  
  // Menus & Overlays
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchCat, setSelectedSearchCat] = useState("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const searchRef = useRef(null);
  const megaMenuTimeoutRef = useRef(null);

  // Cycle Announcements
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAnnouncement((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Fetch Firestore categories and products for live autocompletion
  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const catQ = query(collection(db, "categories"), orderBy("displayOrder", "asc"));
        const catSnap = await getDocs(catQ);
        const catList = [];
        catSnap.forEach(doc => catList.push({ id: doc.id, ...doc.data() }));
        setCategories(catList);

        const prodSnap = await getDocs(collection(db, "products"));
        const prodList = [];
        prodSnap.forEach(doc => {
          const data = doc.data();
          if (data.isVisible !== false) {
            prodList.push({ id: doc.id, ...data });
          }
        });
        setProducts(prodList);
      } catch (e) {
        console.error("Error loading header data:", e);
      }
    };
    fetchCatalogData();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = user && (
    userData?.role === "admin" || 
    user.email === "admin@apexworkwear.ca" ||
    user.email?.endsWith("@apexworkwear.ca")
  );

  // Search filter logic
  const matchingProducts = products.filter(p => {
    if (!searchQuery.trim()) return false;
    const matchesText = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedSearchCat === "all" || p.categoryId === selectedSearchCat;
    return matchesText && matchesCategory;
  }).slice(0, 5);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim() && selectedSearchCat === "all") return;
    setIsSearchFocused(false);
    let url = `/products?search=${encodeURIComponent(searchQuery)}`;
    if (selectedSearchCat !== "all") {
      url += `&category=${selectedSearchCat}`;
    }
    router.push(url);
  };

  const handleMouseEnterMegaMenu = (catId) => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setActiveMegaMenu(catId);
  };

  const handleMouseLeaveMegaMenu = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 150);
  };

  // Compute Cart Subtotal for Mini Cart Preview
  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.price || item.unitPrice || 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#ffffff" }}>
      {/* 1. TOP ANNOUNCEMENT & UTILITY BAR */}
      <div style={{
        backgroundColor: "hsl(var(--primary-hsl))",
        color: "#ffffff",
        fontSize: "0.8rem",
        padding: "0.45rem 1.5rem",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{
          maxWidth: "1380px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem"
        }}>
          {/* Left: Contact Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }} className="header-top-left">
            <a 
              href="tel:18662074955" 
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#e2e8f0", textDecoration: "none" }}
              className="top-bar-link"
            >
              <Phone size={13} style={{ color: "hsl(var(--accent-hsl))" }} />
              <span style={{ fontWeight: 600 }}>1.866.207.4955</span>
            </a>
            <span style={{ opacity: 0.3 }}>|</span>
            <Link href="/contact" style={{ color: "#cbd5e1", textDecoration: "none" }} className="top-bar-link">
              Help Center & Contact
            </Link>
          </div>

          {/* Middle: Rotating Announcement Ticker */}
          <div style={{
            flex: 1,
            textAlign: "center",
            fontWeight: 500,
            letterSpacing: "0.01em",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis"
          }}>
            <span style={{
              display: "inline-block",
              transition: "all 0.3s ease",
              color: "#f8fafc"
            }}>
              {ANNOUNCEMENTS[activeAnnouncement]}
            </span>
          </div>

          {/* Right: Quick Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }} className="header-top-right">
            <Link href="/account" style={{ color: "#cbd5e1", textDecoration: "none" }} className="top-bar-link">
              Track Order
            </Link>
            <span style={{ opacity: 0.3 }}>|</span>
            <span style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem"
            }}>
              🇨🇦 CAD ($)
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid hsl(var(--border-hsl))",
        padding: "0.75rem 1.5rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)"
      }}>
        <div style={{
          maxWidth: "1380px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem"
        }}>
          {/* Logo Section */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", flexShrink: 0 }}>
            <img 
              src="/Apex-Workwear-Logo-Horizontal.webp" 
              alt="Apex Workwear Logo" 
              style={{ height: "46px", width: "auto", display: "block" }} 
            />
          </Link>

          {/* Center Omnibox Search Bar */}
          <div 
            ref={searchRef} 
            style={{ flex: 1, maxWidth: "620px", position: "relative" }} 
            className="desktop-search-container"
          >
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", width: "100%", position: "relative" }}>
              {/* Category Select Dropdown */}
              <select
                value={selectedSearchCat}
                onChange={(e) => setSelectedSearchCat(e.target.value)}
                style={{
                  backgroundColor: "hsl(var(--secondary-hsl))",
                  border: "1px solid hsl(var(--border-hsl))",
                  borderRight: "none",
                  borderTopLeftRadius: "var(--radius-md)",
                  borderBottomLeftRadius: "var(--radius-md)",
                  padding: "0 0.85rem",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "hsl(var(--foreground-hsl))",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "140px"
                }}
              >
                <option value="all">All Categories</option>
                {MEGA_MENU_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Input Field */}
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search t-shirts, business cards, vinyl banners, hoodies..."
                  style={{
                    width: "100%",
                    padding: "0.7rem 2.2rem 0.7rem 1rem",
                    fontSize: "0.9rem",
                    border: "1px solid hsl(var(--border-hsl))",
                    borderLeft: "1px solid hsl(var(--border-hsl) / 0.5)",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    outline: "none",
                    backgroundColor: "#ffffff",
                    transition: "border-color 0.2s ease"
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "hsl(var(--muted-hsl))",
                      cursor: "pointer"
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Submit Search Button */}
              <button
                type="submit"
                style={{
                  backgroundColor: "hsl(var(--accent-hsl))",
                  color: "#ffffff",
                  border: "none",
                  borderTopRightRadius: "var(--radius-md)",
                  borderBottomRightRadius: "var(--radius-md)",
                  padding: "0 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease"
                }}
                className="search-btn-hover"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            </form>

            {/* LIVE SEARCH AUTOCOMPLETE POPUP */}
            {isSearchFocused && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "6px",
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
                border: "1px solid hsl(var(--border-hsl))",
                zIndex: 200,
                overflow: "hidden"
              }}>
                {/* Popular Tags / Trending */}
                {!searchQuery && (
                  <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      Popular Searches
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {["Custom T-Shirts", "16pt Business Cards", "Retractable Banner", "Safety Vest", "Die-Cut Stickers", "Corporate Polos"].map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSearchQuery(tag);
                            router.push(`/products?search=${encodeURIComponent(tag)}`);
                            setIsSearchFocused(false);
                          }}
                          style={{
                            padding: "0.3rem 0.65rem",
                            borderRadius: "20px",
                            backgroundColor: "hsl(var(--secondary-hsl))",
                            border: "1px solid hsl(var(--border-hsl))",
                            fontSize: "0.8rem",
                            color: "hsl(var(--foreground-hsl))",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          className="tag-chip"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Results List */}
                {searchQuery && (
                  <div>
                    {matchingProducts.length > 0 ? (
                      <div>
                        <div style={{ padding: "0.6rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.5)", fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>
                          PRODUCT MATCHES ({matchingProducts.length})
                        </div>
                        {matchingProducts.map((p) => (
                          <Link
                            key={p.id}
                            href={`/products?product=${p.id}`}
                            onClick={() => setIsSearchFocused(false)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.85rem",
                              padding: "0.75rem 1rem",
                              borderBottom: "1px solid hsl(var(--border-hsl) / 0.4)",
                              textDecoration: "none",
                              color: "hsl(var(--foreground-hsl))",
                              transition: "background-color 0.15s ease"
                            }}
                            className="search-item-hover"
                          >
                            <img
                              src={p.image || p.imageUrl || "/Apex-Workwear-Logo-Horizontal.webp"}
                              alt={p.name}
                              style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px", backgroundColor: "#f8fafc", padding: "2px" }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.name}
                              </p>
                              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                                {p.categoryName || "Print Product"}
                              </p>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "hsl(var(--accent-hsl))" }}>
                              ${p.price || p.basePrice || "0.00"}
                            </div>
                          </Link>
                        ))}
                        <button
                          onClick={handleSearchSubmit}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            backgroundColor: "hsl(var(--secondary-hsl))",
                            border: "none",
                            fontSize: "0.825rem",
                            fontWeight: 700,
                            color: "hsl(var(--accent-hsl))",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.35rem"
                          }}
                        >
                          View all results for &quot;{searchQuery}&quot; <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>No products found for &quot;{searchQuery}&quot;</p>
                        <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Try searching for t-shirts, business cards, banners or hoodies</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side Action Group */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Custom Apparel Builder CTA */}
            <Link
              href="/products?category=apparel"
              className="btn btn-primary"
              style={{
                padding: "0.55rem 1.15rem",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                textDecoration: "none"
              }}
            >
              <Sparkles size={16} />
              <span className="cta-btn-text">Logo Builder</span>
            </Link>

            {/* Account Trigger */}
            <div style={{ position: "relative" }}>
              {user ? (
                <div>
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      transition: "background-color 0.2s ease"
                    }}
                    className="icon-btn-hover"
                  >
                    <div style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      backgroundColor: "hsl(var(--primary-hsl))",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem"
                    }}>
                      {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </div>
                    <ChevronDown size={14} style={{ color: "hsl(var(--muted-hsl))" }} />
                  </button>

                  {/* Account Dropdown */}
                  {accountMenuOpen && (
                    <div 
                      onMouseLeave={() => setAccountMenuOpen(false)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: "8px",
                        width: "240px",
                        backgroundColor: "#ffffff",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
                        border: "1px solid hsl(var(--border-hsl))",
                        zIndex: 200,
                        padding: "0.5rem 0"
                      }}
                    >
                      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                        <p style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                          {userData?.name || user.email?.split("@")[0]}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user.email}
                        </p>
                      </div>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setAccountMenuOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.65rem 1rem",
                            fontSize: "0.85rem",
                            color: "hsl(var(--accent-hsl))",
                            fontWeight: 700,
                            textDecoration: "none"
                          }}
                          className="dropdown-item"
                        >
                          <Shield size={16} /> Admin Portal
                        </Link>
                      )}

                      <Link
                        href="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.65rem 1rem",
                          fontSize: "0.85rem",
                          color: "hsl(var(--foreground-hsl))",
                          textDecoration: "none"
                        }}
                        className="dropdown-item"
                      >
                        <Package size={16} /> My Orders & Proofs
                      </Link>

                      <button
                        onClick={() => {
                          logout();
                          setAccountMenuOpen(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.65rem 1rem",
                          fontSize: "0.85rem",
                          color: "hsl(var(--destructive-hsl))",
                          cursor: "pointer",
                          borderTop: "1px solid hsl(var(--border-hsl))"
                        }}
                        className="dropdown-item"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/account/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "hsl(var(--foreground-hsl))",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "var(--radius-sm)"
                  }}
                  className="icon-btn-hover"
                >
                  <User size={20} />
                  <span className="account-text">Sign In</span>
                </Link>
              )}
            </div>

            {/* Cart Trigger with Hover Preview */}
            <div 
              style={{ position: "relative" }}
              onMouseEnter={() => setCartPreviewOpen(true)}
              onMouseLeave={() => setCartPreviewOpen(false)}
            >
              <Link 
                href="/cart" 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "hsl(var(--secondary-hsl))",
                  color: "hsl(var(--foreground-hsl))",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  position: "relative"
                }} 
                aria-label="Shopping Cart"
              >
                <div style={{ position: "relative" }}>
                  <ShoppingCart size={20} />
                  {cartCount > 0 && (
                    <span style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-10px",
                      backgroundColor: "hsl(var(--accent-hsl))",
                      color: "white",
                      fontSize: "0.675rem",
                      fontWeight: 800,
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "10px",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #ffffff"
                    }}>
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="cart-text">${cartSubtotal.toFixed(2)}</span>
              </Link>

              {/* MINI CART PREVIEW POPUP */}
              {cartPreviewOpen && cart.length > 0 && (
                <div style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "8px",
                  width: "320px",
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
                  border: "1px solid hsl(var(--border-hsl))",
                  zIndex: 200,
                  padding: "1rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>Shopping Cart ({cartCount})</span>
                    <Link href="/cart" style={{ fontSize: "0.75rem", color: "hsl(var(--accent-hsl))", fontWeight: 700 }}>View All</Link>
                  </div>

                  <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {cart.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <img 
                          src={item.image || item.mockupUrl || "/Apex-Workwear-Logo-Horizontal.webp"} 
                          alt={item.name} 
                          style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", backgroundColor: "#f8fafc" }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                          <p style={{ fontSize: "0.725rem", color: "hsl(var(--muted-hsl))" }}>Qty: {item.quantity || 1}</p>
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>${((item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                    {cart.length > 3 && (
                      <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", textAlign: "center" }}>+ {cart.length - 3} more item(s)</p>
                    )}
                  </div>

                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid hsl(var(--border-hsl))" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                      <span>Subtotal</span>
                      <span style={{ color: "hsl(var(--accent-hsl))" }}>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <Link 
                      href="/checkout" 
                      className="btn btn-primary" 
                      style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem", textAlign: "center" }}
                    >
                      Checkout Now
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger Toggle */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "hsl(var(--foreground-hsl))",
                padding: "0.35rem"
              }}
              className="mobile-toggle"
              aria-label="Toggle Menu"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. CATEGORY MEGA-MENU NAVIGATION BAR (DESKTOP) */}
      <nav 
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid hsl(var(--border-hsl))",
          position: "relative"
        }}
        className="desktop-mega-nav"
      >
        <div style={{
          maxWidth: "1380px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0 1.5rem"
        }}>
          {MEGA_MENU_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isHovered = activeMegaMenu === cat.id;

            return (
              <div 
                key={cat.id}
                onMouseEnter={() => handleMouseEnterMegaMenu(cat.id)}
                onMouseLeave={handleMouseLeaveMegaMenu}
                style={{ position: "static" }}
              >
                <Link
                  href={cat.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.85rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: isHovered ? 700 : 600,
                    color: isHovered ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl))",
                    textDecoration: "none",
                    borderBottom: isHovered ? "2px solid hsl(var(--accent-hsl))" : "2px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Icon size={16} style={{ color: isHovered ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))" }} />
                  <span>{cat.name}</span>
                  {cat.badge && (
                    <span style={{
                      backgroundColor: cat.badge === "HOT" ? "hsl(var(--accent-hsl))" : "hsl(var(--primary-hsl))",
                      color: "#ffffff",
                      fontSize: "0.625rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "10px",
                      letterSpacing: "0.02em"
                    }}>
                      {cat.badge}
                    </span>
                  )}
                  <ChevronDown size={14} style={{ opacity: 0.5 }} />
                </Link>

                {/* MEGA MENU OVERLAY PANEL */}
                {isHovered && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    borderBottom: "1px solid hsl(var(--border-hsl))",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
                    zIndex: 150,
                    animation: "fadeIn 0.2s ease-in-out"
                  }}>
                    <div style={{
                      maxWidth: "1380px",
                      margin: "0 auto",
                      padding: "2rem 1.5rem",
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "2.5rem"
                    }}>
                      {/* Left: Subcategories Grid */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: "1.25rem" }}>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>Explore {cat.name}</h3>
                          <Link href={cat.href} style={{ fontSize: "0.825rem", color: "hsl(var(--accent-hsl))", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            View All Products <ArrowRight size={14} />
                          </Link>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                          {cat.subcategories.map((sub, sIdx) => (
                            <Link
                              key={sIdx}
                              href={sub.href}
                              onClick={() => setActiveMegaMenu(null)}
                              style={{
                                padding: "0.75rem",
                                borderRadius: "var(--radius-md)",
                                backgroundColor: "hsl(var(--secondary-hsl) / 0.4)",
                                textDecoration: "none",
                                display: "block",
                                transition: "all 0.2s ease",
                                border: "1px solid transparent"
                              }}
                              className="subcategory-card-hover"
                            >
                              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "hsl(var(--foreground-hsl))" }}>
                                {sub.name}
                              </p>
                              <p style={{ fontSize: "0.775rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                                {sub.desc}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Right: Category Spotlight Feature */}
                      {cat.spotlight && (
                        <div style={{
                          background: cat.spotlight.bgGradient,
                          borderRadius: "var(--radius-lg)",
                          padding: "1.75rem",
                          color: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          position: "relative",
                          overflow: "hidden"
                        }}>
                          <div style={{ position: "relative", zIndex: 1 }}>
                            <span style={{
                              backgroundColor: "rgba(255, 255, 255, 0.15)",
                              color: cat.spotlight.accentColor,
                              fontSize: "0.725rem",
                              fontWeight: 800,
                              padding: "0.25rem 0.6rem",
                              borderRadius: "20px",
                              display: "inline-block",
                              marginBottom: "1rem"
                            }}>
                              SPOTLIGHT FEATURE
                            </span>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.5rem" }}>
                              {cat.spotlight.title}
                            </h4>
                            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                              {cat.spotlight.desc}
                            </p>
                          </div>

                          <div style={{ marginTop: "1.5rem", position: "relative", zIndex: 1 }}>
                            <Link
                              href={cat.spotlight.href}
                              onClick={() => setActiveMegaMenu(null)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                backgroundColor: cat.spotlight.accentColor,
                                color: "#ffffff",
                                padding: "0.6rem 1.25rem",
                                borderRadius: "var(--radius-md)",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                textDecoration: "none"
                              }}
                              className="spotlight-cta-hover"
                            >
                              {cat.spotlight.cta} <ArrowRight size={16} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Contact & Deals pill */}
          <Link
            href="/products?sort=deals"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
              color: "hsl(var(--accent-hsl))",
              fontSize: "0.825rem",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            <Tag size={14} /> Clearances & Deals
          </Link>
        </div>
      </nav>

      {/* 4. MOBILE DRAWER MENU */}
      {menuOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 300,
          display: "flex"
        }}>
          <div style={{
            width: "85%",
            maxWidth: "360px",
            backgroundColor: "#ffffff",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            boxShadow: "0 0 25px rgba(0, 0, 0, 0.2)"
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: "1rem 1.25rem",
              backgroundColor: "hsl(var(--primary-hsl))",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <img 
                src="/Apex-Workwear-Logo-Horizontal.webp" 
                alt="Apex Workwear Logo" 
                style={{ height: "36px", width: "auto", filter: "brightness(0) invert(1)" }} 
              />
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            {/* Mobile Search */}
            <div style={{ padding: "1rem", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid hsl(var(--border-hsl))",
                    outline: "none"
                  }}
                />
                <button type="submit" style={{ backgroundColor: "hsl(var(--accent-hsl))", color: "#ffffff", border: "none", padding: "0 0.85rem", borderRadius: "var(--radius-sm)" }}>
                  <Search size={16} />
                </button>
              </form>
            </div>

            {/* Mobile Links */}
            <div style={{ flex: 1, padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Link href="/" onClick={() => setMenuOpen(false)} style={{ fontWeight: 700, fontSize: "1rem" }}>
                Home
              </Link>
              
              <Link href="/products?category=apparel" onClick={() => setMenuOpen(false)} style={{ fontWeight: 700, fontSize: "1rem", color: "hsl(var(--accent-hsl))", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} /> Design Custom Apparel
              </Link>

              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Product Categories
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "0.5rem" }}>
                  {MEGA_MENU_CATEGORIES.map(cat => (
                    <Link
                      key={cat.id}
                      href={cat.href}
                      onClick={() => setMenuOpen(false)}
                      style={{ fontWeight: 600, fontSize: "0.925rem", color: "hsl(var(--foreground-hsl))", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight size={16} style={{ color: "hsl(var(--muted-hsl))" }} />
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Link href="/about" onClick={() => setMenuOpen(false)} style={{ fontWeight: 600, fontSize: "0.925rem" }}>About Us</Link>
                <Link href="/contact" onClick={() => setMenuOpen(false)} style={{ fontWeight: 600, fontSize: "0.925rem" }}>Contact & Support</Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ fontWeight: 700, fontSize: "0.925rem", color: "hsl(var(--accent-hsl))", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Shield size={18} /> Admin Portal
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile Footer */}
            <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl))", borderTop: "1px solid hsl(var(--border-hsl))" }}>
              <a href="tel:18662074955" style={{ display: "flex", alignItems: "center", justifyCenter: "center", gap: "0.5rem", fontWeight: 700, color: "hsl(var(--primary-hsl))", textDecoration: "none", fontSize: "0.9rem" }}>
                <Phone size={16} /> Call 1.866.207.4955
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic CSS Styles for Header Hover & Responsiveness */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .top-bar-link:hover {
          color: #ffffff !important;
          text-decoration: underline !important;
        }
        .search-btn-hover:hover {
          background-color: hsl(var(--accent-hover-hsl)) !important;
        }
        .search-item-hover:hover {
          background-color: hsl(var(--secondary-hsl) / 0.8) !important;
        }
        .tag-chip:hover {
          background-color: hsl(var(--accent-hsl) / 0.15) !important;
          border-color: hsl(var(--accent-hsl)) !important;
          color: hsl(var(--accent-hsl)) !important;
        }
        .dropdown-item:hover {
          background-color: hsl(var(--secondary-hsl)) !important;
        }
        .subcategory-card-hover:hover {
          background-color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
          border-color: hsl(var(--accent-hsl) / 0.3) !important;
        }
        .spotlight-cta-hover:hover {
          opacity: 0.95 !important;
          transform: translateY(-1px) !important;
        }
        .icon-btn-hover:hover {
          background-color: hsl(var(--secondary-hsl)) !important;
        }
        @media (max-width: 1024px) {
          .desktop-search-container {
            max-width: 380px !important;
          }
          .cta-btn-text {
            display: none;
          }
        }
        @media (max-width: 840px) {
          .desktop-mega-nav, .desktop-search-container, .header-top-left, .header-top-right, .account-text, .cart-text {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}

