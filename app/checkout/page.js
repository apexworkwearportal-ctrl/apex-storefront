"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function CheckoutRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cart");
  }, [router]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <main style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", color: "hsl(var(--muted-hsl))", gap: "0.75rem" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--accent-hsl))" }} />
        <span style={{ fontWeight: 600 }}>Loading checkout...</span>
      </main>
      <Footer />
    </div>
  );
}
