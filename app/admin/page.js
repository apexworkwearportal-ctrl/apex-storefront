"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { 
  ShoppingBag, 
  Layers, 
  RefreshCw, 
  ArrowRight, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  FileText, 
  Package, 
  Sparkles 
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    printProducts: 0,
    customProducts: 0,
    visibleProducts: 0,
    hiddenProducts: 0,
    needsAttention: 0,
    totalCategories: 0,
    parentCategories: 0,
    subCategories: 0,
    leafCategories: 0,
    totalOrders: 0
  });

  const [attentionList, setAttentionList] = useState([]);

  useEffect(() => {
    const loadDashboardStats = async () => {
      setLoading(true);
      try {
        // Load categories
        const catSnap = await getDocs(collection(db, "categories"));
        let parents = 0;
        let subs = 0;
        let leafs = 0;

        const catMap = {};
        catSnap.forEach(d => {
          catMap[d.id] = d.data();
        });

        Object.keys(catMap).forEach(id => {
          const cat = catMap[id];
          if (!cat.parentId) {
            parents++;
          } else {
            const p = catMap[cat.parentId];
            if (!p || !p.parentId) {
              subs++;
            } else {
              leafs++;
            }
          }
        });

        // Load products
        const prodSnap = await getDocs(collection(db, "products"));
        let totalProd = 0;
        let printProd = 0;
        let customProd = 0;
        let visibleProd = 0;
        let hiddenProd = 0;
        let attentionProd = 0;
        const attentionItems = [];

        prodSnap.forEach(d => {
          const data = d.data();
          totalProd++;
          if (data.isCustom) {
            customProd++;
          } else {
            printProd++;
          }

          if (data.isVisible) {
            visibleProd++;
          } else {
            hiddenProd++;
          }

          if (data.needsAttention) {
            attentionProd++;
            if (attentionItems.length < 5) {
              attentionItems.push({ id: d.id, ...data });
            }
          }
        });

        // Load orders
        const ordersSnap = await getDocs(collection(db, "orders"));
        const totalOrd = ordersSnap.size;

        setStats({
          totalProducts: totalProd,
          printProducts: printProd,
          customProducts: customProd,
          visibleProducts: visibleProd,
          hiddenProducts: hiddenProd,
          needsAttention: attentionProd,
          totalCategories: catSnap.size,
          parentCategories: parents,
          subCategories: subs,
          leafCategories: leafs,
          totalOrders: totalOrd
        });

        setAttentionList(attentionItems);
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "hsl(var(--muted-hsl))" }}>
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Welcome Header */}
      <div>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
          Administrative Console
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em", margin: 0 }}>
          Apex Workwear Dashboard
        </h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", fontWeight: 500, marginTop: "0.25rem" }}>
          Real-time summary statistics, database counts, catalog sync metrics, and shortcut operations.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        {/* Products KPI */}
        <div className="card card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Products
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--accent-hsl) / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--accent-hsl))" }}>
              <Package size={16} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 900, margin: 0, lineHeight: 1 }}>{stats.totalProducts}</h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 650 }}>
              <span style={{ color: "hsl(var(--primary-hsl))" }}>{stats.printProducts} Print</span>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>•</span>
              <span style={{ color: "hsl(var(--accent-hsl))" }}>{stats.customProducts} Custom</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
            <span>Visible: {stats.visibleProducts}</span>
            <span>Hidden: {stats.hiddenProducts}</span>
          </div>
        </div>

        {/* Categories KPI */}
        <div className="card card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Categories Taxonomy
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl) / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--primary-hsl))" }}>
              <Layers size={16} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 900, margin: 0, lineHeight: 1 }}>{stats.totalCategories}</h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 650 }}>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>{stats.parentCategories} L1</span>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>•</span>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>{stats.subCategories} L2</span>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>•</span>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>{stats.leafCategories} L3</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
            <span>Database Taxonomy Restructured</span>
          </div>
        </div>

        {/* Sync Status KPI */}
        <div className="card card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Catalog Sync Status
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--success-hsl) / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--success-hsl))" }}>
              <RefreshCw size={16} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 900, margin: 0, lineHeight: 1 }}>
              {stats.totalProducts > 0 ? Math.round(((stats.totalProducts - stats.needsAttention) / stats.totalProducts) * 100) : 100}%
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 650 }}>
              <span style={{ color: "hsl(var(--success-hsl))" }}>SinaLite Online</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
            <span style={{ color: stats.needsAttention > 0 ? "hsl(var(--destructive-hsl))" : "inherit", fontWeight: stats.needsAttention > 0 ? 700 : "normal" }}>
              {stats.needsAttention} products need attention
            </span>
          </div>
        </div>

        {/* Orders KPI */}
        <div className="card card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid hsl(var(--border-hsl))", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Storefront Orders
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "hsl(var(--primary-hsl) / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--primary-hsl))" }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 900, margin: 0, lineHeight: 1 }}>{stats.totalOrders}</h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem", fontWeight: 650 }}>
              <span style={{ color: "hsl(var(--muted-hsl))" }}>Connected with Stripe</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
            <span>Active Checkout Sessions</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Shortcuts & Attention List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2.5rem" }} className="catalog-grid">
        
        {/* Shortcuts Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--muted-hsl))", letterSpacing: "0.05em", margin: 0 }}>
            Operational Shortcuts
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
            {/* Catalog Syncer shortcut */}
            <Link href="/admin/sync" className="card card-hover" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>SinaLite Sync Operations</p>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Trigger background catalog updates from supplier API.</p>
              </div>
              <ArrowRight size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
            </Link>

            {/* Category manager shortcut */}
            <Link href="/admin/categories" className="card card-hover" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>Category Taxonomy Editor</p>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Edit hierarchy trees, hero images, descriptions, and FAQs.</p>
              </div>
              <ArrowRight size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
            </Link>

            {/* Custom apparel product creator shortcut */}
            <Link href="/admin/products/new" className="card card-hover" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>Add New Custom Apparel</p>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Upload custom hat, shirt, or jacket items to Firestore database.</p>
              </div>
              <ArrowRight size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
            </Link>

            {/* Order dashboard shortcut */}
            <Link href="/admin/orders" className="card card-hover" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>Customer Order Manager</p>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Track checkouts, shipping labels, and payment completions.</p>
              </div>
              <ArrowRight size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
            </Link>

            {/* Browse catalog list shortcut */}
            <Link href="/admin/products" className="card card-hover" style={{ textDecoration: "none", color: "inherit", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>Browse Full Products List</p>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Configure tags, toggle visibility, and edit specific custom details.</p>
              </div>
              <ArrowRight size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
            </Link>
          </div>
        </div>

        {/* Attention Items Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--muted-hsl))", letterSpacing: "0.05em", margin: 0 }}>
            Attention Required ({stats.needsAttention} Items)
          </h3>

          <div className="card" style={{ padding: 0, border: "1px solid hsl(var(--border-hsl))", overflow: "hidden" }}>
            {attentionList.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>
                <CheckCircle2 size={36} style={{ color: "hsl(var(--success-hsl))", marginBottom: "0.5rem", display: "inline-block" }} />
                <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>All items synced and complete!</p>
              </div>
            ) : (
              <div>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>PRODUCT DETAILS</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>ACTION</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {attentionList.map(item => (
                    <div key={item.id} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid hsl(var(--border-hsl))", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name || item.sinalite?.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.1rem" }}>
                          SKU: {item.sku || item.sinalite?.sku} • {item.sinalite?.category || "Unknown Category"}
                        </p>
                      </div>
                      <Link 
                        href={`/admin/products/${item.id}`} 
                        className="btn btn-outline" 
                        style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", whiteSpace: "nowrap" }}
                      >
                        Add Info <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "1rem", textAlign: "center", backgroundColor: "hsl(var(--secondary-hsl) / 0.05)" }}>
                  <Link href="/admin/products?attention=true" style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--accent-hsl))", textDecoration: "none" }}>
                    View all items requiring info ({stats.needsAttention}) →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
