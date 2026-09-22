"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Printer, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Star, 
  Sparkles, 
  Percent, 
  Search, 
  Package, 
  Clock,
  ChevronDown,
  ChevronUp,
  Check
} from "lucide-react";

export default function HomeClient({ categories, featuredProducts = [] }) {
  const [searchVal, setSearchVal] = useState("");
  const [activeFaq, setActiveFaq] = useState(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const sliderImages = ["/assets/1.webp", "/assets/2.webp", "/assets/3.webp", "/assets/4.webp"];

  // Preload all slider images on initial render to prevent load flickers
  useEffect(() => {
    sliderImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Pause rotation on hover
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setSliderIndex((prev) => (prev + 1) % sliderImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, sliderImages.length]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const trendingProducts = [
    {
      id: "1",
      name: "16pt Premium Business Cards",
      category: "Business Cards",
      price: "$13.22",
      image: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop",
      badge: "Best Seller"
    },
    {
      id: "2",
      name: "100lb Gloss Book Flyers",
      category: "Gloss Flyers",
      price: "$28.50",
      image: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?q=80&w=600&auto=format&fit=crop",
      badge: "Trending"
    },
    {
      id: "3",
      name: "NCR Carbonless Invoice Books",
      category: "NCR Forms",
      price: "$45.99",
      image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop",
      badge: "Popular"
    },
    {
      id: "4",
      name: "4mm Coroplast Yard Signs",
      category: "Coroplast Yard Signs",
      price: "$18.75",
      image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
      badge: "Outdoor"
    }
  ];

  return (
    <div style={{ backgroundColor: "hsl(var(--background-hsl))" }}>
      <Header />
      {/* 1. HERO SECTION (Image Slider Only - Smooth Stacked Preloaded Crossfade) */}
      <section style={{
        position: "relative",
        padding: "0",
        backgroundColor: "hsl(var(--primary-hsl))",
        color: "white",
        overflow: "hidden"
      }}>
        {/* Background Gradients */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244, 63, 94, 0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none"
        }} />

        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "100%",
            aspectRatio: "16 / 6.5",
            minHeight: "400px",
            margin: "0",
            overflow: "hidden",
            zIndex: 10,
            backgroundColor: "#0f172a"
          }}
        >
          {/* Stacked Images - Crossfade Transition to prevent layout shift & unmount glitches */}
          {sliderImages.map((src, idx) => (
            <motion.img
              key={src}
              src={src}
              alt={`Slider banner ${idx + 1}`}
              initial={false}
              animate={{ 
                opacity: idx === sliderIndex ? 1 : 0
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                pointerEvents: idx === sliderIndex ? "auto" : "none",
                zIndex: idx === sliderIndex ? 2 : 1
              }}
            />
          ))}

          {/* Optional Pause Pill on Hover */}
          {isPaused && (
            <div style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              backgroundColor: "rgba(0,0,0,0.65)",
              color: "white",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
              zIndex: 35,
              pointerEvents: "none"
            }}>
              Paused
            </div>
          )}
          
          {/* Dots navigation */}
          <div style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.75rem",
            zIndex: 30,
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "0.5rem 1rem",
            borderRadius: "40px",
            backdropFilter: "blur(4px)"
          }}>
            {sliderImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSliderIndex(idx)}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: sliderIndex === idx ? "hsl(var(--accent-hsl))" : "rgba(255,255,255,0.4)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.2s ease"
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Left & Right arrow controls */}
          <button
            onClick={() => setSliderIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length)}
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              transition: "background-color 0.2s ease",
              fontSize: "1.25rem",
              fontWeight: 700,
              zIndex: 30
            }}
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={() => setSliderIndex((prev) => (prev + 1) % sliderImages.length)}
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              transition: "background-color 0.2s ease",
              fontSize: "1.25rem",
              fontWeight: 700,
              zIndex: 30
            }}
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </section>

      {/* 2. TRUST/VALUE BAND */}
      <section style={{
        padding: "2rem 1.5rem",
        backgroundColor: "white",
        borderBottom: "1px solid hsl(var(--border-hsl))"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "2rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))" }}>
              <Clock size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Next-Day Turnarounds</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>GTA shipping calculation on checkout</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))" }}>
              <Package size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Zero Order Minimums</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Print small batches or large volume orders</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Finished in Ontario</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Proudly finished locally in Canadian plants</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))" }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Wholesale Trade Prices</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Wholesale print prices mapped dynamically</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. POPULAR CATEGORIES GRID */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--accent-hsl))" }}>Catalog</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem" }}>Shop Popular Printing Categories</h2>
            </div>
            <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, fontSize: "0.9rem", color: "hsl(var(--accent-hsl))" }}>
              All Products <ArrowRight size={16} />
            </Link>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "2rem"
            }}
          >
            {categories.map((cat) => (
              <motion.div 
                key={cat.id}
                variants={itemVariants}
                style={{ height: "100%" }}
              >
                <Link href={`/products?category=${cat.id}`} style={{ display: "block", height: "100%" }}>
                  <div className="card card-hover" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", height: "100%", border: "1px solid hsl(var(--border-hsl))" }}>
                    {cat.heroImage && (
                      <div style={{ width: "100%", height: "200px", overflow: "hidden", position: "relative" }}>
                        <img
                          src={cat.heroImage}
                          alt={cat.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.4s ease"
                          }}
                          className="category-card-img"
                        />
                        <div style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: "rgba(0,0,0,0.025)",
                          pointerEvents: "none"
                        }} />
                      </div>
                    )}
                    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", flexGrow: 1, gap: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{cat.name}</h3>
                      <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", flexGrow: 1, lineHeight: "1.5" }}>
                        {cat.description || `Custom configured print specs for ${cat.name.toLowerCase()}.`}
                      </p>
                      <span style={{ 
                        fontSize: "0.8rem", 
                        fontWeight: 700, 
                        color: "hsl(var(--accent-hsl))",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        marginTop: "0.5rem"
                      }}>
                        Explore Options <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. PROMOTIONAL BANNER */}
      <section style={{ padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="orange-gradient-bg" style={{
            borderRadius: "var(--radius-lg)",
            padding: "3.5rem 3rem",
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-accent)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxWidth: "100%"
          }}>
            <div style={{
              position: "absolute",
              top: "-50%",
              right: "-10%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)",
              pointerEvents: "none"
            }} />
            
            <div style={{ position: "relative", zIndex: 2, maxWidth: "600px" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.75rem",
                fontWeight: 900,
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: "0.25rem 0.65rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                marginBottom: "0.5rem"
              }}>
                <Percent size={12} /> Bulk Orders Discount
              </span>
              <h2 style={{ color: "white", fontSize: "2rem", fontWeight: 800 }}>Need custom volumes or contractor pricing?</h2>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", marginTop: "0.5rem" }}>
                We provide custom estimates for high-volume orders. Get in touch with our team for contract pricing on business stationery, brochures, or flyers.
              </p>
            </div>
            
            <div style={{ position: "relative", zIndex: 2 }}>
              <Link href="/contact" className="btn" style={{
                backgroundColor: "white",
                color: "hsl(var(--accent-hsl))",
                padding: "0.75rem 1.5rem"
              }}>
                Get Custom Quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED/TRENDING PRODUCTS ROW */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "white" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "2.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--accent-hsl))" }}>Trending</span>
            <h2 style={{ fontSize: "2.0rem", fontWeight: 800, marginTop: "0.25rem" }}>Best Sellers & Featured Prints</h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "2rem"
          }}>
            {(featuredProducts && featuredProducts.length > 0 ? featuredProducts : trendingProducts).map((p) => (
              <div key={p.id} className="card card-hover" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", height: "100%", position: "relative", border: "1px solid hsl(var(--border-hsl))" }}>
                {p.badge && (
                  <span style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1rem",
                    backgroundColor: "hsl(var(--primary-hsl))",
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    zIndex: 5
                  }}>
                    {p.badge}
                  </span>
                )}
                <div style={{ width: "100%", height: "180px", overflow: "hidden", borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "white" }}>
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: "1rem",
                      transition: "transform 0.4s ease"
                    }}
                    className="product-card-img"
                  />
                </div>
                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flexGrow: 1, gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>{p.category}</span>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: "1.4" }}>{p.name}</h3>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem" }}>
                    <div>
                      <p style={{ fontSize: "0.6rem", color: "hsl(var(--muted-hsl))", textTransform: "uppercase", fontWeight: 600 }}>Starting from</p>
                      <p style={{ fontWeight: 800, color: "hsl(var(--accent-hsl))", fontSize: "1rem" }}>
                        {p.price ? (p.price.includes("$") ? p.price : `$${p.price}`) : "$19.99"} CAD
                      </p>
                    </div>
                    <Link href={p.href || `/products/${p.id}`} className="btn btn-primary" style={{
                      fontSize: "0.75rem",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "var(--radius-sm)"
                    }}>
                      Configure
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: HOW IT WORKS */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.15)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>How It Works</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>
              From Configuration to Checkout in Minutes
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl))", color: "white", display: "flex", alignItems: "center", justify: "center", fontWeight: 800, fontSize: "0.95rem" }}>
                1
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Choose Your Product</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Browse 60+ print products and custom apparel. Filter by category, size, or turnaround speed.
              </p>
            </div>

            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl))", color: "white", display: "flex", alignItems: "center", justify: "center", fontWeight: 800, fontSize: "0.95rem" }}>
                2
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Configure & Preview</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Select your size, material, and quantity, then upload print ready artwork and preview your order.
              </p>
            </div>

            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl))", color: "white", display: "flex", alignItems: "center", justify: "center", fontWeight: 800, fontSize: "0.95rem" }}>
                3
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Checkout Instantly</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>
                See live wholesale pricing as you configure. Pay securely and your order is confirmed right away.
              </p>
            </div>

            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl))", color: "white", display: "flex", alignItems: "center", justify: "center", fontWeight: 800, fontSize: "0.95rem" }}>
                4
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>We Print & Ship</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Your order enters production immediately with our Ontario production partners. Free shipping in the GTA on eligible orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: WHY APEX WORKWEAR */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }} className="why-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
                Why GTA Businesses Order From Apex Workwear
              </h2>
              <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                Apex Workwear connects you directly to wholesale print and apparel pricing. Configure your product, see live pricing, and place your order online in minutes. No quote requests. No waiting on hold.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                "60+ print products, plus custom apparel",
                "Zero order minimums on select items",
                "Next day turnaround on eligible orders",
                "Wholesale trade pricing, mapped dynamically",
                "Proudly finished in Ontario production facilities",
                "Free shipping in the GTA on eligible orders"
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "hsl(var(--success-hsl) / 0.15)",
                    color: "hsl(var(--success-hsl))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "hsl(var(--foreground-hsl) / 0.9)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: SEO TEXT BLOCK */}
      <section style={{ padding: "4rem 1.5rem", borderTop: "1px solid hsl(var(--border-hsl))" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(var(--primary-hsl))", marginBottom: "1rem" }}>
            Print & Apparel Products for Every GTA Business
          </h2>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.8", marginBottom: "1rem" }}>
            At Apex Workwear, we supply print and apparel products to businesses across the Greater Toronto Area. Our catalogue covers business cards, letterhead, and NCR forms for everyday office use, flyers, brochures, and postcards for marketing campaigns, coroplast yard signs, vinyl banners, and aluminum signage for storefronts and job sites, and labels, stickers, and packaging for product lines. We also produce custom apparel, including t-shirts, hoodies, and hats, with embroidery, DTG, and screen printing available.
          </p>
          <p style={{ color: "hsl(var(--primary-hsl))", fontSize: "0.85rem", fontWeight: 700 }}>
            Configure your specifications, see wholesale pricing instantly, and check out online. No quote requests. No waiting for a callback.
          </p>
        </div>
      </section>

      {/* SECTION 9: TRUSTED BY GTA SMALL BUSINESSES */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "white", borderTop: "1px solid hsl(var(--border-hsl))" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Reviews</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>
              Trusted by GTA Small Businesses
            </h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", marginTop: "0.5rem" }}>
              See why Toronto developers, real estate agents, and local shops print with Apex.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                text: "Ordering business cards online used to require emailing files back and forth. With Apex Workwear's new storefront, I simply selected 16pt cardstock with UV gloss, saw the instant price, uploaded my PDF, and checked out. They arrived in Mississauga two days later. Unbeatable turnaround.",
                author: "Liam K.",
                role: "GTA Real Estate Agent"
              },
              {
                text: "We needed custom coroplast lawn signs for our landscaping business. The instant shipping estimate to Scarborough was accurate and the pricing was much better than our previous local shop. The checkout was seamless.",
                author: "Sophia M.",
                role: "GreenSpace Ltd. Owner"
              },
              {
                text: "Our staff hoodies were exactly what we needed for the winter season. Embroidered logos, fast turnaround, and shipped right to our office in Toronto.",
                author: "Priya D.",
                role: "Operations Manager"
              },
              {
                text: "We ordered vinyl banners and window decals for our new Brampton location. The instant pricing made budgeting easy, and everything arrived within days.",
                author: "Marcus T.",
                role: "Retail Owner"
              }
            ].map((t, idx) => (
              <div key={idx} className="card" style={{ padding: "1.75rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))", backgroundColor: "white" }}>
                <div style={{ display: "flex", gap: "0.05rem", color: "#f59e0b" }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p style={{ fontStyle: "italic", fontSize: "0.85rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.6" }}>
                  "{t.text}"
                </p>
                <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.author}</p>
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: FAQ */}
      <section style={{ padding: "5rem 1.5rem", borderTop: "1px solid hsl(var(--border-hsl))" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { q: "What types of products do you offer?", a: "We offer 60+ print products, including business cards, flyers, signage, labels, and packaging, plus custom apparel like t-shirts, hoodies, and hats with embroidery, DTG, or screen printing available." },
              { q: "Is there a minimum order?", a: "No. Most products have zero order minimums. Order one piece or several thousand." },
              { q: "How does online configuration work?", a: "Choose your product, select size, material, and quantity, then upload your artwork. Pricing updates instantly as you configure. No quote request needed." },
              { q: "Do you offer bulk or wholesale pricing?", a: "Yes. Our pricing is mapped directly to wholesale trade rates, so larger orders get better per unit pricing automatically." },
              { q: "How fast is turnaround?", a: "Most products ship within one to two business days. Select items like flyers and brochures offer same day options." },
              { q: "Where do you ship?", a: "We ship across the Greater Toronto Area and Ontario wide, with free shipping on eligible orders in the GTA." },
              { q: "Can I use my own design?", a: "Yes. Upload print ready artwork during checkout, or contact us for design assistance." },
              { q: "Can I see a proof before printing?", a: "Yes. Digital proofs are available before your order enters production." },
              { q: "Do you offer custom or contractor pricing?", a: "Yes. For high volume or recurring orders, contact our team for custom contract pricing." },
              { q: "Where are my products printed?", a: "All orders are finished locally at our Ontario production partners." }
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} style={{
                  border: "1px solid hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  backgroundColor: "white"
                }}>
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    style={{
                      width: "100%",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: isOpen ? "hsl(var(--secondary-hsl) / 0.1)" : "transparent",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--primary-hsl))" }}>
                      {faq.q}
                    </span>
                    {isOpen ? <ChevronUp size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> : <ChevronDown size={18} style={{ color: "hsl(var(--muted-hsl))" }} />}
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: "1rem 1.25rem",
                      borderTop: "1px solid hsl(var(--border-hsl))",
                      backgroundColor: "hsl(var(--background-hsl))",
                      color: "hsl(var(--foreground-hsl) / 0.8)",
                      fontSize: "0.85rem",
                      lineHeight: "1.6"
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
      
      <style>{`
        .category-card-img:hover {
          transform: scale(1.04);
        }
        .product-card-img:hover {
          transform: scale(1.04);
        }
        .hero-tag:hover {
          background-color: hsl(var(--accent-hsl)) !important;
          color: white !important;
          border-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
