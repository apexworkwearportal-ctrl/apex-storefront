"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { ShoppingCart, User, Menu, X, ChevronDown, Shield, Printer } from "lucide-react";

export default function Header() {
  const { user, userData } = useAuth();
  const { cartCount } = useCart();
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, "categories"), orderBy("displayOrder", "asc"));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setCategories(list);
      } catch (e) {
        console.error("Error loading header categories:", e);
      }
    };
    fetchCategories();
  }, []);

  const isAdmin = user && (
    userData?.role === "admin" || 
    user.email === "admin@apexworkwear.ca" ||
    user.email.endsWith("@apexworkwear.ca")
  );

  return (
    <header className="glass-panel" style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderRadius: 0,
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      padding: "0.75rem 2rem",
      backgroundColor: "var(--glass-bg)"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Logo Section */}
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <img 
            src="/Apex-Workwear-Logo-Horizontal.webp" 
            alt="Apex Workwear Logo" 
            style={{ height: "42px", width: "auto", display: "block" }} 
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          display: typeof window !== "undefined" && window.innerWidth < 768 ? "none" : "flex"
        }} className="desktop-nav">
          <Link href="/" style={{ fontWeight: 500, fontSize: "0.95rem" }} className="nav-link">Home</Link>
          
          <Link href="/products" style={{ fontWeight: 500, fontSize: "0.95rem" }} className="nav-link">Print Products</Link>

          <Link href="/about" style={{ fontWeight: 500, fontSize: "0.95rem" }} className="nav-link">About Us</Link>
          <Link href="/contact" style={{ fontWeight: 500, fontSize: "0.95rem" }} className="nav-link">Contact</Link>
        </nav>

        {/* Right side Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Cart Icon Link */}
          <Link href="/cart" style={{ position: "relative", color: "hsl(var(--foreground-hsl))" }} aria-label="Cart">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                backgroundColor: "hsl(var(--accent-hsl))",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account Icon Link */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {isAdmin && (
                <Link href="/admin" className="btn btn-secondary" style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}>
                  <Shield size={14} /> Admin
                </Link>
              )}
              <Link href="/account" aria-label="My Account" style={{ color: "hsl(var(--foreground-hsl))" }}>
                <User size={22} />
              </Link>
            </div>
          ) : (
            <Link href="/account/login" className="btn btn-outline" style={{
              padding: "0.4rem 1rem",
              fontSize: "0.85rem",
              borderRadius: "var(--radius-sm)"
            }}>
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "hsl(var(--foreground-hsl))",
              display: "none" // Toggle dynamically in CSS, handled below
            }}
            className="mobile-toggle"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {menuOpen && (
        <div className="glass-panel" style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          gap: "1rem",
          boxShadow: "var(--shadow-lg)",
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          backgroundColor: "hsl(var(--card-hsl))"
        }}>
          <Link href="/" onClick={() => setMenuOpen(false)} style={{ fontWeight: 600 }}>Home</Link>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontWeight: 600, color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", textTransform: "uppercase" }}>Categories</p>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products/${cat.id}`}
                onClick={() => setMenuOpen(false)}
                style={{ paddingLeft: "0.75rem", fontSize: "0.95rem" }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <Link href="/about" onClick={() => setMenuOpen(false)} style={{ fontWeight: 600 }}>About Us</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} style={{ fontWeight: 600 }}>Contact</Link>
        </div>
      )}

      {/* Basic Responsive Styling injected in header */}
      <style>{`
        .nav-link {
          color: hsl(var(--foreground-hsl));
          transition: color 0.2s ease;
          position: relative;
        }
        .nav-link:hover {
          color: hsl(var(--accent-hsl));
        }
        .dropdown-item:hover {
          background-color: hsl(var(--secondary-hsl) / 0.7);
          color: hsl(var(--accent-hsl));
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
