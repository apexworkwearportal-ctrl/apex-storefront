"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
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
  Clock 
} from "lucide-react";

export default function HomeClient({ categories }) {
  const [searchVal, setSearchVal] = useState("");

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
      {/* 1. HERO SECTION */}
      <section style={{
        position: "relative",
        padding: "6rem 2rem 5rem 2rem",
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

        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "4rem",
          alignItems: "center",
          position: "relative",
          zIndex: 10
        }} className="hero-grid">
          
          {/* Left Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
          >
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "hsl(var(--accent-hsl))",
                backgroundColor: "hsl(var(--accent-hsl) / 0.15)",
                padding: "0.35rem 0.85rem",
                borderRadius: "40px",
                marginBottom: "1rem"
              }}>
                <Sparkles size={12} /> Direct GTA Print Shop
              </span>
              <h1 style={{
                fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                color: "white",
                letterSpacing: "-0.03em"
              }}>
                Configure, Preview <br />
                & Order <span style={{ color: "hsl(var(--accent-hsl))" }}>Print Instantly</span>
              </h1>
            </div>
            
            <p style={{
              fontSize: "1.15rem",
              lineHeight: "1.6",
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: "540px"
            }}>
              Zero waiting for custom sales estimates. Input your specifications, upload print-ready artwork files, and calculate live courier prices directly.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <Link href="/products" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}>
                Shop Print Catalog <ArrowRight size={18} />
              </Link>
              <Link href="/about" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.25)", padding: "0.85rem 2rem", fontSize: "1rem" }}>
                GTA Turnarounds
              </Link>
            </div>

            {/* Quick Shortcuts */}
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                Popular Configurations:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {categories.slice(0, 3).map(cat => (
                  <Link 
                    key={cat.id} 
                    href={`/products?category=${cat.id}`}
                    style={{
                      fontSize: "0.8rem",
                      padding: "0.4rem 0.85rem",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.9)",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 600,
                      border: "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.2s ease"
                    }}
                    className="hero-tag"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Graphic Presentation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ display: "flex", justifyContent: "center", position: "relative" }}
            className="hero-graphic-col"
          >
            <div style={{
              width: "100%",
              maxWidth: "480px",
              height: "360px",
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              backdropFilter: "blur(12px)",
              position: "relative",
              boxShadow: "var(--shadow-lg)"
            }}>
              {/* Stack Card Presentation */}
              <div style={{
                width: "80%",
                height: "180px",
                backgroundColor: "white",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                padding: "1.5rem",
                color: "hsl(var(--foreground-hsl))",
                position: "absolute",
                top: "15%",
                left: "10%",
                zIndex: 2,
                transform: "rotate(-4deg)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <img src="/Apex-Workwear-Logo-Horizontal.webp" style={{ height: "24px" }} alt="Logo" />
                  <span style={{ fontSize: "0.7rem", color: "hsl(var(--accent-hsl))", fontWeight: 700 }}>PREMIUM PRINT</span>
                </div>
                <div style={{ marginTop: "2rem" }}>
                  <p style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>High-Impact Marketing Renders</p>
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem" }}>Toronto Business Card configurations</p>
                </div>
              </div>

              <div style={{
                width: "75%",
                height: "180px",
                backgroundColor: "hsl(var(--secondary-hsl))",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
                padding: "1.5rem",
                color: "hsl(var(--foreground-hsl))",
                position: "absolute",
                bottom: "10%",
                right: "8%",
                zIndex: 1,
                transform: "rotate(6deg)"
              }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "hsl(var(--success-hsl))" }}></div>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Configurator Loaded</span>
                </div>
                <div style={{ marginTop: "1.5rem" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>GTA Courier Estimates</p>
                  <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))" }}>1-2 business days delivery lookup</p>
                </div>
              </div>
            </div>
          </motion.div>

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
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>SinaLite Trade Prices</p>
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
            {trendingProducts.map((p) => (
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
                      <p style={{ fontWeight: 800, color: "hsl(var(--accent-hsl))", fontSize: "1rem" }}>{p.price} CAD</p>
                    </div>
                    <Link href={`/products/${p.id}`} className="btn btn-primary" style={{
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

      {/* 6. TESTIMONIALS/SOCIAL PROOF */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Reviews</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem" }}>Trusted by GTA Small Businesses</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", marginTop: "0.5rem" }}>
              See why Toronto developers, real estate agents, and local shops print with Apex.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2rem"
          }}>
            <div className="card" style={{ padding: "2.25rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ display: "flex", gap: "0.1rem", color: "#f59e0b" }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p style={{ fontStyle: "italic", fontSize: "0.95rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.6" }}>
                "Ordering business cards online used to require emailing files back and forth. With Apex Workwear's new storefront, I simply selected 16pt cardstock with UV gloss, saw the instant price, uploaded my PDF, and checked out. They arrived in Mississauga two days later. Unbeatable turnaround!"
              </p>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>Liam K.</p>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>GTA Real Estate Agent</p>
              </div>
            </div>

            <div className="card" style={{ padding: "2.25rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ display: "flex", gap: "0.1rem", color: "#f59e0b" }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p style={{ fontStyle: "italic", fontSize: "0.95rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.6" }}>
                "We needed custom coroplast lawn signs for our landscape business. The instant shipping estimate to Scarborough was accurate and the pricing was much better than our previous WordPress local shop. The checkout was seamless."
              </p>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>Sophia M.</p>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>GreenSpace Ltd. Owner</p>
              </div>
            </div>
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
