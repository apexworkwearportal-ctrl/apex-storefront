"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { AlertCircle, Eye, EyeOff, Search, Edit3, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAttention, setFilterAttention] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("sinalite.name", "asc"));
        const snapshot = await getDocs(q);
        const list = [];
        const cats = new Set();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          list.push({ id: doc.id, ...data });
          if (data.sinalite?.category) {
            cats.add(data.sinalite.category);
          }
        });
        
        setProducts(list);
        setCategories(Array.from(cats));
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleToggleVisibility = async (productId, currentVisibility) => {
    try {
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, { isVisible: !currentVisibility });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isVisible: !currentVisibility } : p));
    } catch (err) {
      console.error("Failed to update visibility:", err);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const nameMatch = p.sinalite?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      p.sinalite?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.id.includes(searchQuery);
    const attentionMatch = !filterAttention || p.needsAttention;
    const catMatch = filterCategory === "all" || p.sinalite?.category === filterCategory;
    return nameMatch && attentionMatch && catMatch;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Product Catalog</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Manage synced items, configure descriptions, and edit visibility toggles.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <input
            className="input"
            placeholder="Search by name, SKU, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.5rem" }}
          />
          <Search size={18} style={{
            position: "absolute",
            left: "0.85rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "hsl(var(--foreground-hsl) / 0.4)"
          }} />
        </div>

        {/* Category select */}
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Needs Attention Filter Toggle */}
        <button
          onClick={() => setFilterAttention(!filterAttention)}
          className={`btn ${filterAttention ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
        >
          <AlertCircle size={16} /> Needs Attention
        </button>
      </div>

      {/* Main product table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          Loading products catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          No products match your filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Product</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Category</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Starting Price</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Visibility</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} style={{ borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                  {/* Name and SKU */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <p style={{ fontWeight: 600 }}>{product.sinalite?.name}</p>
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                      SKU: {product.sinalite?.sku} • ID: {product.id}
                    </p>
                  </td>
                  {/* Category */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <span style={{
                      display: "inline-block",
                      backgroundColor: "hsl(var(--secondary-hsl))",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px"
                    }}>
                      {product.sinalite?.category}
                    </span>
                  </td>
                  {/* Starting Price */}
                  <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
                    ${parseFloat(product.pricing?.startingPrice || 0).toFixed(2)} CAD
                  </td>
                  {/* Status Badges */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    {product.needsAttention ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--destructive-hsl))",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "hsl(var(--destructive-hsl) / 0.1)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px"
                      }}>
                        <AlertCircle size={12} /> Needs Info
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--success-hsl))",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "hsl(var(--success-hsl) / 0.1)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px"
                      }}>
                        <CheckCircle2 size={12} /> Synced
                      </span>
                    )}
                  </td>
                  {/* Visibility Toggle */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <button
                      onClick={() => handleToggleVisibility(product.id, product.isVisible)}
                      className="btn"
                      style={{
                        padding: "0.4rem 0.75rem",
                        fontSize: "0.8rem",
                        backgroundColor: product.isVisible ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--secondary-hsl))",
                        color: product.isVisible ? "hsl(var(--success-hsl))" : "hsl(var(--muted-hsl))",
                        border: "1px solid transparent"
                      }}
                    >
                      {product.isVisible ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Eye size={14} /> Visible</span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><EyeOff size={14} /> Hidden</span>
                      )}
                    </button>
                  </td>
                  {/* Action */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="btn btn-outline"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      <Edit3 size={14} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
