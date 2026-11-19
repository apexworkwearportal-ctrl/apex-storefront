"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";

const DEFAULT_BADGES = [
  "Best Seller",
  "Trending",
  "Popular",
  "Top Rated",
  "Featured",
  "Hot Pick",
  "Commercial Choice",
  "Customer Favorite"
];

export default function AdminHomepageFeaturedManager({ categories = [] }) {
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch saved homepage featured items
      const res = await fetch("/api/admin/homepage-products");
      const data = await res.json();
      
      // 2. Fetch available print and apparel products for the picker
      const [prodSnap, apparelSnap] = await Promise.all([
        getDocs(collection(db, "products")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "apparel_products")).catch(() => ({ docs: [] }))
      ]);

      const prods = [];
      prodSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.isVisible !== false) {
          prods.push({
            id: doc.id,
            isApparel: false,
            name: d.name || d.sinalite?.name || "Print Product",
            category: d.categoryName || "Print",
            image: (d.images && d.images[0]) || d.heroImage || "",
            startingPrice: parseFloat(d.pricing?.startingPriceOverride || d.pricing?.startingPrice || d.basePrice || 0)
          });
        }
      });

      apparelSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.isVisible !== false) {
          prods.push({
            id: doc.id,
            isApparel: true,
            name: d.name || "Apparel Product",
            category: d.category || "Apparel",
            image: (d.images && d.images[0]) || d.garmentViews?.front?.image || "",
            startingPrice: parseFloat(d.pricing?.startingPrice || d.basePrice || 0)
          });
        }
      });

      setAvailableProducts(prods);

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
      } else {
        // Pre-populate with first up to 6 real products from available list
        const initial = prods.slice(0, 6).map((p, idx) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.startingPrice > 0 ? `$${p.startingPrice.toFixed(2)}` : "",
          image: p.image,
          badge: DEFAULT_BADGES[idx % DEFAULT_BADGES.length],
          href: p.isApparel ? `/apparel/${p.id}` : `/products/${p.id}`
        }));
        setItems(initial);
      }
    } catch (err) {
      console.error("Failed to load featured items:", err);
      setStatusMsg({ type: "error", text: "Failed to load featured products: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/admin/homepage-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: "Homepage featured products updated successfully!" });
        setTimeout(() => setStatusMsg({ type: "", text: "" }), 4000);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: "Network error saving items" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      name: "New Featured Product",
      category: "Featured",
      price: "",
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
      badge: "Featured",
      href: "/products"
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleSelectProduct = (index, productId) => {
    const found = availableProducts.find(p => p.id === productId);
    if (!found) return;

    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        id: found.id,
        name: found.name,
        category: found.category,
        price: found.startingPrice > 0 ? `$${found.startingPrice.toFixed(2)}` : item.price,
        image: found.image || item.image,
        href: found.isApparel ? `/apparel/${found.id}` : `/products/${found.id}`
      };
    }));
  };

  const handleFieldChange = (index, field, value) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleMove = (index, direction) => {
    const newItems = [...items];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  const handleRemove = (index) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
        <p>Loading homepage products configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        backgroundColor: "hsl(var(--card-hsl))",
        padding: "1.25rem 1.5rem",
        borderRadius: "var(--radius-lg, 12px)",
        border: "1px solid hsl(var(--border-hsl))"
      }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={20} style={{ color: "#F59E0B" }} /> Homepage Featured Products
          </h2>
          <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", margin: "0.25rem 0 0" }}>
            Configure the 6–8 spotlight products displayed in the &quot;Featured Products &amp; Best Sellers&quot; grid on the homepage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleAddItem}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", padding: "0.5rem 0.9rem" }}
          >
            <Plus size={16} /> Add Product Card
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 1.25rem", fontWeight: 700 }}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Homepage Products"}
          </button>
        </div>
      </div>

      {statusMsg.text && (
        <div style={{
          padding: "0.85rem 1.25rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontWeight: 600,
          fontSize: "0.9rem",
          backgroundColor: statusMsg.type === "success" ? "#D1FAE5" : "#FEE2E2",
          color: statusMsg.type === "success" ? "#065F46" : "#991B1B",
          border: `1px solid ${statusMsg.type === "success" ? "#A7F3D0" : "#FCA5A5"}`
        }}>
          {statusMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMsg.text}
        </div>
      )}

      {/* Grid of Product Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            style={{
              backgroundColor: "hsl(var(--card-hsl))",
              border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "10px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            {/* Card Header Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{
                  backgroundColor: "hsl(var(--secondary-hsl))",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px"
                }}>
                  #{idx + 1}
                </span>

                <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                  {item.name}
                </span>

                {item.badge && (
                  <span style={{
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    textTransform: "uppercase"
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.5rem", opacity: idx === 0 ? 0.4 : 1 }}
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.5rem", opacity: idx === items.length - 1 ? 0.4 : 1 }}
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.5rem", color: "#EF4444", borderColor: "#FCA5A5" }}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              {/* Quick Select from existing catalog */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Sync from Catalog Product</label>
                <select
                  className="input"
                  value={availableProducts.some(p => p.id === item.id) ? item.id : ""}
                  onChange={(e) => handleSelectProduct(idx, e.target.value)}
                  style={{ fontSize: "0.85rem", padding: "0.45rem" }}
                >
                  <option value="">-- Choose Existing Product --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.isApparel ? "Apparel" : "Print"}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Title */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Display Title</label>
                <input
                  type="text"
                  className="input"
                  value={item.name}
                  onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
                  placeholder="e.g. Standard Business Cards"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* Category Label */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Category Subtitle</label>
                <input
                  type="text"
                  className="input"
                  value={item.category || ""}
                  onChange={(e) => handleFieldChange(idx, "category", e.target.value)}
                  placeholder="e.g. Business Cards"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* Badge */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Card Badge</label>
                <input
                  type="text"
                  className="input"
                  value={item.badge || ""}
                  onChange={(e) => handleFieldChange(idx, "badge", e.target.value)}
                  placeholder="e.g. Best Seller"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* Price text */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Starting Price (or auto)</label>
                <input
                  type="text"
                  className="input"
                  value={item.price || ""}
                  onChange={(e) => handleFieldChange(idx, "price", e.target.value)}
                  placeholder="e.g. $14.99 or leave blank"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* Product link URL */}
              <div>
                <label className="label" style={{ fontSize: "0.78rem" }}>Destination URL</label>
                <input
                  type="text"
                  className="input"
                  value={item.href || ""}
                  onChange={(e) => handleFieldChange(idx, "href", e.target.value)}
                  placeholder="e.g. /products/123 or /apparel/456"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* Image URL */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label" style={{ fontSize: "0.78rem" }}>Product Image URL</label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="text"
                    className="input"
                    value={item.image || ""}
                    onChange={(e) => handleFieldChange(idx, "image", e.target.value)}
                    placeholder="https://..."
                    style={{ fontSize: "0.85rem", flex: 1 }}
                  />
                  {item.image && (
                    <img
                      src={item.image}
                      alt="Thumbnail"
                      style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "4px", border: "1px solid hsl(var(--border-hsl))", backgroundColor: "white" }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

