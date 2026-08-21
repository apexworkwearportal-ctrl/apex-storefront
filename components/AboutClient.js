"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Printer, 
  Users, 
  Award, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Package, 
  Sparkles,
  Percent,
  Check,
  Star,
  FileText
} from "lucide-react";

export default function AboutClient() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
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

  const steps = [
    { num: 1, title: "Configure", desc: "Choose your product, size, material, and quantity. Upload your artwork or start from a template." },
    { num: 2, title: "Preview & Price", desc: "See your exact price update in real time — no waiting for a callback or email quote." },
    { num: 3, title: "Checkout", desc: "Pay securely online. Your order is confirmed immediately." },
    { num: 4, title: "Production & Delivery", desc: "Your order enters production right away. Track it through to delivery or pickup across the GTA." }
  ];

  const usps = [
    { title: "Price Match Guarantee", desc: "Found it cheaper elsewhere? We'll match or beat any written competitor quote." },
    { title: "Lower Design Fees", desc: "Our artwork and setup fees run below industry standard — more of your budget goes into the actual print run." },
    { title: "100% Satisfaction Guarantee", desc: "Not happy with your order? We'll reprint it or refund you. No exceptions." },
    { title: "No Minimums on Select Items", desc: "Order 10 signs or 10,000 flyers — the process is the same either way." },
    { title: "Fast Turnaround", desc: "Most orders ship in 5–7 business days. Same-day options available on select products." },
    { title: "Free Shipping on Select Orders", desc: "Qualifying orders ship free across the Greater Toronto Area." }
  ];

  const targetIndustries = [
    { emoji: "🏗️", title: "Construction & Trades", desc: "Job site signage, safety decals, and branded apparel for your crew." },
    { emoji: "🏢", title: "Corporations & Offices", desc: "Business cards, letterhead, presentation folders, and branded merchandise." },
    { emoji: "🏠", title: "Real Estate", desc: "Yard signs, open house signage, listing postcards, and door hangers." },
    { emoji: "🗳️", title: "Political Campaigns", desc: "Lawn signs, door hangers, and flyers for local election campaigns." },
    { emoji: "🍽️", title: "Restaurants & Hospitality", desc: "Menus, table tents, promotional flyers, and branded uniforms." },
    { emoji: "📋", title: "Events & Conferences", desc: "Banners, posters, badges, and branded signage for any event size." },
    { emoji: "🏪", title: "Retail & Local Business", desc: "Window graphics, floor decals, rack cards, and seasonal promo materials." },
    { emoji: "🎉", title: "Individuals & Special Occasions", desc: "Invitations, greeting cards, wall calendars, and personalized keepsakes." }
  ];

  const testimonials = [
    { quote: "Made the printing work on such a short notice — even on New Year's Eve and New Year's Day.", author: "Navreet K." },
    { quote: "Did a fantastic job on our booklets. The print quality was crisp and clear.", author: "David A." },
    { quote: "Quality of the work was top-notch, clean, professional, and exactly what I was looking for.", author: "Ayush" },
    { quote: "Very quick response to my request. The flyer design and quality were excellent.", author: "Richard B." }
  ];

  return (
    <div style={{ backgroundColor: "hsl(var(--background-hsl))" }}>
      
      {/* SECTION 1: HERO */}
      <section style={{
        padding: "5rem 2rem",
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
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none"
        }} />
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}
        >
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Our Story & Commitment
          </h1>
          <p style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.85)", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto" }}>
            Providing local, dependable, and state-of-the-art custom printing services across the Greater Toronto Area.
          </p>
        </motion.div>
      </section>

      {/* SECTION 2: PROUDLY CANADIAN & GTA-LOCAL */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "4rem", alignItems: "center" }} className="about-grid">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "hsl(var(--primary-hsl))" }}>
                Proudly Canadian. GTA-Local.
              </h2>
              <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                Apex Workwear gives businesses across the Greater Toronto Area a better way to order custom print and apparel — no back-and-forth quote requests, no waiting on hold for pricing.
              </p>
              <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                Our online storefront covers everything from business cards, brochures, and postcards to yard signs, banners, labels, packaging, and promotional apparel — more than 60 product types in total. Configure your exact size, material, and quantity, see accurate pricing instantly, and check out. Your order enters production the same day.
              </p>
              <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                We work directly with vetted, professional production partners across every product category — so whether you're ordering 50 door hangers or 500 yard signs, the quality and turnaround stay consistent.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              style={{
                position: "relative",
                height: "360px",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid hsl(var(--border-hsl))",
                boxShadow: "var(--shadow-md)"
              }}
            >
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop" 
                alt="GTA Printshop facility"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TRUST BADGES BAR */}
      <section style={{
        padding: "1.75rem 1.5rem",
        backgroundColor: "white",
        borderTop: "1px solid hsl(var(--border-hsl))",
        borderBottom: "1px solid hsl(var(--border-hsl))"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem"
        }} className="badges-flex">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🖨️</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--foreground-hsl) / 0.8)" }}>60+ Print Products</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚡</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--foreground-hsl) / 0.8)" }}>Same-Day Options Available</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🚚</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--foreground-hsl) / 0.8)" }}>GTA-Wide Delivery</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>✅</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--foreground-hsl) / 0.8)" }}>100% Satisfaction Guarantee</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🍁</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--foreground-hsl) / 0.8)" }}>Proudly Canadian</span>
          </div>
        </div>
      </section>

      {/* SECTION 4: WHAT WE PRINT */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
            One Catalog. Every Print Product You Need.
          </h2>
          <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.8", fontSize: "0.95rem" }}>
            If it's printed, chances are we make it. Business cards, letterhead, and envelopes for your office. Brochures, flyers, postcards, and door hangers for your next campaign. Coroplast yard signs, vinyl banners, pull-up banners, and window graphics for your storefront or job site. Labels, stickers, and packaging for your product line. Greeting cards, invitations, and wall calendars for personal occasions. And custom apparel to match.
          </p>
          <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", fontWeight: 600, fontSize: "0.95rem" }}>
            All of it — configured, priced, and ordered through the same fast, transparent process.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/products" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}>
              Browse the Full Catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW ORDERING WORKS */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.15)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>How It Works</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>Order Print the Way It Should Work</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {steps.map((s) => (
              <div key={s.num} className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", border: "1px solid hsl(var(--border-hsl))" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--primary-hsl))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1rem"
                }}>
                  {s.num}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{s.title}</h3>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: CORE VALUES */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Our Pillars</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>Our Core Values</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            <div className="card" style={{ padding: "2.25rem 2rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Customer Centric</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                We design our tools for small businesses. Quick ordering, saved address books, and transparent invoicing simplify print procurement.
              </p>
            </div>
            <div className="card" style={{ padding: "2.25rem 2rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Award size={22} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Premium Standards</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                Whether it's thick 16pt cardstock or weatherproof coroplast fluting, we never compromise on ink vibrancy or paper quality.
              </p>
            </div>
            <div className="card" style={{ padding: "2.25rem 2rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Toronto Dependability</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                We are a local partner. You can dial our support line at (647) 570-1249 to speak with our team directly. We stand by our print products.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: WHY CHOOSE APEX WORKWEAR */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "white" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Why Apex</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>More Than Just a Print Shop</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {usps.map((u, idx) => (
              <div key={idx} className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--primary-hsl))" }}>
                  <span style={{ color: "hsl(var(--accent-hsl))" }}>✓</span> {u.title}
                </h3>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", lineHeight: "1.6" }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: WHO WE WORK WITH */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Who We Work With</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>Trusted by Businesses and Individuals Across the GTA</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {targetIndustries.map((ind, idx) => (
              <div key={idx} className="card card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", border: "1px solid hsl(var(--border-hsl))", backgroundColor: "white" }}>
                <div style={{ fontSize: "1.75rem" }}>{ind.emoji}</div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{ind.title}</h3>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", lineHeight: "1.5" }}>{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: TESTIMONIALS */}
      <section style={{ padding: "5rem 1.5rem", backgroundColor: "white" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent-hsl))" }}>Reviews</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.25rem", color: "hsl(var(--primary-hsl))" }}>What Our Customers Say</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {testimonials.map((t, idx) => (
              <div key={idx} className="card" style={{ padding: "1.75rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", border: "1px solid hsl(var(--border-hsl))", position: "relative" }}>
                <span style={{ fontSize: "2rem", color: "hsl(var(--accent-hsl) / 0.3)", lineHeight: 1, position: "absolute", top: "0.5rem", left: "0.75rem", fontFamily: "Georgia, serif" }}>“</span>
                <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.5", paddingTop: "0.5rem" }}>
                  {t.quote}
                </p>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.05rem", color: "#f59e0b" }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>— {t.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: REACH OUR TEAM */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "4rem", alignItems: "center" }} className="about-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
                Questions? We're an Email or Phone Call Away.
              </h2>
              <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: "1.7", fontSize: "0.95rem" }}>
                Our team is based in the Greater Toronto Area and available Monday through Friday. Reach out before you order, or anytime after — we stand behind every product we print.
              </p>
            </div>
            
            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem", border: "1px solid hsl(var(--border-hsl))", backgroundColor: "white", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex" }}>
                  <Phone size={18} />
                </div>
                <div>
                  <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", fontWeight: 700, textTransform: "uppercase" }}>Phone</p>
                  <a href="tel:6475701249" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    (647) 570-1249
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex" }}>
                  <Mail size={18} />
                </div>
                <div>
                  <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", fontWeight: 700, textTransform: "uppercase" }}>Email</p>
                  <a href="mailto:info@apexworkwear.ca" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    info@apexworkwear.ca
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex" }}>
                  <Clock size={18} />
                </div>
                <div>
                  <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", fontWeight: 700, textTransform: "uppercase" }}>Hours</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    Monday – Friday: 9 AM – 6 PM
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", color: "hsl(var(--accent-hsl))", display: "flex" }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", fontWeight: 700, textTransform: "uppercase" }}>Service Area</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    Greater Toronto Area, Ontario, Canada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: FINAL CTA */}
      <section style={{
        padding: "6rem 2rem",
        backgroundColor: "hsl(var(--primary-hsl))",
        color: "white",
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          bottom: "-50%",
          right: "5%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none"
        }} />
        <div style={{ maxWidth: "600px", margin: "0 auto", position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
            Ready to Start Your Order?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: "1.6" }}>
            Configure your product, see instant pricing, and check out in minutes.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
            <Link href="/products" className="btn btn-primary" style={{ padding: "0.75rem 1.75rem" }}>
              Browse the Catalog →
            </Link>
            <Link href="/account/register" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.25)", padding: "0.75rem 1.75rem" }}>
              Create an Account →
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .badges-flex {
            justify-content: center !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
