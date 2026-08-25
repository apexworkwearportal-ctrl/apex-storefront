"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { AlertCircle, Eye, EyeOff, Search, Edit3, CheckCircle2, Download, Upload, Plus } from "lucide-react";
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
        // Fetch categories first
        const catSnapshot = await getDocs(collection(db, "categories"));
        const catList = [];
        catSnapshot.forEach(d => {
          catList.push({ id: d.id, ...d.data() });
        });
        setCategories(catList);

        // Fetch products without orderBy to prevent Firestore from omitting custom products
        const snapshot = await getDocs(collection(db, "products"));
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort client-side by name
        list.sort((a, b) => {
          const nameA = a.name || a.sinalite?.name || "";
          const nameB = b.name || b.sinalite?.name || "";
          return nameA.localeCompare(nameB);
        });
        
        setProducts(list);
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
    const nameLower = (p.name || p.sinalite?.name || "").toLowerCase();
    const skuLower = (p.sku || p.sinalite?.sku || "").toLowerCase();
    const nameMatch = nameLower.includes(searchQuery.toLowerCase()) || 
                      skuLower.includes(searchQuery.toLowerCase()) ||
                      p.id.includes(searchQuery);
                      
    const attentionMatch = !filterAttention || p.needsAttention;
    
    // Resolve category name/id to match selector
    const catVal = p.categoryOverride || p.categoryId || p.sinalite?.category || "";
    const catMatch = filterCategory === "all" || 
                     catVal.toLowerCase().trim() === filterCategory.toLowerCase().trim() ||
                     (categories.find(c => c.id === filterCategory)?.name || "").toLowerCase().trim() === catVal.toLowerCase().trim();
                     
    return nameMatch && attentionMatch && catMatch;
  });

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(products, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `apex-products-export-${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export products: " + err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          alert("Invalid file format. The file must contain a JSON array of products.");
          return;
        }

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const item of importedData) {
          if (!item.id) {
            failCount++;
            continue;
          }

          try {
            const productRef = doc(db, "products", item.id);
            const updatePayload = {};
            
            if (item.isVisible !== undefined) updatePayload.isVisible = Boolean(item.isVisible);
            if (item.needsAttention !== undefined) updatePayload.needsAttention = Boolean(item.needsAttention);
            if (item.customDescription !== undefined) updatePayload.customDescription = item.customDescription;
            if (item.heroImage !== undefined) updatePayload.heroImage = item.heroImage;
            if (item.fileRequired !== undefined) updatePayload.fileRequired = Boolean(item.fileRequired);
            
            if (item.sinalite) {
              updatePayload.sinalite = {
                ...item.sinalite
              };
            }
            if (item.pricing) {
              updatePayload.pricing = {
                ...item.pricing
              };
            }

            await updateDoc(productRef, updatePayload);
            successCount++;
          } catch (itemErr) {
            console.error(`Failed to update product ${item.id}:`, itemErr);
            failCount++;
          }
        }

        alert(`Import completed!\nSuccessfully updated: ${successCount} products.\nFailed: ${failCount} products.`);
        window.location.reload();
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to parse JSON file: " + err.message);
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Product Catalog</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Manage synced items, configure descriptions, and edit visibility toggles.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/admin/products/new" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Add Custom Product
          </Link>
          <button onClick={handleExport} className="btn btn-outline" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={16} /> Export Catalog
          </button>
          <label className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Upload size={16} /> Import Catalog
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>
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
            <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                    <p style={{ fontWeight: 600 }}>{product.name || product.sinalite?.name}</p>
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                      SKU: {product.sku || product.sinalite?.sku} • ID: {product.id}
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
                      {categories.find(c => c.id === product.categoryId)?.name || product.categoryOverride || product.sinalite?.category || product.categoryId}
                    </span>
                  </td>
                  {/* Starting Price */}
                  <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
                    ${parseFloat(product.pricing?.startingPriceOverride || product.pricing?.startingPrice || 0).toFixed(2)} CAD
                  </td>
                  {/* Status Badges */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    {product.isCustom ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--primary-hsl))",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "hsl(var(--primary-hsl) / 0.1)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px"
                      }}>
                        Custom Product
                      </span>
                    ) : product.needsAttention ? (
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
