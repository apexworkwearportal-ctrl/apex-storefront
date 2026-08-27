"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function LegalLayout({ title, lastUpdated, breadcrumbLabel, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "hsl(var(--background-hsl))", flexShrink: 0 }}>
      <Header />

      {/* Breadcrumb Strip */}
      <div style={{
        backgroundColor: "hsl(var(--secondary-hsl) / 0.15)",
        borderBottom: "1px solid hsl(var(--border-hsl))",
        padding: "0.75rem 2rem"
      }}>
        <div style={{
          maxWidth: "760px",
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
          <span>Legal</span>
          <ChevronRight size={12} />
          <span style={{ color: "hsl(var(--foreground-hsl))" }}>{breadcrumbLabel}</span>
        </div>
      </div>

      {/* Page Title Band (Hero) */}
      <section className="gradient-bg" style={{ padding: "4rem 2rem", color: "white", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "20%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.15) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none"
        }} />
        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.65rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "hsl(var(--accent-hsl))",
            backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
            padding: "0.25rem 0.65rem",
            borderRadius: "4px",
            marginBottom: "0.75rem"
          }}>
            <Shield size={10} /> Official Store Policy
          </span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "white", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
            <Clock size={12} />
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Policy Content Body */}
      <main style={{ flexGrow: 1, padding: "3rem 1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            backgroundColor: "white",
            border: "1px solid hsl(var(--border-hsl))",
            borderRadius: "var(--radius-lg)",
            padding: "2.5rem 3rem",
            boxShadow: "var(--shadow-sm)"
          }}
          className="legal-content-card"
        >
          <div className="legal-rich-text">
            {children}
          </div>
        </motion.div>
      </main>

      <Footer />

      {/* Inject styling inside the scope of the legal body layout */}
      <style>{`
        .legal-rich-text h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: hsl(var(--primary-hsl));
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid hsl(var(--border-hsl));
        }
        .legal-rich-text h2:first-child {
          margin-top: 0;
        }
        .legal-rich-text p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: hsl(var(--foreground-hsl) / 0.85);
          margin-bottom: 1rem;
        }
        .legal-rich-text ul {
          padding-left: 1.25rem;
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .legal-rich-text li {
          font-size: 0.95rem;
          line-height: 1.5;
          color: hsl(var(--foreground-hsl) / 0.85);
          list-style-type: disc;
        }
        .legal-rich-text strong {
          color: hsl(var(--foreground-hsl));
        }
        @media (max-width: 768px) {
          .legal-content-card {
            padding: 2rem 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
