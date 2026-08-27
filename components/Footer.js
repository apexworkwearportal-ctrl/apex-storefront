import Link from "next/link";
import { Phone, Mail, Clock, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid hsl(var(--border-hsl))",
      backgroundColor: "hsl(var(--secondary-hsl) / 0.15)",
      padding: "4rem 2rem 2rem 2rem",
      marginTop: "auto"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "3rem",
        marginBottom: "3rem"
      }}>
        {/* Brand Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", marginBottom: "0.25rem" }}>
            <img 
              src="/Apex-Workwear-Logo-Horizontal.webp" 
              alt="Apex Workwear Logo" 
              style={{ height: "36px", width: "auto", display: "block" }} 
            />
          </Link>
          <p style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.7)", lineHeight: "1.5" }}>
            Your print and apparel partner in the Greater Toronto Area. Business cards, marketing brochures, yard signs, custom apparel, and more.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
              color: "hsl(var(--accent-hsl))",
              padding: "0.25rem 0.6rem",
              borderRadius: "4px"
            }}>
              Proudly Canadian 🍁
            </span>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              backgroundColor: "hsl(var(--primary-hsl) / 0.1)",
              color: "hsl(var(--primary-hsl))",
              padding: "0.25rem 0.6rem",
              borderRadius: "4px"
            }}>
              GTA Local 📍
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.05rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--foreground-hsl) / 0.5)", fontWeight: 700 }}>
            Shop Catalog
          </h3>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
            <Link href="/products" className="footer-link">Print Products</Link>
            <Link href="/products" className="footer-link">Apparel</Link>
            <Link href="/about" className="footer-link">Why Choose Us</Link>
            <Link href="/account" className="footer-link">Customer Portal</Link>
          </nav>
        </div>

        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.05rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--foreground-hsl) / 0.5)", fontWeight: 700 }}>
            Contact Details
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>
            <a href="tel:6475701249" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="footer-link">
              <Phone size={16} /> (647) 570-1249
            </a>
            <a href="mailto:info@apexworkwear.ca" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="footer-link">
              <Mail size={16} /> info@apexworkwear.ca
            </a>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <MapPin size={16} style={{ marginTop: "0.2rem", shrink: 0 }} />
              <span>1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1</span>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.05rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--foreground-hsl) / 0.5)", fontWeight: 700 }}>
            Business Hours
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={16} />
              <span>Monday – Friday: 9:00 AM – 8:30 PM</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", paddingLeft: "1.5rem" }}>
              <span>Saturday & Sunday: Closed</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", lineHeight: "1.4", marginTop: "0.5rem" }}>
              Configure your print specifications, view mockups, and order online 24/7.
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        borderTop: "1px solid hsl(var(--border-hsl))",
        paddingTop: "1.5rem",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "hsl(var(--muted-hsl))",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <span>© {new Date().getFullYear()} Apex Workwear. All rights reserved.</span>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/privacy" className="footer-link">Privacy Policy</Link>
          <Link href="/terms" className="footer-link">Terms & Conditions</Link>
          <Link href="/refunds" className="footer-link">Refund Policy</Link>
        </div>
      </div>

      <style>{`
        .footer-link {
          color: hsl(var(--foreground-hsl) / 0.8);
          transition: color 0.2s ease, transform 0.2s ease;
          text-decoration: none;
        }
        .footer-link:hover {
          color: hsl(var(--accent-hsl));
          transform: translateX(2px);
        }
      `}</style>
    </footer>
  );
}
