"use client";

import { motion } from "framer-motion";
import { Users, Award, ShieldCheck } from "lucide-react";

export default function AboutClient() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
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

  return (
    <div style={{ backgroundColor: "hsl(var(--background-hsl))" }}>
      {/* Hero Header */}
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
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}
        >
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Our Story & Commitment
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.6" }}>
            Providing local, dependable, and state-of-the-art custom printing services across the Greater Toronto Area.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section style={{ padding: "5rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3.5rem", alignItems: "center" }} className="about-grid">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 style={{ fontSize: "1.8rem", marginBottom: "1.25rem", fontWeight: 800 }}>Proudly Canadian. GTA-Local.</h2>
            <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", marginBottom: "1rem", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Apex Workwear started with a simple goal: provide businesses in the Greater Toronto Area with premium printing and apparel configurations, fast turnarounds, and a straightforward ordering experience. 
            </p>
            <p style={{ color: "hsl(var(--foreground-hsl) / 0.85)", marginBottom: "1rem", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Our online storefront replaces old-fashioned "submit a quote and wait" workflows. By connecting directly with professional production pipelines, we calculate live prices instantly for custom sizes, weights, and quantities. Once you check out, your order enters production immediately.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              position: "relative",
              height: "320px",
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

        {/* Values grid */}
        <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "4rem", marginTop: "4rem" }}>
          <h2 style={{ fontSize: "1.8rem", textAlign: "center", marginBottom: "3.5rem", fontWeight: 800 }}>Our Core Values</h2>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2.5rem"
            }}
          >
            {/* Value 1 */}
            <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Customer Centric</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                We design our tools for small businesses. Quick ordering, saved address books, and transparent invoicing simplify print procurement.
              </p>
            </motion.div>

            {/* Value 2 */}
            <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Premium Standards</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                Whether it's thick 16pt cardstock or weatherproof coroplast fluting, we never compromise on ink vibrancy or paper quality.
              </p>
            </motion.div>

            {/* Value 3 */}
            <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                color: "hsl(var(--accent-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Toronto Dependability</h3>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", lineHeight: "1.6" }}>
                We are a local partner. You can dial our support line at (647) 570-1249 to speak with our team directly. We stand by our print products.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
