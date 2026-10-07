"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, limit, query, where } from "firebase/firestore";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Loader2, 
  Sparkles, 
  Shirt, 
  ShieldCheck, 
  Truck, 
  ChevronRight,
  Info,
  CheckCircle2,
  Tag,
  Layers
} from "lucide-react";
import { motion } from "framer-motion";
import ApparelMockupEditor from "@/components/ApparelMockupEditor";

export default function ApparelDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const productId = params.id;
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Fetch apparel product from `apparel_products` collection
  useEffect(() => {
    async function fetchApparelProduct() {
      try {
        setLoading(true);
        setError("");

        const docRef = doc(db, "apparel_products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          // Check fallback in custom products if needed
          const fallbackRef = doc(db, "products", productId);
          const fallbackSnap = await getDoc(fallbackRef);
          if (fallbackSnap.exists() && (fallbackSnap.data().isApparel || fallbackSnap.data().apparelViews || fallbackSnap.data().garmentViews)) {
            setProduct({ id: fallbackSnap.id, ...fallbackSnap.data() });
          } else {
            setError("Apparel product not found.");
          }
        } else {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching apparel product:", err);
        setError("Failed to load apparel details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchApparelProduct();
    }
  }, [productId]);

  // Fetch related apparel products in the same category
  useEffect(() => {
    async function fetchRelated() {
      if (!product) return;
      try {
        const colRef = collection(db, "apparel_products");
        const snap = await getDocs(query(colRef, limit(6)));
        const items = [];
        snap.docs.forEach((d) => {
          if (d.id !== productId && d.data().isVisible !== false) {
            items.push({ id: d.id, ...d.data() });
          }
        });
        setRelatedProducts(items.slice(0, 4));
      } catch (err) {
        console.error("Error fetching related apparel:", err);
      }
    }
    if (product) {
      fetchRelated();
    }
  }, [product, productId]);

  const handleApparelAddToCart = (mockupCartPayload) => {
    if (!product) return;

    const basePrice = parseFloat(product.basePrice || product.price || 0);

    addToCart({
      productId: product.id,
      name: product.name || "Custom Apparel",
      images: [
        product.garmentViews?.front?.image ||
        product.apparelViews?.front?.image ||
        product.thumbnail ||
        product.imageUrl
      ].filter(Boolean),
      categoryId: product.category || "Apparel",
      category: product.category || "Apparel",
      basePrice: basePrice,
      price: mockupCartPayload.unitPrice || basePrice,
      ...mockupCartPayload,
      isApparel: true,
      isCustom: true
    });

    router.push("/cart");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F8FAFC" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
          <Loader2 size={40} className="animate-spin" style={{ color: "#2563EB" }} />
          <span style={{ fontSize: "1rem", color: "#64748B", fontWeight: 600 }}>Loading custom apparel studio...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F8FAFC" }}>
        <Header />
        <div style={{ maxWidth: "800px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center", background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E2E8F0", width: "90%" }}>
          <Shirt size={56} style={{ color: "#94A3B8", margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0F172A", marginBottom: "0.75rem" }}>
            {error || "Apparel Product Not Found"}
          </h1>
          <p style={{ color: "#64748B", fontSize: "1rem", marginBottom: "2rem" }}>
            The apparel product you are looking for does not exist or may have been updated.
          </p>
          <Link href="/apparel" className="btn btn-primary" style={{ padding: "0.75rem 1.75rem" }}>
            Browse All Custom Apparel
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = product.name || "Custom Apparel";
  const views = product.garmentViews || product.apparelViews || {};
  const startingPrice = parseFloat(product.basePrice || product.price || 0);
  const moq = parseInt(product.minimumOrderQuantity || product.moq || 12);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F8FAFC" }}>
      <Header />

      {/* Top Breadcrumb & Header Bar */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "1.25rem 1.5rem" }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#64748B", marginBottom: "0.75rem" }}>
            <Link href="/" style={{ color: "#64748B", textDecoration: "none" }}>Home</Link>
            <ChevronRight size={14} />
            <Link href="/apparel" style={{ color: "#64748B", textDecoration: "none" }}>Apparel & Embroidery</Link>
            {product.category && (
              <>
                <ChevronRight size={14} />
                <Link href={`/apparel?category=${encodeURIComponent(product.category)}`} style={{ color: "#64748B", textDecoration: "none" }}>
                  {product.category}
                </Link>
              </>
            )}
            <ChevronRight size={14} />
            <span style={{ color: "#0F172A", fontWeight: 700 }}>{title}</span>
          </div>

          {/* Product Header Title and Quick Badges */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.65rem", borderRadius: "6px", background: "#EFF6FF", color: "#2563EB", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                <Shirt size={13} />
                {product.category || "Custom Apparel"}
              </div>
              <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 900, color: "#0F172A", lineHeight: 1.2, margin: 0, letterSpacing: "-0.02em" }}>
                {title}
              </h1>
              {product.sku && (
                <span style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "0.25rem", display: "inline-block" }}>
                  Item SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Price & MOQ Summary */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Base Blank Price
                </span>
                <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2563EB" }}>
                  ${startingPrice.toFixed(2)}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}> /piece</span>
              </div>

              <div style={{ padding: "0.6rem 1rem", borderRadius: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", textAlign: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Minimum Order</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A" }}>{moq} pcs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Area */}
      <main style={{ maxWidth: "1300px", margin: "0 auto", padding: "2rem 1.5rem 5rem", width: "100%", flex: 1, display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Visual Mockup Configurator & 2D/3D Positioning Engine */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06)",
          padding: "1.5rem",
          overflow: "hidden"
        }}>
          <ApparelMockupEditor
            productName={title}
            garmentViews={views}
            moq={moq}
            basePrice={startingPrice}
            onAddToCart={handleApparelAddToCart}
          />
        </div>

        {/* Feature Highlights Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.25rem", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", margin: "0 0 0.25rem" }}>High-Density Embroidery</h4>
              <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                Ultra-precise digitized stitching for chest logos, sleeve patches, and back embroidery.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.25rem", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981", flexShrink: 0 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", margin: "0 0 0.25rem" }}>Commercial Durability</h4>
              <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                Industrial wash-tested fabrics designed for rugged work sites, hospitality, and corporate teams.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.25rem", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#FAF5FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333EA", flexShrink: 0 }}>
              <Truck size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", margin: "0 0 0.25rem" }}>Canada-Wide Direct Delivery</h4>
              <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                Fast, tracked ground freight across Ontario, Alberta, BC, Quebec, and all Canadian provinces.
              </p>
            </div>
          </div>
        </div>

        {/* Product Details, Fabric Specs & Garment Care */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0F172A", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={20} style={{ color: "#2563EB" }} />
            Garment Specifications & Care
          </h3>

          <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem", lineHeight: 1.7, color: "#334155", maxWidth: "900px" }}>
            {product.description || product.longDescription || "Crafted from premium heavy-duty combed cotton and polyester blends for unmatched comfort, vibrant print reproduction, and all-day workplace resilience."}
          </div>

          {/* Sizing & Material details if option groups exist */}
          {product.optionGroups && Object.keys(product.optionGroups).length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #F1F5F9" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", marginBottom: "0.75rem" }}>Available Options & Sizes</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {Object.entries(product.optionGroups).map(([groupName, opts]) => (
                  <div key={groupName} style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "block" }}>{groupName}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>
                      {Array.isArray(opts) ? opts.map(o => typeof o === 'string' ? o : o.name).join(", ") : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Apparel Products */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0F172A", margin: 0 }}>
                More Custom Apparel Styles
              </h3>
              <Link href="/apparel" style={{ fontSize: "0.85rem", color: "#2563EB", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                View Full Apparel Catalog <ChevronRight size={14} />
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
              {relatedProducts.map((rel) => {
                const relViews = rel.garmentViews || rel.apparelViews || {};
                const relImg = relViews.front?.image || rel.thumbnail || rel.imageUrl;
                const relPrice = parseFloat(rel.basePrice || rel.price || 0);

                return (
                  <Link key={rel.id} href={`/apparel/${rel.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{
                      background: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 8px 18px -4px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    >
                      <div style={{ width: "100%", paddingTop: "90%", position: "relative", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                        {relImg ? (
                          <img src={relImg} alt={rel.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: "0.75rem" }} />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1" }}>
                            <Shirt size={40} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0F172A", margin: "0 0 0.5rem", lineHeight: 1.35 }}>
                          {rel.name}
                        </h4>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid #F1F5F9" }}>
                          <span style={{ fontSize: "1rem", fontWeight: 900, color: "#2563EB" }}>${relPrice.toFixed(2)}</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 600 }}>Min: {rel.minimumOrderQuantity || rel.moq || 12}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
