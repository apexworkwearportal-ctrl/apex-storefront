"use client";

import { useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function SuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const sessionId = searchParams.get("session_id");

  // Clear cart and confirm order on success mount
  useEffect(() => {
    clearCart();
    if (orderId || sessionId) {
      fetch(`/api/checkout/confirm?orderId=${orderId || ""}&session_id=${sessionId || ""}`)
        .then(res => res.json())
        .catch(err => console.error("Auto confirm error:", err));
    }
  }, [orderId, sessionId]);

  return (
    <main style={{
      flexGrow: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem"
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel" 
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "3rem 2rem",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid hsl(var(--border-hsl))"
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <CheckCircle2 size={64} style={{ color: "hsl(var(--success-hsl))" }} />
        </div>
        
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Order Confirmed!</h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", marginBottom: "2rem" }}>
          Thank you for printing with Apex Workwear. Your payment has been processed and your order has been received.
        </p>

        {orderId && (
          <div style={{
            backgroundColor: "hsl(var(--secondary-hsl) / 0.4)",
            border: "1px solid hsl(var(--border-hsl))",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "2.5rem"
          }}>
            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))", letterSpacing: "0.05em" }}>
              Order Tracking ID
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, color: "hsl(var(--foreground-hsl))", marginTop: "0.25rem" }}>
              {orderId}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/account" className="btn btn-primary" style={{ justifyContent: "center" }}>
            View Order in Dashboard <ArrowRight size={16} />
          </Link>
          <Link href="/" className="btn btn-outline" style={{ justifyContent: "center" }}>
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <Suspense fallback={
        <main style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", color: "hsl(var(--muted-hsl))" }}>
          Loading order details...
        </main>
      }>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}
