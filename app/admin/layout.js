"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  RefreshCw, 
  FolderEdit, 
  ShoppingBag, 
  ShieldAlert,
  LogOut,
  Printer,
  Package,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  Sliders,
  CreditCard
} from "lucide-react";

export default function AdminLayout({ children }) {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user && (
    userData?.role === "admin" || 
    user.email === "admin@apexworkwear.ca" ||
    user.email === "apexworkwearportal@gmail.com" ||
    user.email?.endsWith("@apexworkwear.ca")
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/account/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8FAFC",
        color: "#64748B",
        fontWeight: 600,
        fontSize: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <RefreshCw className="animate-spin" size={20} style={{ color: "#2563EB" }} />
          Verifying Apex Administrator Permissions...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        gap: "1.5rem",
        backgroundColor: "#F8FAFC",
        color: "#0F172A"
      }}>
        <ShieldAlert size={64} style={{ color: "#EF4444" }} />
        <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Access Denied</h1>
        <p style={{ color: "#64748B", maxWidth: "480px" }}>
          You do not have administrative privileges to access this area.
        </p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/account" className="btn btn-secondary">
            Go to Account
          </Link>
          <button onClick={() => logout()} className="btn btn-outline" style={{ color: "#0F172A", borderColor: "#CBD5E1" }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navSections = [
    {
      title: "PRICE CALCULATOR",
      items: [
        { label: "Calculator & Formulas", href: "/admin/pricing", icon: Calculator },
        { label: "Site & Category Markups", href: "/admin/pricing#markups", icon: Sliders },
      ]
    },
    {
      title: "CATALOG & PRODUCTS",
      items: [
        { label: "Products Catalog", href: "/admin/products", icon: Package },
        { label: "Categories Taxonomy", href: "/admin/categories", icon: FolderEdit },
        { label: "Add Custom Product", href: "/admin/products/new", icon: Plus },
      ]
    },
    {
      title: "ORDERS & FULFILLMENT",
      items: [
        { label: "Order Manager", href: "/admin/orders", icon: ShoppingBag },
        { label: "Print Proof Review", href: "/admin/orders?tab=proofs", icon: Printer },
      ]
    },
    {
      title: "SYSTEM & INTEGRATIONS",
      items: [
        { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Admin Settings", href: "/admin/settings", icon: CreditCard },
        { label: "SinaLite API Sync", href: "/admin/sync", icon: RefreshCw },
      ]
    }
  ];

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "270px 1fr", backgroundColor: "#F8FAFC", color: "#0F172A" }}>
      {/* Dark Enterprise Sidebar Navigation (Preserved Navy dark theme) */}
      <aside style={{
        backgroundColor: "#090D16",
        borderRight: "1px solid #1E293B",
        padding: "1.5rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100vh",
        position: "sticky",
        top: 0
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", overflowY: "auto" }}>
          {/* Header & Logo */}
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", marginBottom: "0.25rem" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 900,
                fontSize: "1.2rem",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)"
              }}>
                ▲
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#F8FAFC", fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  APEX
                </span>
                <span style={{ color: "#64748B", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  WORKWEAR
                </span>
              </div>
            </Link>
          </div>

          {/* Grouped Nav Sections */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {navSections.map((section, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  color: "#64748B",
                  letterSpacing: "0.08em",
                  paddingLeft: "0.5rem",
                  marginBottom: "0.1rem"
                }}>
                  {section.title}
                </span>

                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = item.href === "/admin" 
                    ? pathname === "/admin" 
                    : pathname.startsWith(item.href.split("#")[0]);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: active ? 700 : 550,
                        backgroundColor: active ? "#1E293B" : "transparent",
                        color: active ? "#60A5FA" : "#94A3B8",
                        borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
                        textDecoration: "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <Icon size={16} style={{ color: active ? "#3B82F6" : "#64748B" }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Admin User Badge */}
        <div style={{ borderTop: "1px solid #1E293B", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            padding: "0.65rem 0.85rem",
            backgroundColor: "#0F172A",
            borderRadius: "8px",
            border: "1px solid #1E293B",
            display: "flex",
            alignItems: "center",
            gap: "0.65rem"
          }}>
            <div style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#2563EB",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.8rem"
            }}>
              {userData?.name ? userData.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "#F8FAFC", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userData?.name || "Admin Operator"}
              </p>
              <p style={{ color: "#64748B", fontSize: "0.7rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 600 }}>Apex Workwear Suite</span>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.75rem",
                fontWeight: 600
              }}
            >
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Clean White Main Content Viewport */}
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Crisp White Top Header Bar */}
        <header style={{
          height: "64px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}>
          {/* Quick Search */}
          <div style={{ position: "relative", width: "360px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Search catalog, products, SKUs, or orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 1rem 0.45rem 2.25rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                color: "#0F172A",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

          {/* Quick Actions & Live Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Live System Status */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.75rem",
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "20px",
              color: "#059669",
              fontSize: "0.75rem",
              fontWeight: 700
            }}>
              <CheckCircle2 size={14} /> System Operational
            </div>

            <Link
              href="/admin/products/new"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                backgroundColor: "#2563EB",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
              }}
            >
              <Plus size={14} /> Add Product
            </Link>
          </div>
        </header>

        {/* Viewport for Page Content (Clean Light Background) */}
        <main style={{ flex: 1, padding: "2.25rem 2.5rem", overflowY: "auto", backgroundColor: "#F8FAFC", color: "#0F172A" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
