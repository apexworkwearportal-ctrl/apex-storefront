"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  RefreshCw, 
  FolderEdit, 
  ShoppingBag, 
  ShieldAlert,
  ChevronRight,
  LogOut,
  Printer,
  Package
} from "lucide-react";

export default function AdminLayout({ children }) {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user && (
    userData?.role === "admin" || 
    user.email === "admin@apexworkwear.ca" ||
    user.email.endsWith("@apexworkwear.ca")
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
        color: "hsl(var(--muted-hsl))",
        fontWeight: 500
      }}>
        Verifying administrator permissions...
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
        gap: "1.5rem"
      }}>
        <ShieldAlert size={64} style={{ color: "hsl(var(--destructive-hsl))" }} />
        <h1 style={{ fontSize: "2rem" }}>Access Denied</h1>
        <p style={{ color: "hsl(var(--muted-hsl))", maxWidth: "480px" }}>
          You do not have administrative privileges to access this area. If you believe this is an error, please contact support.
        </p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/account" className="btn btn-secondary">
            Go to Account
          </Link>
          <button onClick={() => logout()} className="btn btn-outline">
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

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "260px 1fr", backgroundColor: "hsl(var(--background-hsl))" }}>
      {/* Sidebar navigation */}
      <aside className="glass-panel" style={{
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderBottom: "none",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
            <img 
              src="/Apex-Workwear-Logo-Horizontal.webp" 
              alt="Apex Workwear Logo" 
              style={{ height: "36px", width: "auto", display: "block" }} 
            />
          </Link>

          {/* Nav list */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
              { label: "Products Catalog", href: "/admin/products", icon: Package },
              { label: "Sync Dashboard", href: "/admin/sync", icon: RefreshCw },
              { label: "Categories", href: "/admin/categories", icon: FolderEdit },
              { label: "Order Manager", href: "/admin/orders", icon: ShoppingBag }
            ].map(item => {
              const Icon = item.icon;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className="btn" 
                  style={{ 
                    justifyContent: "flex-start", 
                    fontSize: "0.85rem",
                    fontWeight: 650,
                    backgroundColor: active ? "hsl(var(--accent-hsl))" : "transparent",
                    color: active ? "white" : "hsl(var(--foreground-hsl) / 0.85)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.6rem 0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Icon size={16} style={{ color: active ? "white" : "hsl(var(--muted-hsl))" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: "hsl(var(--secondary-hsl) / 0.5)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.8rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            <p style={{ fontWeight: 700 }}>{userData?.name || "Admin"}</p>
            <p style={{ color: "hsl(var(--muted-hsl))" }}>{user.email}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ width: "100%", padding: "0.5rem" }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <main style={{ padding: "2.5rem 3rem", overflowY: "auto", maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
